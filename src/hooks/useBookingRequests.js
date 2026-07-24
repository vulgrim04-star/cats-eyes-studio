import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAuthStore } from '../store/useAuthStore';
import { useAppointments } from './useAppointments';
import { useClients } from './useClients';
import { useToast } from './useToast';

/** Demandes de RDV en attente de validation, prises par des clientes via le lien
 * de réservation public (non connectées). */
export function useBookingRequests() {
  const ownerId = useAuthStore((s) => s.session?.user?.id);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const { clients, addClient } = useClients();
  const { addAppointment } = useAppointments();
  const { showToast } = useToast();

  const refresh = useCallback(async () => {
    if (!ownerId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('booking_requests')
      .select('*')
      .eq('owner_id', ownerId)
      .eq('status', 'pending')
      .order('created_at', { ascending: true });
    if (!error) setRequests(data ?? []);
    setLoading(false);
  }, [ownerId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

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
    setRequests((prev) => prev.filter((r) => r.id !== request.id));
    return true;
  };

  const decline = async (request) => {
    await supabase.from('booking_requests').update({ status: 'declined' }).eq('id', request.id);
    setRequests((prev) => prev.filter((r) => r.id !== request.id));
    showToast('Demande refusée', 'warning');
  };

  return { requests, loading, confirm, decline, refresh };
}
