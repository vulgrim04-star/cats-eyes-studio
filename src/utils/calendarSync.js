/** Abonnement de Google Agenda / Apple Calendrier au planning du salon, en un clic.
 *
 *  Le flux `.ics` existait déjà (`api/ics.js`), mais il fallait copier son adresse, ouvrir
 *  Google ou Apple, trouver « s'abonner à un calendrier », coller. Six étapes hors de
 *  l'application, dont deux dans des réglages système que personne ne connaît par cœur.
 *
 *  Or les deux plateformes savent recevoir cet abonnement directement :
 *   — `webcal:` est le schéma qu'iOS, macOS et Windows associent à « s'abonner à un
 *     calendrier ». L'ouvrir affiche la feuille de confirmation du système ;
 *   — Google Agenda expose la même chose en URL web (`/calendar/r?cid=…`).
 *  Il n'y a donc rien à installer : seulement les bonnes adresses à composer, et c'est tout
 *  ce que fait ce module. Fonctions pures, testables sans navigateur. */

export const APPLE = 'apple';
export const GOOGLE = 'google';
export const OTHER = 'other';

/** Adresse du flux d'abonnement. Le jeton fait office de secret d'accès : il ne doit
 *  apparaître que là où l'adresse est réellement nécessaire. */
export function calendarFeedUrl({ origin, ownerId, token } = {}) {
  if (!origin || !ownerId || !token) return '';
  return `${String(origin).replace(/\/+$/, '')}/api/ics?u=${encodeURIComponent(ownerId)}&t=${encodeURIComponent(token)}`;
}

/** Même adresse, schéma `webcal:`.
 *
 *  Le schéma n'est pas cosmétique : en `https:`, iOS *télécharge* un fichier `.ics` figé —
 *  les rendez-vous ajoutés ensuite n'apparaîtront jamais — alors qu'en `webcal:` il crée un
 *  abonnement qui se remet à jour tout seul. C'est exactement la différence entre l'export
 *  manuel existant et la synchronisation demandée ici. */
export function webcalUrl(feedUrl) {
  if (!feedUrl) return '';
  return String(feedUrl).replace(/^https?:/i, 'webcal:');
}

/** Lien d'ajout de Google Agenda. `cid` attend l'adresse du flux ; on lui passe la forme
 *  `webcal:` parce que c'est celle que Google interprète comme un abonnement plutôt que
 *  comme un import unique. */
export function googleSubscribeUrl(feedUrl) {
  if (!feedUrl) return '';
  return `https://calendar.google.com/calendar/r?cid=${encodeURIComponent(webcalUrl(feedUrl))}`;
}

/** Vers quel agenda cette salonnière va-t-elle vraisemblablement vouloir synchroniser ?
 *
 *  Sert uniquement à mettre le bon choix en avant — les trois restent proposés, et rien
 *  n'est fait sans qu'elle ait choisi. Se tromper n'a donc aucune conséquence, ce qui
 *  autorise l'heuristique simple de la détection par `userAgent`.
 *
 *  Les iPad n'ont pas besoin d'être distingués : depuis iPadOS 13 leur Safari s'annonce
 *  comme un Mac de bureau, et les deux mènent de toute façon à Apple Calendrier. */
export function detectCalendarTarget(userAgent = '') {
  const ua = String(userAgent);
  if (/iPhone|iPad|iPod|Macintosh/i.test(ua)) return APPLE;
  if (/Android|CrOS/i.test(ua)) return GOOGLE;
  return OTHER;
}

/** Lecture du navigateur courant, isolée ici pour que `detectCalendarTarget` reste pure. */
export function currentCalendarTarget() {
  if (typeof navigator === 'undefined') return OTHER;
  return detectCalendarTarget(navigator.userAgent);
}
