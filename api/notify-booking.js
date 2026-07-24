import { createClient } from '@supabase/supabase-js';

function escapeHtml(str) {
  return String(str ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

// Notifie le salon par e-mail (via Resend) dès qu'une cliente réserve via le lien public,
// si la salonnière a activé cette préférence dans Paramètres. Best-effort : ne doit jamais
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

  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    res.status(500).send('Configuration serveur manquante.');
    return;
  }

  try {
    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
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
    const emailEnabled = settingsState?.notifications?.newBookingEmail === true;

    if (!emailEnabled || !salon?.email) {
      // Rien à faire : préférence désactivée ou pas d'e-mail de salon configuré.
      res.status(200).json({ sent: false });
      return;
    }

    if (!process.env.RESEND_API_KEY) {
      // Toggle activé mais clé API pas encore configurée côté Vercel : on ne bloque pas
      // la réservation, on renvoie juste un statut informatif.
      res.status(200).json({ sent: false, reason: 'missing-resend-key' });
      return;
    }

    const clientName = `${firstName ?? ''} ${lastName ?? ''}`.trim() || 'Une cliente';
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
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: `${salon?.name || "Cat's Eyes Studio"} <onboarding@resend.dev>`,
        to: [salon.email],
        subject,
        html,
      }),
    });

    if (!resendRes.ok) {
      const detail = await resendRes.text();
      console.error('[api/notify-booking] Resend error', resendRes.status, detail);
      res.status(200).json({ sent: false, reason: 'resend-error' });
      return;
    }

    res.status(200).json({ sent: true });
  } catch (err) {
    console.error('[api/notify-booking] unexpected error', err);
    res.status(500).send('Erreur serveur.');
  }
}
