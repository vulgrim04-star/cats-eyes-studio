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

export function clientVapidKey() {
  return import.meta.env.VITE_VAPID_PUBLIC_KEY || '';
}

/** L'abonnement enregistré vise-t-il bien la clé VAPID actuelle ?
 *
 *  Un abonnement créé avec une autre clé continue d'exister et d'être renvoyé par
 *  `getSubscription()`, mais le serveur ne peut plus lui écrire : il reçoit un 403, qui
 *  n'est ni un 404 ni un 410 et ne déclenche donc aucun nettoyage. Sans cette
 *  vérification, changer de paire de clés coupe les notifications définitivement, sans
 *  le moindre signe. */
function matchesCurrentKey(subscription, key) {
  const applied = subscription?.options?.applicationServerKey;
  if (!applied) return true; // Navigateur qui n'expose pas l'option : rien à comparer.
  const current = urlBase64ToUint8Array(key);
  const stored = new Uint8Array(applied);
  return stored.length === current.length && stored.every((byte, i) => byte === current[i]);
}

/** Enregistre le service worker (idempotent) puis (ré)abonne cet appareil aux
 * notifications push et enregistre l'abonnement pour cette salonnière dans Supabase.
 *
 * Renvoie `{ ok, reason }` plutôt qu'un booléen : chacune des cinq façons d'échouer
 * appelle une réponse différente de la part de l'utilisatrice (installer l'app sur
 * l'écran d'accueil, débloquer les notifications, déployer une variable manquante…), et
 * les confondre en un seul « false » revenait à ne rien lui dire du tout.
 *
 * Best-effort : ne lève jamais. */
export async function subscribeToPush(ownerId) {
  if (!isPushSupported()) return { ok: false, reason: 'unsupported' };
  if (!ownerId) return { ok: false, reason: 'signed-out' };
  if (typeof Notification !== 'undefined' && Notification.permission !== 'granted') {
    return { ok: false, reason: Notification.permission === 'denied' ? 'permission-denied' : 'permission-missing' };
  }

  const vapidPublicKey = clientVapidKey();
  if (!vapidPublicKey) return { ok: false, reason: 'missing-client-key' };

  try {
    const registration = await navigator.serviceWorker.register('/sw.js');
    await navigator.serviceWorker.ready;

    let subscription = await registration.pushManager.getSubscription();
    if (subscription && !matchesCurrentKey(subscription, vapidPublicKey)) {
      await subscription.unsubscribe();
      subscription = null;
    }
    if (!subscription) {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
      });
    }

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
    if (error) {
      console.error('[push] enregistrement de l’abonnement en échec', error);
      return { ok: false, reason: 'save-failed', detail: error.code ?? null };
    }
    return { ok: true, reason: 'subscribed', endpoint: json.endpoint };
  } catch (err) {
    console.error('[push] subscribeToPush failed', err);
    return { ok: false, reason: 'subscribe-failed', detail: err?.name ?? null };
  }
}

/** L'abonnement de cet appareil est-il ENREGISTRÉ, c'est-à-dire connu du serveur ?
 *
 *  Distinction essentielle, et je l'avais d'abord manquée : le navigateur peut très bien
 *  avoir créé un abonnement valide sans que la ligne correspondante existe en base. Le
 *  serveur n'a alors personne à qui écrire, et l'écran affirmait pourtant « tu seras alertée
 *  même app fermée ». Un diagnostic qui se contente de regarder le navigateur ne diagnostique
 *  que la moitié de la chaîne. */
async function isRegisteredOnServer(ownerId, endpoint) {
  if (!ownerId || !endpoint) return { registered: false, reason: 'signed-out' };
  const { data, error } = await supabase
    .from('push_subscriptions')
    .select('id')
    .eq('user_id', ownerId)
    .eq('endpoint', endpoint)
    .maybeSingle();

  if (error) {
    console.error('[push] lecture de l’abonnement en échec', error);
    // PGRST205 = table absente du schéma : la cause la plus fréquente, et la seule qui se
    // corrige par une commande SQL plutôt que par un réglage.
    return { registered: false, reason: error.code === 'PGRST205' ? 'table-missing' : 'save-failed' };
  }
  return { registered: Boolean(data), reason: data ? null : 'not-registered' };
}

/** État réel de cet appareil, des deux côtés de la chaîne.
 *
 *  La permission accordée ne dit rien de l'abonnement, et l'abonnement du navigateur ne dit
 *  rien de son enregistrement côté serveur. Paramètres annonçait « Activées — même app
 *  fermée » sur la seule foi de `Notification.permission` ; il faut les trois. */
