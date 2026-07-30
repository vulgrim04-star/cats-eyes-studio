import { addDaysISO } from './date';

/** Génération du calendrier iCalendar (RFC 5545), utilisée par deux chemins :
 *  — l'export manuel d'un fichier `.ics` (page Agenda) ;
 *  — le flux d'abonnement permanent servi par `api/ics.js`, celui auquel Google Agenda et
 *    Apple Calendrier restent connectés (bouton « Synchroniser mon agenda »).
 *
 *  Le second impose une rigueur que le premier pardonnait : un fichier téléchargé qu'un
 *  logiciel refuse, on le voit tout de suite ; un flux abonné qu'il refuse, il l'ignore en
 *  silence et l'agenda reste simplement vide, sans que personne ne sache pourquoi. D'où
 *  les garde-fous ci-dessous, dont aucun n'est cosmétique. */

const PRODID = "-//Cat's Eyes Studio//Agenda//FR";

/** Fréquence à laquelle on demande à Google/Apple de relire le flux. Purement indicatif —
 *  les deux appliquent leur propre cadence (quelques heures) — mais sans cette indication
 *  ils prennent la leur, qui est plus lente encore. */
const REFRESH_INTERVAL = 'PT1H';

const DEFAULT_CALENDAR_NAME = 'Rendez-vous';
const DEFAULT_DURATION_MINUTES = 60;

const MINUTES_PER_DAY = 24 * 60;

function pad(n) {
  return String(n).padStart(2, '0');
}

const isDateISO = (value) => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value);
const isTimeHM = (value) => typeof value === 'string' && /^\d{1,2}:\d{2}$/.test(value);

