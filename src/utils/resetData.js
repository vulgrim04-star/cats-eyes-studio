import { supabase } from '../lib/supabaseClient';
import { flushPendingWrites } from './supabaseSyncStorage';
import { useClientsStore } from '../store/useClientsStore';
import { useAppointmentsStore } from '../store/useAppointmentsStore';
import { useServicesStore, DEFAULT_PROMO_CODES } from '../store/useServicesStore';
import { useProductsStore } from '../store/useProductsStore';
import { useExpensesStore } from '../store/useExpensesStore';
import { useWaitlistStore } from '../store/useWaitlistStore';
import { useAuthStore } from '../store/useAuthStore';

/** Remet un compte existant dans le même état qu'un compte tout juste créé : plus
 * aucune cliente, rendez-vous, prestation, produit, dépense ou demande de réservation
 * en attente. Les paramètres du salon (nom, horaires, apparence) et le compte de
 * connexion restent intacts — seules les données métier sont effacées. */
export async function resetAllData() {
  useClientsStore.setState({ clients: [] });
  useAppointmentsStore.setState({ appointments: [] });
  useServicesStore.setState({ services: [], promoCodes: DEFAULT_PROMO_CODES });
  useProductsStore.setState({ products: [], movements: [] });
  useExpensesStore.setState({ expenses: [] });
  useWaitlistStore.setState({ entries: [] });

  const ownerId = useAuthStore.getState().session?.user?.id;
  if (ownerId) {
    await supabase.from('booking_requests').delete().eq('owner_id', ownerId);
  }

  await flushPendingWrites();
}
