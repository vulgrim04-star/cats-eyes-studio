import { useCallback, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAuthStore } from '../store/useAuthStore';
import { useUIStore } from '../store/useUIStore';
import { useSettingsStore } from '../store/useSettingsStore';
import { useBookingRequestsStore } from '../store/useBookingRequestsStore';
import { usePollWhileVisible } from './usePollWhileVisible';
import { alertText, emptyWatermark, selectNewRequests } from '../utils/bookingAlerts';
import { subscribeToPush } from '../utils/push';

/** Intervalle du sondage de repli. Une minute : assez court pour qu'une demande ne
 *  dorme pas pendant qu'on travaille sur une cliente, assez long pour rester
 *  imperceptible sur un forfait mobile (une requête sur une table de quelques lignes). */
const POLL_MS = 60000;

const storageKey = (ownerId) => `ces-booking-alerts:${ownerId}`;

/** La date-repère survit au rechargement : sans elle, rouvrir l'app rejouerait l'alerte
 *  de toutes les demandes encore en attente. Le stockage peut être indisponible (mode
 *  privé, quota) — on retombe alors sur une mémoire de session, jamais sur une erreur. */
function loadWatermark(ownerId) {
  try {
    const raw = window.localStorage.getItem(storageKey(ownerId));
    if (!raw) return emptyWatermark();
    const parsed = JSON.parse(raw);
    return {
      primed: parsed?.primed === true,
      since: typeof parsed?.since === 'string' ? parsed.since : null,
      alerted: Array.isArray(parsed?.alerted) ? parsed.alerted : [],
    };
  } catch {
    return emptyWatermark();
  }
}

function saveWatermark(ownerId, watermark) {
  try {
    window.localStorage.setItem(storageKey(ownerId), JSON.stringify(watermark));
  } catch {
    // Sans persistance, l'alerte fonctionne toujours pendant la session ouverte.
  }
}

/** Alerte la salonnière dès qu'une nouvelle demande de réservation arrive, où qu'elle
 * soit dans l'app. Monté une seule fois dans Layout, il couvre toutes les pages
 * authentifiées et alimente aussi la cloche et le tableau de bord.
 *
 * Trois chemins, du plus rapide au plus fiable, parce qu'aucun n'est sûr à lui seul :
 *  1. l'abonnement temps réel Supabase — instantané, mais muet si la table n'est pas
 *     publiée dans `supabase_realtime` (voir supabase/schema.sql) ;
 *  2. le sondage au premier plan — toujours vrai, app ouverte ;
 *  3. la notification push serveur — le seul qui atteigne un téléphone verrouillé
 *     (voir api/notify-booking.js).
 * Les trois convergent vers `ingest`, qui garantit une seule alerte par demande.
 *
 * Désactivable dans Paramètres (notifications.newBookingAlert).
 */
export function useBookingNotifications() {
  const ownerId = useAuthStore((s) => s.session?.user?.id);
  const alertEnabled = useSettingsStore((s) => s.notifications.newBookingAlert);
  const refresh = useBookingRequestsStore((s) => s.refresh);
  const watermark = useRef(emptyWatermark());

  // Le toast et la Notification() ci-dessous n'existent que si l'app est ouverte —
  // inutiles sur téléphone verrouillé. On (ré)abonne donc aussi cet appareil au push
  // serveur à chaque montage, tant que la permission est déjà accordée : idempotent, ne
  // redemande rien, et rattrape un abonnement expiré ou révoqué par le navigateur.
  useEffect(() => {
    if (!ownerId || !alertEnabled) return;
    if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return;
    subscribeToPush(ownerId);
  }, [ownerId, alertEnabled]);

  // À la déconnexion, la liste partagée doit repartir de zéro : la cloche de la session
  // suivante ne doit rien montrer du salon précédent.
  useEffect(() => {
    watermark.current = ownerId ? loadWatermark(ownerId) : emptyWatermark();
    if (!ownerId) useBookingRequestsStore.getState().reset();
  }, [ownerId]);

  const ingest = useCallback(
    (rows) => {
      if (!ownerId) return;
      const { fresh, watermark: next } = selectNewRequests(rows, watermark.current);
      watermark.current = next;
      saveWatermark(ownerId, next);
      if (!alertEnabled || fresh.length === 0) return;

      const { title, body } = alertText(fresh);
      useUIStore.getState().showToast(`${title} — ${body}`, 'success');
      if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
        new Notification(title, { body, icon: '/icon-192.png', tag: 'booking-request' });
      }
    },
    [ownerId, alertEnabled]
  );

  const check = useCallback(async () => {
    if (!ownerId) return;
    ingest(await refresh(ownerId));
  }, [ownerId, refresh, ingest]);

  usePollWhileVisible(check, { intervalMs: POLL_MS, enabled: Boolean(ownerId) });

  // Chemin rapide : quand la table est bien publiée en temps réel, l'alerte part à
  // l'instant de la réservation au lieu d'attendre le prochain sondage. On relit la
  // liste plutôt que de se fier à la charge utile de l'événement, pour que la cloche et
  // le tableau de bord restent d'accord avec l'alerte.
  useEffect(() => {
    if (!ownerId) return undefined;
    const channel = supabase
      .channel(`booking-requests-${ownerId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'booking_requests', filter: `owner_id=eq.${ownerId}` },
        () => {
          check();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [ownerId, check]);
}
