import webpush from 'web-push';
import { hasSupabaseAdminConfig, getSupabaseAdmin } from './_lib/supabaseAdmin.js';

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
    <p>Connectez-vous à Cat's Eyes Studio pour confirmer ou refuser cette demande.</p>
  `;

  const resendRes = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: `${salon?.name || "Cat's Eyes Studio"} <onboarding@resend.dev>`, to: [salon.email], subject, html }),
  });

  if (!resendRes.ok) {
    console.error('[api/notify-booking] Resend error', resendRes.status, await resendRes.text());
    return { sent: false, reason: 'resend-error' };
  }
  return { sent: true };
}

async function sendPush(supabase, ownerId, clientName, { serviceName, date, time }) {
  if (!process.env.VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) {
    return { sent: false, reason: 'missing-vapid-keys' };
  }

  const { data: subs, error } = await supabase.from('push_subscriptions').select('*').eq('user_id', ownerId);
  if (error || !subs?.length) return { sent: false, reason: error ? 'query-error' : 'no-subscription' };

  webpush.setVapidDetails(process.env.VAPID_SUBJECT || 'mailto:support@catseyesstudio.fr', process.env.VAPID_PUBLIC_KEY, process.env.VAPID_PRIVATE_KEY);

  const payload = JSON.stringify({
    title: 'Nouvelle réservation en ligne',
    body: `${clientName} — ${serviceName || 'Prestation'} le ${date} à ${time}`,
    url: '/agenda',
  });

  let sent = 0;
  await Promise.all(
    subs.map(async (sub) => {
      try {
        await webpush.sendNotification({ endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } }, payload);
        sent += 1;
      } catch (err) {
        // 404/410 = abonnement expiré/révoqué côté navigateur : on le supprime pour ne
        // plus tenter de lui envoyer quoi que ce soit.
        if (err.statusCode === 404 || err.statusCode === 410) {
          await supabase.from('push_subscriptions').delete().eq('id', sub.id);
        } else {
          console.error('[api/notify-booking] push send error', err.statusCode, err.body);
        }
      }
    })
  );
  return { sent: sent > 0, count: sent };
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
