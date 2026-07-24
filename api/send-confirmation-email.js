import { createClient } from '@supabase/supabase-js';
import { formatDateLong } from '../src/utils/date.js';

function escapeHtml(str) {
  return String(str ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

// Confirmation envoyée à la CLIENTE (pas à la salonnière) dès qu'un rendez-vous est créé,
// si "Confirmation automatique" est activé dans Paramètres. Le destinataire est toujours
// résolu côté serveur à partir de la fiche cliente enregistrée (jamais une adresse fournie
// telle quelle par l'appelant), pour ne pas transformer cet endpoint en relais d'e-mails
// vers une adresse arbitraire.
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).send('Méthode non autorisée.');
    return;
  }

  const { ownerId, clientId, serviceName, date, time } = req.body ?? {};
  if (!ownerId || typeof ownerId !== 'string' || !clientId || typeof clientId !== 'string') {
    res.status(400).send('Requête invalide.');
    return;
  }

  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    res.status(500).send('Configuration serveur manquante.');
    return;
  }

  try {
    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
    const { data: rows, error } = await supabase
      .from('app_state')
      .select('store_key, data')
      .eq('user_id', ownerId)
      .in('store_key', ['ces-settings', 'ces-clients']);

    if (error) {
      res.status(500).send('Erreur serveur.');
      return;
    }

    const byKey = Object.fromEntries((rows ?? []).map((r) => [r.store_key, r.data?.state]));
    const settingsState = byKey['ces-settings'];
    const salon = settingsState?.salon;
    const confirmEnabled = settingsState?.notifications?.autoConfirm === true;

    const client = (byKey['ces-clients']?.clients ?? []).find((c) => c.id === clientId);

    if (!confirmEnabled || !client?.email) {
      res.status(200).json({ sent: false });
      return;
    }

    if (!process.env.RESEND_API_KEY) {
      res.status(200).json({ sent: false, reason: 'missing-resend-key' });
      return;
    }

    const clientName = `${client.firstName ?? ''} ${client.lastName ?? ''}`.trim() || 'Bonjour';
    const dateLabel = date ? formatDateLong(date) : '';
    const subject = `Rendez-vous confirmé — ${salon?.name || "Cat's Eyes Studio"}`;
    const html = `
      <p>Bonjour ${escapeHtml(client.firstName || clientName)},</p>
      <p>Votre rendez-vous est confirmé :</p>
      <ul>
        <li><strong>Prestation :</strong> ${escapeHtml(serviceName) || '—'}</li>
        <li><strong>Date :</strong> ${escapeHtml(dateLabel) || escapeHtml(date) || '—'} à ${escapeHtml(time) || '—'}</li>
        ${salon?.address ? `<li><strong>Adresse :</strong> ${escapeHtml(salon.address)}</li>` : ''}
      </ul>
      ${salon?.cancellationPolicy ? `<p style="color:#888;font-size:0.9em;">${escapeHtml(salon.cancellationPolicy)}</p>` : ''}
      <p>À bientôt !<br>${escapeHtml(salon?.name || "Cat's Eyes Studio")}</p>
    `;

    const resendRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: `${salon?.name || "Cat's Eyes Studio"} <onboarding@resend.dev>`,
        to: [client.email],
        subject,
        html,
      }),
    });

    if (!resendRes.ok) {
      const detail = await resendRes.text();
      console.error('[api/send-confirmation-email] Resend error', resendRes.status, detail);
      res.status(200).json({ sent: false, reason: 'resend-error' });
      return;
    }

    res.status(200).json({ sent: true });
  } catch (err) {
    console.error('[api/send-confirmation-email] unexpected error', err);
    res.status(500).send('Erreur serveur.');
  }
}
