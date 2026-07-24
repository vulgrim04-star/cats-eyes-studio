import { generateICS } from '../src/utils/ical.js';
import { hasSupabaseAdminConfig, getSupabaseAdmin } from './_lib/supabaseAdmin.js';

const STORE_KEYS = ['ces-settings', 'ces-appointments', 'ces-clients', 'ces-services'];

// Flux d'abonnement calendrier (Google Calendar / Apple Calendar) en lecture seule.
// Le jeton (calendarToken) est généré côté client et stocké dans le blob de
// paramètres de la salonnière ; il fait office de secret d'accès à ce flux.
export default async function handler(req, res) {
  const ownerId = req.query.u;
  const token = req.query.t;

  if (!ownerId || !token) {
    res.status(400).send('Lien invalide.');
    return;
  }

  if (!hasSupabaseAdminConfig()) {
    res.status(500).send('Configuration serveur manquante.');
    return;
  }

  try {
    const supabase = getSupabaseAdmin();
    const { data: rows, error } = await supabase
      .from('app_state')
      .select('store_key, data')
      .eq('user_id', ownerId)
      .in('store_key', STORE_KEYS);

    if (error) {
      res.status(500).send('Erreur serveur.');
      return;
    }

    const byKey = Object.fromEntries((rows ?? []).map((r) => [r.store_key, r.data?.state]));
    const settingsState = byKey['ces-settings'];

    if (!settingsState || settingsState.calendarToken !== token) {
      res.status(403).send('Lien invalide ou expiré.');
      return;
    }

    const clients = byKey['ces-clients']?.clients ?? [];
    const services = byKey['ces-services']?.services ?? [];
    const appointments = byKey['ces-appointments']?.appointments ?? [];

    const enriched = appointments
      .filter((apt) => apt.status !== 'cancelled')
      .map((apt) => ({
        ...apt,
        client: clients.find((c) => c.id === apt.clientId),
        service: services.find((s) => s.id === apt.serviceId),
      }));

    const ics = generateICS(enriched, settingsState.salon?.name);

    res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
    res.setHeader('Content-Disposition', 'inline; filename="rendez-vous.ics"');
    res.setHeader('Cache-Control', 'public, max-age=900');
    res.status(200).send(ics);
  } catch {
    res.status(500).send('Erreur serveur.');
  }
}