function toMinutes(time) {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

/** Date-heure « flottante » : sans `Z` ni `TZID`, donc interprétée par le logiciel de
 *  calendrier dans le fuseau de sa propriétaire. C'est bien le comportement voulu ici — un
 *  RDV « mardi 14h » est à 14h à l'heure du salon — et c'est aussi le seul honnête : l'app
 *  ne demande nulle part son fuseau à la salonnière, alors en déclarer un serait un pari. */
function floatingStamp(date, minutes) {
  const [y, m, d] = date.split('-');
  return `${y}${m}${d}T${pad(Math.floor(minutes / 60))}${pad(minutes % 60)}00`;
}

function utcStamp(now = new Date()) {
  return (
    `${now.getUTCFullYear()}${pad(now.getUTCMonth() + 1)}${pad(now.getUTCDate())}T` +
    `${pad(now.getUTCHours())}${pad(now.getUTCMinutes())}${pad(now.getUTCSeconds())}Z`
  );
}

/** Échappement des caractères que la RFC réserve. La barre oblique inverse d'abord, et dans
 *  la même passe que les autres : la traiter séparément ré-échapperait les échappements
 *  qu'on vient d'écrire. */
function escapeText(text = '') {
  return String(text)
    .replace(/\r\n|\r/g, '\n')
    .replace(/([\\;,])/g, '\\$1')
    .replace(/\n/g, '\\n');
}

const encoder = new TextEncoder();

/** Repliage des lignes longues (RFC 5545 §3.1) : au-delà de 75 octets, une ligne doit se
 *  poursuivre sur la suivante, précédée d'une espace.
 *
 *  Ce n'est pas une coquetterie de conformité : un nom de cliente un peu long accompagné du
 *  nom de la prestation dépasse facilement la limite, et les analyseurs stricts — celui
 *  d'Apple en particulier — rejettent alors l'événement entier, parfois le calendrier
 *  entier. On compte en OCTETS et on ne coupe jamais au milieu d'un caractère : « é » en
 *  compte deux, et une coupure au milieu produirait un flux illisible. */
function foldLine(line) {
  let size = encoder.encode(line).length;
  if (size <= 75) return line;

  const pieces = [];
  let current = '';
  let used = 0;
  let limit = 75;

  for (const char of line) {
    size = encoder.encode(char).length;
    if (used + size > limit) {
      pieces.push(current);
      current = '';
      used = 0;
      limit = 74; // Les lignes de continuation portent une espace en tête.
    }
    current += char;
    used += size;
  }
  pieces.push(current);
  return pieces.join('\r\n ');
}

function nameOf(person) {
  const name = `${person?.firstName ?? ''} ${person?.lastName ?? ''}`.trim();
  return name || 'Cliente';
}

/** `pending` = demande pas encore validée : elle doit apparaître dans l'agenda personnel,
 *  mais reconnaissable comme provisoire (Google et Apple l'affichent en transparence). */
function statusOf(appointment) {
  if (appointment.status === 'cancelled') return 'CANCELLED';
  if (appointment.status === 'pending') return 'TENTATIVE';
  return 'CONFIRMED';
}

/** Un rendez-vous exploitable, ou `null`.
 *
 *  Le filtre est le garde-fou le plus important de ce module. Une seule fiche sans heure
 *  suffisait à produire un `DTSTART:20260714TNaNNaN00`, et un flux qui contient une seule
 *  date invalide n'est pas « un flux avec un trou » : Google Agenda le rejette en bloc.
 *  Autrement dit, un rendez-vous à moitié saisi faisait disparaître *tout* l'agenda
 *  synchronisé, sans message nulle part. */
function toEvent(appointment, { stamp, location }) {
  if (!appointment?.id || !isDateISO(appointment.date) || !isTimeHM(appointment.time)) return null;

  const duration = Number(appointment.duration);
  const minutes = Number.isFinite(duration) && duration > 0 ? Math.round(duration) : DEFAULT_DURATION_MINUTES;

  const startMinutes = toMinutes(appointment.time);
  const endTotal = startMinutes + minutes;
  // Un RDV qui déborde sur le lendemain doit finir le LENDEMAIN. L'arithmétique d'heures de
  // l'app repasse à 00:00 au-delà de minuit ; appliquée telle quelle ici, elle produisait un
  // DTEND antérieur au DTSTART — un événement que les calendriers refusent.
  const endDate = addDaysISO(appointment.date, Math.floor(endTotal / MINUTES_PER_DAY));
  const endMinutes = endTotal % MINUTES_PER_DAY;

  const summary = [nameOf(appointment.client), appointment.service?.name].filter(Boolean).join(' — ');
  const description = [
    appointment.service?.name ? `Prestation : ${appointment.service.name}` : null,
    appointment.client?.phone ? `Téléphone : ${appointment.client.phone}` : null,
    appointment.notes || null,
  ].filter(Boolean);

  return [
    'BEGIN:VEVENT',
    `UID:${escapeText(appointment.id)}@cats-eyes-studio`,
    `DTSTAMP:${stamp}`,
    `DTSTART:${floatingStamp(appointment.date, startMinutes)}`,
    `DTEND:${floatingStamp(endDate, endMinutes)}`,
    `SUMMARY:${escapeText(summary)}`,
    description.length ? `DESCRIPTION:${escapeText(description.join('\n'))}` : null,
    location ? `LOCATION:${escapeText(location)}` : null,
    `STATUS:${statusOf(appointment)}`,
    'END:VEVENT',
  ].filter(Boolean);
}

/** Construit le calendrier.
 *
 *  @param appointments rendez-vous déjà enrichis (`client`, `service`).
 *  @param salonName    nom affiché du calendrier chez Google/Apple. Sans lui, un calendrier
 *                      abonné s'affiche sous son URL brute (« api/ics?u=… ») dans la liste
 *                      des agendas — illisible, et impossible à reconnaître parmi d'autres.
 *  @param options      `{ location }` — l'adresse du salon, reportée sur chaque événement. */
export function generateICS(appointments, salonName, { location = '', now = new Date() } = {}) {
  const stamp = utcStamp(now);
  const calendarName = String(salonName ?? '').trim() || DEFAULT_CALENDAR_NAME;

  const events = (Array.isArray(appointments) ? appointments : [])
    .map((appointment) => toEvent(appointment, { stamp, location }))
    .filter(Boolean)
    .flat();

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    `PRODID:${PRODID}`,
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${escapeText(calendarName)}`,
    `X-WR-CALDESC:${escapeText(`Rendez-vous de ${calendarName}`)}`,
    `REFRESH-INTERVAL;VALUE=DURATION:${REFRESH_INTERVAL}`,
    `X-PUBLISHED-TTL:${REFRESH_INTERVAL}`,
    ...events,
    'END:VCALENDAR',
  ];

  // Terminé par un CRLF : la RFC veut que chaque ligne, la dernière comprise, en porte un.
  return `${lines.map(foldLine).join('\r\n')}\r\n`;
}

export function downloadICS(filename, content) {
  const blob = new Blob([content], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
