import { supabase } from '../lib/supabaseClient';

// Convertit la clé VAPID publique (base64url) au format Uint8Array attendu par
// PushManager.subscribe — conversion standard documentée par le Push API.
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}

export function isPushSupported() {
  return 'serviceWorker' in navigator && 'PushManager' in window;
}

/** Enregistre le service worker (idempotent) puis (ré)abonne cet appareil aux
 * notifications push et enregistre l'abonnement pour cette salonnière dans Supabase.
 * Best-effort : ne doit jamais faire planter l'appelant si le navigateur ne supporte
 * pas le push (ex. Safari en onglet normal, non ajouté à l'écran d'accueil sur iOS). */
export async function subscribeToPush(ownerId) {
  if (!isPushSupported() || !ownerId) return false;
  const vapidPublicKey = import.meta.env.VITE_VAPID_PUBLIC_KEY;
  if (!vapidPublicKey) return false;

  try {
    const registration = await navigator.serviceWorker.register('/sw.js');
    await navigator.serviceWorker.ready;
    const subscription =
      (await registration.pushManager.getSubscription()) ||
      (await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
      }));

    const json = subscription.toJSON();
    const { error } = await supabase.from('push_subscriptions').upsert(
      {
        user_id: ownerId,
        endpoint: json.endpoint,
        p256dh: json.keys.p256dh,
        auth: json.keys.auth,
      },
      { onConflict: 'endpoint' }
    );
    return !error;
  } catch (err) {
    console.error('[push] subscribeToPush failed', err);
    return false;
  }
}
