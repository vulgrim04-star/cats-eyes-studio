import { upcomingBirthdays } from './birthday';

/** Le fil de notifications, en fonctions pures.
 *
 * Jusqu'ici les alertes de la cloche étaient recalculées à chaque rendu. Une chose qu'on
 * recalcule ne peut être ni marquée lue, ni supprimée, ni conservée en historique : la
 * cloche affichait donc indéfiniment des rendez-vous en attente vieux de plusieurs semaines,
 * sans aucun moyen de les faire disparaître.
 *
 * On garde la dérivation depuis les données (c'est elle qui garantit qu'une alerte est
 * toujours vraie) mais on lui donne une mémoire : chaque alerte porte un identifiant STABLE,
 * ce qui permet de la reconnaître d'un calcul à l'autre au lieu de la recréer.
 */

export const KIND = {
  booking: 'booking',
  appointment: 'appointment',
  birthday: 'birthday',
  stock: 'stock',
};

/** Au-delà, les plus anciennes entrées déjà traitées sont oubliées. Les alertes encore
 *  actives ne sont jamais purgées, quel qu'en soit le nombre. */
export const HISTORY_LIMIT = 200;

// Volontairement tolérant : une fiche incomplète ne doit pas produire un « undefined
// undefined » dans une notification.
const labelOf = (person) => `${person?.firstName ?? ''} ${person?.lastName ?? ''}`.trim() || 'Une cliente';

function requestName(request) {
  return `${request?.first_name ?? ''} ${request?.last_name ?? ''}`.trim() || 'Une cliente';
}

function whenLabel(date, time) {
  return [date, time].filter(Boolean).join(' à ');
}

/** Date en millisecondes ; une date absente ou illisible part au fond du classement plutôt
 *  que d'y semer un NaN, qui rendrait le tri instable. */
function timeOf(value) {
  const ms = Date.parse(value ?? '');
  return Number.isNaN(ms) ? 0 : ms;
}

/** Traduit l'état actuel des données en alertes. Ne connaît ni le temps qui passe ni ce qui
 *  a déjà été vu : c'est `mergeNotifications` qui s'en charge.
 *
 *  Les listes arrivent DÉJÀ filtrées — `pendingAppointments` (statut « en attente », via
 *  `getPendingAppointments`) et `lowStock` (via `lowStockProducts`) — pour que la règle
 *  « qu'est-ce qui mérite une alerte » reste chez celui qui possède la donnée. Les noms des
 *  paramètres le disent, afin qu'on ne puisse pas s'y tromper en passant la liste complète. */
export function deriveNotifications({
  bookingRequests = [],
  pendingAppointments = [],
  clients = [],
  lowStock = [],
} = {}) {
  const out = [];

  for (const request of bookingRequests) {
    if (!request?.id) continue;
    out.push({
      id: `booking:${request.id}`,
      kind: KIND.booking,
      title: `${requestName(request)} — demande de RDV`,
      body: [request.service_name, whenLabel(request.date, request.time)].filter(Boolean).join(' · '),
      href: '/',
    });
  }

  for (const appointment of pendingAppointments) {
    if (!appointment?.id) continue;
    out.push({
      id: `appointment:${appointment.id}`,
      kind: KIND.appointment,
      title: `${labelOf(appointment.client)} — RDV à confirmer`,
      body: [appointment.service?.name, whenLabel(appointment.date, appointment.time)].filter(Boolean).join(' · '),
      href: '/agenda',
    });
  }

  for (const { client, daysUntil } of upcomingBirthdays(clients, 7)) {
    // L'année est dans l'identifiant : l'alerte de l'an prochain est une alerte neuve, même
    // si celle de cette année a été supprimée.
    const year = new Date().getFullYear() + (daysUntil >= 0 ? 0 : 1);
    out.push({
      id: `birthday:${client.id}:${year}`,
      kind: KIND.birthday,
      title: `${labelOf(client)} — anniversaire`,
      body: daysUntil === 0 ? "Aujourd'hui" : `Dans ${daysUntil} jour${daysUntil > 1 ? 's' : ''}`,
      href: `/clientes/${client.id}`,
    });
  }

  for (const product of lowStock) {
    if (!product?.id) continue;
    out.push({
      id: `stock:${product.id}`,
      kind: KIND.stock,
      title: product.name,
      body: `Stock faible : ${product.stock} / ${product.stockMin}`,
      href: '/stock',
    });
  }

  return out;
}

/** Confronte ce qui est enregistré à ce que disent les données maintenant.
 *
 *  Trois règles, et la deuxième est celle qui manquait :
 *   1. une alerte inconnue entre en non-lue ;
 *   2. une alerte SUPPRIMÉE ne revient jamais, même si sa source existe toujours — sinon
 *      « supprimer » ne voudrait rien dire tant que le rendez-vous n'est pas traité ;
 *   3. une alerte dont la source a disparu (RDV confirmé, stock réapprovisionné) est résolue :
 *      elle quitte la liste active et rejoint l'historique.
 */
export function mergeNotifications(stored = [], derived = [], now = new Date().toISOString()) {
  const previous = new Map((Array.isArray(stored) ? stored : []).filter((n) => n?.id).map((n) => [n.id, n]));
  const live = new Set();
  const result = [];

  for (const item of derived) {
    if (!item?.id) continue;
    live.add(item.id);
    const known = previous.get(item.id);
    previous.delete(item.id);

    if (!known) {
      result.push({ ...item, createdAt: now, readAt: null, dismissedAt: null, resolvedAt: null });
      continue;
    }
    // Le contenu est rafraîchi (un RDV peut être déplacé), l'état de lecture ne l'est pas.
    result.push({
      ...known,
      title: item.title,
      body: item.body,
      href: item.href,
      kind: item.kind,
      resolvedAt: null,
    });
  }

  for (const known of previous.values()) {
    result.push({ ...known, resolvedAt: known.resolvedAt ?? now });
  }

  // Tri sur l'instant, pas sur la chaîne : deux dates ISO au même format se comparent bien
  // lexicographiquement, mais une date venue d'ailleurs (fuseau explicite, ancien format)
  // se retrouverait au mauvais endroit sans qu'on comprenne pourquoi.
  result.sort((a, b) => timeOf(b.createdAt) - timeOf(a.createdAt));
  return purge(result, live);
}

/** Ne purge que des entrées devenues inertes.
 *
 *  Une entrée supprimée dont la source existe encore doit être CONSERVÉE : c'est elle qui
 *  empêche l'alerte de réapparaître au prochain calcul. L'oublier ferait resurgir ce que
 *  l'utilisatrice a explicitement écarté. */
function purge(list, live) {
  if (list.length <= HISTORY_LIMIT) return list;

  const removable = [];
  list.forEach((item, index) => {
    if (item.resolvedAt && !live.has(item.id)) removable.push(index);
  });

  const excess = Math.min(list.length - HISTORY_LIMIT, removable.length);
  if (excess <= 0) return list;

  const drop = new Set(removable.slice(-excess));
  return list.filter((_, index) => !drop.has(index));
}

/** Ce que la cloche montre : ni supprimé, ni déjà traité. */
export function activeNotifications(list = []) {
  return list.filter((n) => n && !n.dismissedAt && !n.resolvedAt);
}

/** Ce que la page d'historique montre : tout sauf ce qui a été supprimé à la main. */
export function historyNotifications(list = []) {
  return list.filter((n) => n && !n.dismissedAt);
}

export function unreadCount(list = []) {
  return activeNotifications(list).filter((n) => !n.readAt).length;
}
