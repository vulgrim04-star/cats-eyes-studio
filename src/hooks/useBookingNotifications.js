import { useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAuthStore } from '../store/useAuthStore';
import { useUIStore } from '../store/useUIStore';
import { useSettingsStore } from '../store/useSettingsStore';
import { subscribeToPush } from '../utils/push';

/** Alerte en temps réel (toast + notification navigateur) dès qu'une nouvelle demande
 * de réservation arrive, où que soit l'utilisatrice dans l'app. Monté une seule fois
 * au niveau du Layout pour couvrir toutes les pages authentifiées. Désactivable dans
 * Paramètres (notifications.newBookingAlert) pour les salonnières qui ne veulent pas
 * de pop-up/notification navigateur. */
export function useBookingNotifications() {
  const ownerId = useAuthStore((s) => s.session?.user?.id);
  const alertEnabled = useSettingsStore((s) => s.notifications.newBookingAlert);

  // Le toast/Notification() ci-dessous ne fonctionne que si l'app est ouverte au
  // premier plan — inutile sur téléphone verrouillé ou app fermée. On (ré)abonne donc
  // aussi cet appareil au push serveur (voir api/notify-booking.js) à chaque montage,
  // tant que la permission navigateur est déjà accordée — idempotent, ne redemande rien.
  useEffect(() => {
    if (!ownerId || !alertEnabled) return;
    if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return;
    subscribeToPush(ownerId);
  }, [ownerId, alertEnabled]);

  useEffect(() => {
    if (!ownerId || !alertEnabled) return undefined;

    const channel = supabase
      .channel(`booking-requests-notify-${ownerId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'booking_requests', filter: `owner_id=eq.${ownerId}` },
        (payload) => {
          const r = payload.new;
          const name = `${r.first_name ?? ''} ${r.last_name ?? ''}`.trim() || 'Une cliente';
          useUIStore.getState().showToast(`Nouvelle demande de réservation de ${name}`, 'success');

          if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
            new Notification('Nouvelle demande de réservation', {
              body: `${name} — ${r.service_name ?? ''} le ${r.date} à ${r.time}`,
              icon: '/icon-192.png',
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [ownerId, alertEnabled]);
}
