/** Affichage d'une notification système depuis l'app ouverte.
 *
 *  Pourquoi ce module existe : `new Notification(...)` **lève** sur Android Chrome, et sur
 *  tout navigateur où un service worker est enregistré. Le message est explicite une fois
 *  qu'on le voit dans la console —
 *  « Illegal constructor. Use ServiceWorkerRegistration.showNotification() instead. » —
 *  mais l'appel se trouvait au milieu d'une fonction d'alerte : l'exception partait dans
 *  une promesse non rattrapée, le toast (affiché juste avant) apparaissait normalement, et
 *  la notification système, elle, ne sortait jamais. Depuis un téléphone Android, la
 *  salonnière voyait donc un bandeau à l'écran et rien d'autre — exactement le symptôme
 *  « les notifications ne marchent pas » alors que toute la chaîne push était en place.
 *
 *  On passe donc par le service worker quand il y en a un (le cas normal : `subscribeToPush`
 *  l'enregistre), et on ne retombe sur le constructeur que là où il est réellement permis
 *  (Firefox et Safari de bureau sans service worker actif).
 *
 *  Best-effort de bout en bout : une notification qui ne peut pas s'afficher ne doit jamais
 *  faire échouer ce qui l'a déclenchée. */

/** Étiquette partagée avec le service worker (public/sw.js).
 *
 *  Indispensable, et elle manquait d'un côté : app ouverte au premier plan sur le téléphone,
 *  la salonnière recevait DEUX notifications identiques pour la même demande — celle envoyée
 *  par le serveur et celle affichée localement. À étiquette égale, le système remplace la
 *  précédente au lieu d'en empiler une seconde. */
export const BOOKING_TAG = 'booking-request';

export async function showLocalNotification(title, options = {}) {
  if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return false;

  try {
    if ('serviceWorker' in navigator) {
      const registration = await navigator.serviceWorker.getRegistration('/sw.js');
      if (registration) {
        await registration.showNotification(title, options);
        return true;
      }
    }
  } catch (err) {
    console.error('[notify] showNotification via service worker en échec', err);
  }

  try {
    // Seul chemin restant, et le seul où le constructeur est autorisé.
    new Notification(title, options);
    return true;
  } catch (err) {
    console.error('[notify] Notification() refusée par ce navigateur', err);
    return false;
  }
}
