import webpush from 'web-push';

// Envoi de notifications Web Push, partagé par la notification de réservation
// (api/notify-booking.js) et le test de configuration (api/push-test.js) — pour que le
// bouton « Tester » emprunte exactement le même chemin que la vraie notification. Un test
// qui passerait par un autre code ne prouverait rien.

export function hasVapidConfig() {
  return Boolean(process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY);
}

/** Le padding et les espaces parasites ne changent pas la clé, mais faussent une comparaison
 *  littérale — et un copier-coller depuis un document en ajoute très facilement. */
const normalizeKey = (value) => (value ?? '').trim().replace(/=+$/, '');

/** La clé publique du serveur et celle compilée dans le navigateur désignent-elles la même
 *  paire ?
 *
 *  Vérification indispensable, et elle manquait : la même clé publique doit être déclarée
 *  DEUX fois dans Vercel, sous `VAPID_PUBLIC_KEY` et sous `VITE_VAPID_PUBLIC_KEY`. Si les
 *  deux diffèrent — ne serait-ce que d'un caractère perdu au collage — l'appareil s'abonne
 *  avec l'une, le serveur signe avec l'autre, et le service de push refuse chaque envoi par
 *  un 403. Tous les autres contrôles restent verts : les deux clés existent bel et bien.
 *
 *  Renvoie `null` si l'une des deux manque : c'est alors l'autre contrôle qui le signale.
 *  Ne renvoie jamais les valeurs elles-mêmes. */
export function vapidKeysMatch() {
  const server = normalizeKey(process.env.VAPID_PUBLIC_KEY);
  const client = normalizeKey(process.env.VITE_VAPID_PUBLIC_KEY);
  if (!server || !client) return null;
  if (server !== client) {
    console.error(
      '[push] VAPID_PUBLIC_KEY et VITE_VAPID_PUBLIC_KEY diffèrent : ' +
        `${server.length} vs ${client.length} caractères. Aucun envoi ne peut aboutir.`
    );
    return false;
  }
  // Espace ou retour à la ligne collé dans la variable : les clés se valent après nettoyage,
  // mais web-push reçoit la valeur brute et peut la refuser.
  if ((process.env.VAPID_PUBLIC_KEY ?? '').trim() !== process.env.VAPID_PUBLIC_KEY) {
    console.error('[push] VAPID_PUBLIC_KEY contient un espace ou un retour à la ligne parasite.');
  }
  return true;
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
  let forbidden = false;
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
          // Un 403 ne se corrige pas en réessayant : il dit que la signature ne correspond
          // pas à l'abonnement. On le remonte tel quel pour que l'app nomme la vraie cause
          // au lieu d'accuser le navigateur.
          if (err.statusCode === 403) forbidden = true;
        }
        return false;
      }
    })
  );

  const count = results.filter(Boolean).length;
  if (count > 0) return { sent: true, reason: 'sent', count };
  // Le 403 prime sur l'échec générique : c'est le seul qui désigne une cause précise, et
  // celle-ci se corrige dans les variables d'environnement, pas sur le téléphone.
  return { sent: false, reason: forbidden ? 'key-mismatch' : 'send-failed', count: 0 };
}
