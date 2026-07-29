import { create } from 'zustand';
import { supabase } from '../lib/supabaseClient';

/** Demandes de réservation en attente, partagées par leurs trois consommateurs :
 *  l'alerte montée dans Layout, la cloche de la barre du haut, et la carte du tableau
 *  de bord. Une seule requête les sert tous — sans quoi chacun sonderait la base de son
 *  côté, et la cloche pourrait afficher autre chose que la carte juste en dessous.
 *
 *  Volontairement non persistant : ces lignes vivent dans Supabase, les recharger au
 *  démarrage vaut mieux que réafficher un état périmé. */
export const useBookingRequestsStore = create((set, get) => ({
  requests: [],
  loading: true,
  error: null,
  inFlight: false,

  /** Relit les demandes en attente. Renvoie la liste lue (ou celle déjà connue en cas
   *  d'échec réseau) pour que l'appelant puisse en déduire les nouveautés. */
  refresh: async (ownerId) => {
    if (!ownerId) return get().requests;
    // Le sondage, l'abonnement temps réel et un montage de page peuvent tomber en même
    // temps : inutile d'empiler trois fois la même requête.
    if (get().inFlight) return get().requests;

    set({ inFlight: true });
    const { data, error } = await supabase
      .from('booking_requests')
      .select('*')
      .eq('owner_id', ownerId)
      .eq('status', 'pending')
      .order('created_at', { ascending: true });

    if (error) {
      console.error('[bookingRequests] lecture en échec', error);
      set({ inFlight: false, loading: false, error });
      return get().requests;
    }

    const requests = data ?? [];
    set({ inFlight: false, loading: false, error: null, requests });
    return requests;
  },

  /** Retire une demande traitée sans attendre la relecture, pour que la carte et la
   *  cloche se vident au moment du clic. */
  remove: (id) => set((state) => ({ requests: state.requests.filter((r) => r.id !== id) })),

  reset: () => set({ requests: [], loading: true, error: null, inFlight: false }),
}));
