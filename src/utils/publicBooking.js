import { supabase } from '../lib/supabaseClient';

/** Lit la configuration publique du salon (infos + catalogue) directement dans le cloud,
 * pour un visiteur non connecté (lien de réservation public). */
export async function fetchPublicSalonConfig(ownerId) {
  const [{ data: settingsRow }, { data: servicesRow }] = await Promise.all([
    supabase.from('app_state').select('data').eq('user_id', ownerId).eq('store_key', 'ces-settings').maybeSingle(),
    supabase.from('app_state').select('data').eq('user_id', ownerId).eq('store_key', 'ces-services').maybeSingle(),
  ]);

  return {
    salon: settingsRow?.data?.state?.salon ?? null,
    services: servicesRow?.data?.state?.services ?? [],
  };
}

/** Récupère uniquement les créneaux déjà pris ce jour-là (sans aucune info sur les clientes),
 * via une fonction serveur dédiée, pour calculer les créneaux libres sans exposer les données privées. */
export async function fetchPublicAppointmentsForDate(ownerId, date) {
  const { data, error } = await supabase.rpc('public_appointments_for_date', {
    p_owner_id: ownerId,
    p_date: date,
  });
  if (error) {
    console.error('[publicBooking] fetchPublicAppointmentsForDate failed', error);
    return [];
  }
  return data ?? [];
}

/** Enregistre une demande de RDV en attente de validation par l'institut.
 * Une seule tentative de nouvel essai automatique en cas d'échec réseau/serveur
 * transitoire, pour éviter qu'une cliente perde sa réservation à cause d'un
 * simple aléa de connexion. */
export async function submitBookingRequest(ownerId, payload, attempt = 1) {
  const { error } = await supabase.from('booking_requests').insert({
    owner_id: ownerId,
    status: 'pending',
    ...payload,
  });
  if (error) {
    console.error('[publicBooking] submitBookingRequest failed', error);
    if (attempt < 2) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      return submitBookingRequest(ownerId, payload, attempt + 1);
    }
    return false;
  }
  return true;
}
