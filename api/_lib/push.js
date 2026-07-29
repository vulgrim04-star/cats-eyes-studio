import webpush from 'web-push';

// Envoi de notifications Web Push, partagé par la notification de réservation
// (api/notify-booking.js) et le test de configuration (api/push-test.js) — pour que le
// bouton « Tester » emprunte exactement le même chemin que la vraie notification. Un test
// qui passerait par un autre code ne prouverait rien.

export function hasVapidConfig() {
  return Boolean(process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY);
}

/** Envoie `payload` à tous les appareils abonnés de cette salonnière.
 *
 * Renvoie une raison unique, dans le même vocabulaire que src/utils/push.js, pour que
 * l'app puisse afficher une phrase utile au lieu d'un échec anonyme :
 *   missing-server-keys · no-subscription · query-error · send-failed · sent
 */
export async function sendPushToUser(supabase, userId, payload) {
  if (!hasVapidConfig()) return { sent: false, reason: 'missing-server-keys', count: 0 };

  const { data: subs, error } = await supabase
    .from('push_subscriptions')
    .select('id, endpoint, p256dh, auth')
    .eq('user_id', userId);

  if (error) {
    console.error('[push] lecture des abonnements en échec', error);
    return { sent: false, reason: 'query-error', count: 0 };
  }
  if (!subs?.length) return { sent: false, reason: 'no-subscription', count: 0 };

  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || 'mailto:contact@cats-eyes-studio.vercel.app',
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );

  const body = JSON.stringify(payload);
  const results = await Promise.all(
    subs.map(async (sub) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          body
        );
        return true;
      } catch (err) {
        // 404/410 = abonnement expiré ou révoqué côté navigateur : on le supprime pour ne
        // plus tenter de lui écrire. Tout autre code (403 = clé VAPID qui ne correspond
        // plus, 413 = charge trop grosse) reste en base et part dans les journaux : le
        // supprimer masquerait une erreur de configuration au lieu de la signaler.
        if (err.statusCode === 404 || err.statusCode === 410) {
          await supabase.from('push_subscriptions').delete().eq('id', sub.id);
        } else {
          console.error('[push] envoi en échec', err.statusCode, err.body);
        }
        return false;
      }
    })
  );

  const count = results.filter(Boolean).length;
  return count > 0
    ? { sent: true, reason: 'sent', count }
    : { sent: false, reason: 'send-failed', count: 0 };
}
