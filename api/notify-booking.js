import { hasSupabaseAdminConfig, getSupabaseAdmin } from './_lib/supabaseAdmin.js';
import { resendFrom, isTestSender } from './_lib/email.js';
import { sendPushToUser } from './_lib/push.js';

function escapeHtml(str) {
  return String(str ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

async function sendEmail(salon, clientName, { phone, serviceName, date, time }) {
  if (!process.env.RESEND_API_KEY) return { sent: false, reason: 'missing-resend-key' };

  const subject = `Nouvelle réservation en ligne — ${clientName}`;
  const html = `
    <p>Bonjour${salon.managerName ? ' ' + escapeHtml(salon.managerName) : ''},</p>
    <p><strong>${escapeHtml(clientName)}</strong> vient de demander un rendez-vous via votre lien de réservation en ligne :</p>
    <ul>
      <li><strong>Prestation :</strong> ${escapeHtml(serviceName) || '—'}</li>
      <li><strong>Date :</strong> ${escapeHtml(date) || '—'} à ${escapeHtml(time) || '—'}</li>
      ${phone ? `<li><strong>Téléphone :</strong> ${escapeHtml(phone)}</li>` : ''}
    </ul>
    <p>Connectez-vous à Cat's Eyes Manager pour confirmer ou refuser cette demande.</p>
  `;

  const resendRes = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: resendFrom(salon?.name), to: [salon.email], subject, html }),
  });

  if (!resendRes.ok) {
    console.error('[api/notify-booking] Resend error', resendRes.status, await resendRes.text());
    // Sans domaine vérifié, Resend n'accepte que l'adresse du titulaire du compte : la
    // notification ne part que si l'e-mail du salon est exactement celui du compte Resend.
    if (resendRes.status === 403 && isTestSender()) {
      console.error(
        `[api/notify-booking] aucun domaine vérifié : Resend refuse d'écrire à ${salon.email}. ` +
          'Vérifiez un domaine dans Resend puis définissez RESEND_FROM.'
      );
      return { sent: false, reason: 'unverified-sender-domain' };
    }
    return { sent: false, reason: 'resend-error' };
  }
  return { sent: true };
}

function sendPush(supabase, ownerId, clientName, { serviceName, date, time }) {
  return sendPushToUser(supabase, ownerId, {
    title: 'Nouvelle réservation en ligne',
    body: `${clientName} — ${serviceName || 'Prestation'} le ${date} à ${time}`,
    // Le tableau de bord, pas l'agenda : une demande en attente n'entre dans l'agenda
    // qu'une fois validée. La notification menait donc à une page où elle n'apparaissait
    // pas, et il fallait la chercher soi-même (voir BookingRequestsCard, sur « / »).
    url: '/',
  });
}

// Notifie le salon (e-mail + notification push) dès qu'une cliente réserve via le lien
// public, selon les préférences activées dans Paramètres. Best-effort : ne doit jamais
// faire échouer la réservation elle-même (voir publicBooking.js, appel fire-and-forget).
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).send('Méthode non autorisée.');
    return;
  }

  const { ownerId, firstName, lastName, phone, serviceName, date, time } = req.body ?? {};
  if (!ownerId || typeof ownerId !== 'string') {
    res.status(400).send('Requête invalide.');
    return;
  }

  if (!hasSupabaseAdminConfig()) {
    res.status(500).send('Configuration serveur manquante.');
    return;
  }

  try {
    const supabase = getSupabaseAdmin();
    const { data: row, error } = await supabase
      .from('app_state')
      .select('data')
      .eq('user_id', ownerId)
      .eq('store_key', 'ces-settings')
      .maybeSingle();

    if (error) {
      res.status(500).send('Erreur serveur.');
      return;
    }

    const settingsState = row?.data?.state;
    const salon = settingsState?.salon;
    const clientName = `${firstName ?? ''} ${lastName ?? ''}`.trim() || 'Une cliente';
    const details = { phone, serviceName, date, time };

    const [email, push] = await Promise.all([
      settingsState?.notifications?.newBookingEmail === true && salon?.email
        ? sendEmail(salon, clientName, details)
        : Promise.resolve({ sent: false }),
      settingsState?.notifications?.newBookingAlert === true
        ? sendPush(supabase, ownerId, clientName, details)
        : Promise.resolve({ sent: false }),
    ]);

    res.status(200).json({ email, push });
  } catch (err) {
    console.error('[api/notify-booking] unexpected error', err);
    res.status(500).send('Erreur serveur.');
  }
}
