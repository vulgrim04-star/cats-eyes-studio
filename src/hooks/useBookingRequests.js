import { useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAuthStore } from '../store/useAuthStore';
import { useBookingRequestsStore } from '../store/useBookingRequestsStore';
import { useAppointments } from './useAppointments';
import { useClients } from './useClients';
import { useToast } from './useToast';

/** Demandes de RDV en attente de validation, prises par des clientes via le lien
 * de réservation public (non connectées).
 *
 * La liste vient du magasin partagé, alimenté par useBookingNotifications (monté dans
 * Layout) : elle est donc déjà à jour à l'ouverture du tableau de bord, et reste alignée
 * sur ce que la cloche annonce. Ce hook n'ajoute que les actions de traitement. */
export function useBookingRequests() {
  const ownerId = useAuthStore((s) => s.session?.user?.id);
  const requests = useBookingRequestsStore((s) => s.requests);
  const loading = useBookingRequestsStore((s) => s.loading);
  const refreshStore = useBookingRequestsStore((s) => s.refresh);
  const removeFromStore = useBookingRequestsStore((s) => s.remove);
  const { clients, addClient } = useClients();
  const { addAppointment } = useAppointments();
  const { showToast } = useToast();

  const refresh = useCallback(() => refreshStore(ownerId), [refreshStore, ownerId]);

  const confirm = async (request) => {
    let client = clients.find((c) => c.phone.replace(/\s/g, '') === request.phone.replace(/\s/g, ''));
    if (!client) {
      client = addClient({
        firstName: request.first_name,
        lastName: request.last_name,
        phone: request.phone,
        email: request.email ?? '',
        notes: "Cliente inscrite via l'espace de réservation en ligne.",
      });
    }

    const appointment = addAppointment({
      clientId: client.id,
      serviceId: request.service_id,
      date: request.date,
      time: request.time,
      duration: request.duration,
      price: request.price,
      notes: 'Réservation en ligne',
      status: 'pending',
    });
    if (!appointment) return false;

    await supabase.from('booking_requests').update({ status: 'confirmed' }).eq('id', request.id);
    removeFromStore(request.id);
    return true;
  };

  const decline = async (request) => {
    await supabase.from('booking_requests').update({ status: 'declined' }).eq('id', request.id);
    removeFromStore(request.id);
    showToast('Demande refusée', 'warning');
  };

  return { requests, loading, confirm, decline, refresh };
}
