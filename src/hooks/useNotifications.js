import { useEffect, useMemo, useState } from 'react';
import { useNotificationsStore } from '../store/useNotificationsStore';
import { isDemoActive } from '../utils/demoFlag';
import { useBookingRequestsStore } from '../store/useBookingRequestsStore';
import { useAppointments, enrich, getPendingAppointments } from './useAppointments';
import { useProducts, lowStockProducts } from './useProducts';
import { useClients } from './useClients';
import {
  activeNotifications,
  deriveNotifications,
  historyNotifications,
  unreadCount,
} from '../utils/notificationFeed';

/** Le magasin a-t-il fini de récupérer son état enregistré ?
 *
 *  Indispensable avant toute synchronisation : le magasin démarre vide et n'est réhydraté
 *  qu'après la connexion. Synchroniser avant, c'est déclarer « neuves » des alertes déjà
 *  lues ou supprimées — et écraser l'état réel en le repoussant vers le cloud. C'est
 *  précisément ainsi qu'une notification supprimée réapparaîtrait au redémarrage.
 *
 *  En démonstration, aucune persistance n'a lieu : il n'y a rien à attendre. */
function usePersistedStateReady() {
  const [ready, setReady] = useState(() => useNotificationsStore.persist.hasHydrated() || isDemoActive());

  useEffect(() => {
    if (ready) return undefined;
    return useNotificationsStore.persist.onFinishHydration(() => setReady(true));
  }, [ready]);

  return ready;
}

/** Tient le fil de notifications à jour à partir des données de l'app.
 *
 *  Monté UNE SEULE FOIS, dans Layout : la synchronisation écrit dans un magasin persisté,
 *  et deux montages simultanés se marcheraient dessus. Les autres écrans se contentent de
 *  lire, via `useNotifications`. */
export function useNotificationSync() {
  const ready = usePersistedStateReady();
  const { appointments } = useAppointments();
  const { products } = useProducts();
  const { clients } = useClients();
  const bookingRequests = useBookingRequestsStore((s) => s.requests);
  const sync = useNotificationsStore((s) => s.sync);

  const derived = useMemo(
    () =>
      deriveNotifications({
        bookingRequests,
        pendingAppointments: getPendingAppointments(appointments).map(enrich),
        clients,
        lowStock: lowStockProducts(products),
      }),
    [bookingRequests, appointments, clients, products]
  );

  useEffect(() => {
    if (!ready) return;
    sync(derived);
  }, [ready, derived, sync]);
}

/** Lecture du fil et actions. Utilisable partout, ne déclenche aucune synchronisation. */
export function useNotifications() {
  const items = useNotificationsStore((s) => s.items);
  const markRead = useNotificationsStore((s) => s.markRead);
  const markAllRead = useNotificationsStore((s) => s.markAllRead);
  const dismiss = useNotificationsStore((s) => s.dismiss);
  const clearHistory = useNotificationsStore((s) => s.clearHistory);

  const active = useMemo(() => activeNotifications(items), [items]);
  const history = useMemo(() => historyNotifications(items), [items]);
  const unread = useMemo(() => unreadCount(items), [items]);
  const resolved = useMemo(() => history.filter((n) => n.resolvedAt), [history]);

  return { items, active, history, resolved, unread, markRead, markAllRead, dismiss, clearHistory };
}
