// Service worker minimal, dédié uniquement à la réception des notifications push
// (nouvelle réservation en ligne) — pas de cache offline, volontairement simple.

/** Étiquette partagée avec l'app (src/utils/localNotify.js).
 *
 *  App ouverte au premier plan sur le téléphone, deux notifications identiques arrivaient
 *  pour la même demande : celle du serveur, et celle affichée localement par l'app. À
 *  étiquette égale, le système remplace la précédente au lieu d'en empiler une seconde. */
const BOOKING_TAG = 'booking-request';

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { title: "Cat's Eyes Manager", body: event.data ? event.data.text() : '' };
  }

  event.waitUntil(
    self.registration.showNotification(data.title || 'Nouvelle réservation', {
      body: data.body || '',
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      tag: data.tag || BOOKING_TAG,
      // Sans `renotify`, remplacer une notification de même étiquette se fait en silence :
      // une deuxième réservation arrivée pendant que la première n'a pas été lue ne ferait
      // ni bruit ni vibration, et passerait donc inaperçue.
      renotify: true,
      data: { url: data.url || '/' },
    })
  );
});

/** Amène la fenêtre de l'app sur `url`, sans jamais en ouvrir une deuxième si l'app est
 *  déjà ouverte.
 *
 *  Le test précédent (`client.url.includes(cible)`) se trompait dans les deux sens :
 *  — cible « / » : *toutes* les URL la contiennent, donc n'importe quelle page ouverte
 *    passait pour la bonne et on n'y naviguait jamais ;
 *  — cible « /agenda » alors que l'app est sur « /clientes » : aucune correspondance, donc
 *    `openWindow` ouvrait une SECONDE fenêtre de l'application par-dessus la première.
 *  Dans les deux cas, toucher la notification ne menait pas où elle promettait. */
async function openTarget(url) {
  const target = new URL(url, self.location.origin);
  const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });

  const sameOrigin = windows.filter((client) => {
    try {
      return new URL(client.url).origin === target.origin;
    } catch {
      return false;
    }
  });

  // Déjà sur la bonne page : il suffit de la ramener au premier plan.
  const exact = sameOrigin.find((client) => new URL(client.url).pathname === target.pathname);
  if (exact) return exact.focus();

  // Sinon, on déplace la fenêtre existante. `navigate()` peut être refusé (fenêtre non
  // contrôlée par ce service worker, par exemple juste après une première installation) —
  // on retombe alors sur l'ouverture classique plutôt que de ne rien faire du tout.
  const [existing] = sameOrigin;
  if (existing) {
    try {
      const navigated = await existing.navigate(target.href);
      return (navigated ?? existing).focus();
    } catch {
      // Chemin de repli ci-dessous.
    }
  }

  return self.clients.openWindow(target.href);
}

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(openTarget(event.notification.data?.url || '/'));
});

/** Le navigateur a fait tourner l'abonnement push de cet appareil.
 *
 *  Sans ce gestionnaire, l'appareil se retrouvait purement et simplement sans abonnement :
 *  l'ancien endpoint ne répond plus (le serveur reçoit un 410 et supprime la ligne), et
 *  aucun nouveau n'est créé. Les notifications s'arrêtaient donc définitivement, sans le
 *  moindre signe — jusqu'à ce que la salonnière rouvre l'app, ce qui est précisément ce
 *  qu'une notification est censée lui éviter d'avoir à faire.
 *
 *  On recrée ici l'abonnement avec la même clé serveur. Son enregistrement en base, lui,
 *  ne peut pas se faire depuis le service worker : il n'a aucune session Supabase, et lui
 *  ouvrir un endpoint d'écriture non authentifié permettrait de détourner les
 *  notifications d'un compte vers un autre appareil. C'est donc l'app qui le fera à sa
 *  prochaine ouverture (`useBookingNotifications` réabonne à chaque montage) — mais elle
 *  trouvera alors un abonnement valide au lieu de rien. */
self.addEventListener('pushsubscriptionchange', (event) => {
  const key = event.newSubscription?.options?.applicationServerKey ?? event.oldSubscription?.options?.applicationServerKey;
  if (event.newSubscription || !key) return;

  event.waitUntil(
    self.registration.pushManager
      .subscribe({ userVisibleOnly: true, applicationServerKey: key })
      .catch((err) => console.error('[sw] réabonnement après rotation en échec', err))
  );
});