export async function localPushState(ownerId) {
  if (!isPushSupported()) {
    return { supported: false, permission: 'unsupported', subscribed: false, registered: false };
  }

  const permission = typeof Notification !== 'undefined' ? Notification.permission : 'default';
  if (permission !== 'granted') {
    return { supported: true, permission, subscribed: false, registered: false };
  }

  try {
    const registration = await navigator.serviceWorker.getRegistration('/sw.js');
    const subscription = await registration?.pushManager?.getSubscription();
    const key = clientVapidKey();
    const subscribed = Boolean(subscription && key && matchesCurrentKey(subscription, key));
    if (!subscribed) return { supported: true, permission, subscribed: false, registered: false };

    const server = await isRegisteredOnServer(ownerId, subscription.endpoint);
    return { supported: true, permission, subscribed: true, ...server };
  } catch {
    return { supported: true, permission, subscribed: false, registered: false };
  }
}

/** Demande au serveur d'envoyer une vraie notification à tous les appareils du compte.
 *  L'identité vient du jeton de session, pas d'un identifiant passé en clair. */
export async function sendTestPush() {
  try {
    const { data } = await supabase.auth.getSession();
    const token = data?.session?.access_token;
    if (!token) return { ok: false, reason: 'signed-out' };

    const response = await fetch('/api/push-test', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });
    // Un endpoint absent (404) ou une plateforme sans fonctions serveur renvoie du HTML :
    // sans ce garde-fou, le `json()` lèverait et la cause afficherait « inconnue ».
    const payload = await response.json().catch(() => null);
    if (!payload) return { ok: false, reason: 'server-error' };
    return payload;
  } catch (err) {
    console.error('[push] test en échec', err);
    return { ok: false, reason: 'server-error' };
  }
}

/** Texte destiné à la salonnière pour chaque cause d'échec. Le vocabulaire des raisons
 *  est partagé avec le serveur (api/push-test.js) : un seul endroit à lire pour savoir
 *  ce qui bloque. */
export const PUSH_REASON_TEXT = {
  subscribed: 'Cet appareil est prêt à recevoir les notifications, même app fermée.',
  unsupported:
    "Ce navigateur ne gère pas les notifications app fermée. Sur iPhone/iPad : ajoute l'app à l'écran d'accueil (Partager → « Sur l'écran d'accueil ») et ouvre-la depuis cette icône.",
  'signed-out': 'Session expirée — reconnecte-toi puis réessaie.',
  'permission-denied':
    'Les notifications sont bloquées pour ce site dans les réglages du navigateur/téléphone. Il faut les réautoriser à la main.',
  'permission-missing': "L'autorisation n'a pas encore été donnée sur cet appareil — appuie sur « Activer ».",
  'missing-client-key':
    "La clé de notification n'est pas présente dans cette version de l'app (variable VITE_VAPID_PUBLIC_KEY). À ajouter dans Vercel, puis redéployer.",
  'save-failed': "L'abonnement de cet appareil n'a pas pu être enregistré dans Supabase.",
  'table-missing':
    "La table push_subscriptions n'existe pas encore dans Supabase. C'est elle qui retient quels appareils doivent sonner : sans elle, le serveur n'a personne à qui écrire. Le script à exécuter une fois se trouve dans supabase/README.md.",
  'not-registered':
    "Cet appareil a bien un abonnement, mais il n'est pas enregistré côté serveur — appuie sur « Envoyer une notification de test » pour connaître la cause exacte.",
  'subscribe-failed': "Le navigateur a refusé de créer l'abonnement sur cet appareil.",
  'missing-server-keys':
    "Le serveur n'a pas ses clés de notification (VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY). À ajouter dans Vercel, puis redéployer.",
  'no-subscription':
    "Aucun appareil n'est abonné pour ce compte — appuie sur « Activer » sur le téléphone qui doit sonner.",
  'send-failed': "Le service de notification du navigateur a refusé l'envoi. Réactive les notifications sur cet appareil.",
  sent: 'Notification envoyée.',
  'query-error': "Impossible de lire les appareils abonnés (table push_subscriptions manquante ?).",
  'server-misconfigured': "Le serveur n'a pas ses identifiants Supabase — voir /api/health.",
  'server-error': "Le serveur n'a pas répondu correctement. Voir /api/health.",
  'method-not-allowed': 'Requête refusée par le serveur.',
};

export function pushReasonText(reason) {
  return PUSH_REASON_TEXT[reason] ?? "Cause inconnue — regarde la console du navigateur pour le détail.";
}
