// Extension explicite : ce module est chargé par une fonction serveur (api/send-reminders.js),
// où la résolution ESM de Node n'ajoute pas le « .js » — contrairement à Vite et au bundler
// de Vercel, qui pardonnent l'omission. Sans elle, le rappel ne dépend plus du code mais du
// bundler qui l'emballe.
import { zonedDateTimeToUtc } from './timezone.js';

/** Quels rappels doivent partir maintenant, et à qui.
 *
 *  Toute la décision est ici, en fonction pure : `now` est un paramètre, jamais une lecture
 *  d'horloge implicite. C'est ce qui rend vérifiables les cas qui, autrement, ne se
 *  constatent qu'en production et une seule fois — un rappel parti deux fois, un rappel parti
 *  après le rendez-vous, un rappel sauté parce que le serveur dormait.
 *
 *  Ce module ne décide QUE de l'envoi. L'unicité (ne pas envoyer deux fois le même rappel)
 *  est garantie ailleurs, par une contrainte en base : c'est le seul endroit qui résiste à
 *  deux exécutions simultanées. Voir api/_lib/reminderLog.js. */

/** Les deux échéances, telles que Paramètres les nomme. La clé est celle enregistrée dans
 *  les préférences, `kind` celle inscrite au journal d'envoi. */
export const REMINDER_KINDS = [
  { key: 'reminder24h', kind: '24h', leadMinutes: 24 * 60, label: 'demain' },
  { key: 'reminder2h', kind: '2h', leadMinutes: 2 * 60, label: 'dans deux heures' },
];

/** Un rendez-vous déjà commencé ne reçoit plus de rappel, et un rendez-vous dont l'échéance
 *  est passée depuis longtemps non plus : au-delà, ce n'est plus un rattrapage mais une
 *  notification hors sujet.
 *
 *  Généreux à dessein (6 h) : l'ordonnanceur peut prendre du retard, être suspendu, ou
 *  échouer plusieurs fois de suite. Une fenêtre étroite ferait alors sauter le rappel
 *  purement et simplement — et un rappel sauté ne se rattrape jamais, contrairement à un
 *  rappel un peu tardif. Élargir est sans risque de doublon : c'est la contrainte d'unicité
 *  en base qui l'empêche, pas la finesse de cette fenêtre. */
const CATCH_UP_MS = 6 * 60 * 60 * 1000;

/** Statuts qui méritent un rappel.
 *
 *  `pending` en fait partie, et ce n'est pas un oubli : `addAppointment` crée TOUT rendez-vous
 *  dans cet état, y compris ceux issus d'une demande en ligne acceptée par la gérante
 *  (useBookingRequests.confirm). L'exclure priverait de rappel la majorité des rendez-vous
 *  réellement pris. Ici, « pending » veut dire « au planning, pas encore marqué confirmé »,
 *  pas « pas encore accepté » : une demande non traitée n'entre jamais dans ce magasin, elle
 *  reste dans la table booking_requests. */
const REMINDABLE_STATUSES = new Set(['pending', 'confirmed']);

const MINUTE_MS = 60 * 1000;

function clientOf(clients, clientId) {
  return (Array.isArray(clients) ? clients : []).find((c) => c?.id === clientId) ?? null;
}

/** Les rappels à envoyer à cet instant.
 *
 *  @param appointments rendez-vous bruts du magasin `ces-appointments`
 *  @param clients      fiches du magasin `ces-clients` (pour l'adresse e-mail)
 *  @param settings     état du magasin `ces-settings` (préférences + fuseau du salon)
 *  @param now          instant de référence
 *  @returns `[{ appointmentId, kind, startsAt, appointment, client }]`
 */
export function dueReminders({ appointments = [], clients = [], settings = null, now = new Date() } = {}) {
  const preferences = settings?.notifications ?? {};
  const active = REMINDER_KINDS.filter((r) => preferences[r.key] === true);
  if (active.length === 0) return [];

  const timeZone = settings?.salon?.timezone;
  const nowMs = now.getTime();
  const out = [];

  for (const appointment of Array.isArray(appointments) ? appointments : []) {
    if (!appointment?.id || !REMINDABLE_STATUSES.has(appointment.status)) continue;

    const startsAt = zonedDateTimeToUtc(appointment.date, appointment.time, timeZone);
    // Rendez-vous à moitié saisi : on l'écarte au lieu de calculer une échéance sur NaN, qui
    // serait fausse en silence plutôt que bruyante.
    if (!startsAt) continue;

    const startMs = startsAt.getTime();
    // Déjà commencé : un « rappel » arrivé après coup est pire que pas de rappel du tout,
    // il fait douter la cliente de l'heure qu'elle avait notée.
    if (nowMs >= startMs) continue;

    // Sans adresse e-mail, il n'y a personne à qui écrire. Silencieux à dessein : c'est le
    // cas courant (fiche créée au comptoir, sans e-mail), pas une anomalie à signaler.
    const client = clientOf(clients, appointment.clientId);
    if (!client?.email) continue;

    for (const { kind, leadMinutes } of active) {
      const dueMs = startMs - leadMinutes * MINUTE_MS;
      if (nowMs < dueMs) continue; // Pas encore l'heure.
      if (nowMs - dueMs > CATCH_UP_MS) continue; // Trop tard pour que ce rappel ait du sens.
      out.push({ appointmentId: appointment.id, kind, startsAt, appointment, client });
    }
  }

  // Le plus imminent d'abord : si un envoi doit échouer (quota, réseau), autant que ce soit
  // celui dont le rendez-vous est le plus lointain.
  return out.sort((a, b) => a.startsAt - b.startsAt);
}
