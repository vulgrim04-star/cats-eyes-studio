import { formatDateLong } from '../src/utils/date.js';
import { dueReminders } from '../src/utils/reminders.js';
import { hasSupabaseAdminConfig, getSupabaseAdmin } from './_lib/supabaseAdmin.js';
import { resendFrom, isTestSender } from './_lib/email.js';
import { claimReminder, releaseReminder } from './_lib/reminderLog.js';

// Rappels automatiques aux clientes (24h et 2h avant le rendez-vous), selon les bascules de
// Paramètres → Notifications.
//
// Appelé périodiquement par un ordonnanceur externe (.github/workflows/reminders.yml), pas
// par l'application : personne n'est connecté au moment où un rappel doit partir. C'est aussi
// pourquoi il est protégé par un secret partagé plutôt que par une session.
//
// La logique de décision (« quel rappel est dû ? ») vit dans src/utils/reminders.js, en
// fonctions pures et testées. Ce fichier ne fait que du transport : lire, envoyer, journaliser.

const STORE_KEYS = ['ces-settings', 'ces-appointments', 'ces-clients', 'ces-services'];

function escapeHtml(str) {
  return String(str ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

/** Le secret attendu, comparé à celui présenté. Sans `CRON_SECRET` défini, l'endpoint refuse
 *  de tourner : il expédie des e-mails à de vraies clientes, il ne doit jamais être ouvert. */
function isAuthorized(req) {
  const expected = process.env.CRON_SECRET?.trim();
  if (!expected) return false;
  const presented = (req.headers.authorization ?? '').replace(/^Bearer\s+/i, '').trim();
  return Boolean(presented) && presented === expected;
}

function subjectAndBody({ kind, appointment, client, salon, serviceName }) {
  const whenLabel = appointment.date ? formatDateLong(appointment.date) : appointment.date;
  const lead = kind === '24h' ? 'demain' : 'dans deux heures';
  const salonName = salon?.name || 'Votre institut';

  return {
    subject: `Rappel — votre rendez-vous ${lead} chez ${salonName}`,
    html: `
      <p>Bonjour ${escapeHtml(client.firstName || '')},</p>
      <p>Petit rappel : votre rendez-vous est ${escapeHtml(lead)}.</p>
      <ul>
        <li><strong>Prestation :</strong> ${escapeHtml(serviceName) || '—'}</li>
        <li><strong>Date :</strong> ${escapeHtml(whenLabel) || '—'} à ${escapeHtml(appointment.time) || '—'}</li>
        ${salon?.address ? `<li><strong>Adresse :</strong> ${escapeHtml(salon.address)}</li>` : ''}
        ${salon?.phone ? `<li><strong>Téléphone :</strong> ${escapeHtml(salon.phone)}</li>` : ''}
      </ul>
      ${salon?.cancellationPolicy ? `<p style="color:#888;font-size:0.9em;">${escapeHtml(salon.cancellationPolicy)}</p>` : ''}
      <p>À très vite !<br>${escapeHtml(salonName)}</p>
    `,
  };
}

async function sendEmail({ to, from, subject, html }) {
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from, to: [to], subject, html }),
  });

  if (response.ok) return { sent: true };

  console.error('[api/send-reminders] Resend error', response.status, await response.text());
  // Sans domaine vérifié, Resend refuse tout destinataire autre que le titulaire du compte —
  // ce qui condamne la fonctionnalité entière, puisqu'elle écrit par définition à des
  // clientes. Le même diagnostic est affiché dans Paramètres via /api/health.
  if (response.status === 403 && isTestSender()) {
    console.error(
      "[api/send-reminders] aucun domaine vérifié : définissez RESEND_FROM sur une adresse d'un " +
        'domaine vérifié dans Resend, sinon aucune cliente ne recevra de rappel.'
    );
    return { sent: false, reason: 'unverified-sender-domain' };
  }
  return { sent: false, reason: 'resend-error' };
}

/** Traite un compte. Les erreurs d'un salon ne doivent jamais interrompre le balayage des
 *  autres : un e-mail refusé chez l'un ne doit pas priver tous les suivants de leur rappel. */
async function processAccount(supabase, userId, byKey, now, totals) {
  const settings = byKey['ces-settings'];
  const salon = settings?.salon;
  const services = byKey['ces-services']?.services ?? [];

  const reminders = dueReminders({
    appointments: byKey['ces-appointments']?.appointments ?? [],
    clients: byKey['ces-clients']?.clients ?? [],
    settings,
    now,
  });

  for (const { appointmentId, kind, appointment, client } of reminders) {
    // Réservation AVANT envoi : c'est l'insertion en base qui arbitre, pas une vérification
    // préalable, qui laisserait passer deux exécutions simultanées.
    const claimed = await claimReminder(supabase, { userId, appointmentId, kind });
    if (!claimed) {
      totals.skipped += 1;
      continue;
    }

    const serviceName = services.find((s) => s.id === appointment.serviceId)?.name ?? '';
    const { subject, html } = subjectAndBody({ kind, appointment, client, salon, serviceName });
    const result = await sendEmail({ to: client.email, from: resendFrom(salon?.name), subject, html });

    if (result.sent) {
      totals.sent += 1;
    } else {
      // L'envoi a échoué : on rend la réservation pour qu'un passage ultérieur réessaie,
      // tant que la fenêtre de rattrapage le permet.
      await releaseReminder(supabase, { userId, appointmentId, kind });
      totals.failed += 1;
    }
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST' && req.method !== 'GET') {
    res.status(405).json({ ok: false, reason: 'method-not-allowed' });
    return;
  }

  if (!isAuthorized(req)) {
    // Un secret absent et un secret faux se répondent pareil : distinguer les deux
    // renseignerait un appelant non autorisé sur l'état du déploiement.
    res.status(401).json({ ok: false, reason: 'unauthorized' });
    return;
  }

  if (!hasSupabaseAdminConfig()) {
    res.status(500).json({ ok: false, reason: 'server-misconfigured' });
    return;
  }

  if (!process.env.RESEND_API_KEY) {
    res.status(200).json({ ok: false, reason: 'missing-resend-key', sent: 0 });
    return;
  }

  const now = new Date();
  const totals = { accounts: 0, sent: 0, skipped: 0, failed: 0 };

  try {
    const supabase = getSupabaseAdmin();
    const { data: rows, error } = await supabase.from('app_state').select('user_id, store_key, data').in('store_key', STORE_KEYS);

    if (error) {
      console.error('[api/send-reminders] lecture de app_state en échec', error);
      res.status(500).json({ ok: false, reason: 'query-error' });
      return;
    }

    // Regroupement par compte. Une seule lecture pour tous les salons : le nombre de comptes
    // reste modeste, et multiplier les allers-retours coûterait plus que de tout charger.
    const accounts = new Map();
    for (const row of rows ?? []) {
      if (!accounts.has(row.user_id)) accounts.set(row.user_id, {});
      accounts.get(row.user_id)[row.store_key] = row.data?.state;
    }

    for (const [userId, byKey] of accounts) {
      totals.accounts += 1;
      try {
        await processAccount(supabase, userId, byKey, now, totals);
      } catch (err) {
        console.error('[api/send-reminders] compte ignoré après erreur', err);
        totals.failed += 1;
      }
    }

    res.status(200).json({ ok: true, ...totals });
  } catch (err) {
    console.error('[api/send-reminders] erreur inattendue', err);
    res.status(500).json({ ok: false, reason: 'server-error' });
  }
}
