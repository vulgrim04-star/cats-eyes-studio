const DAY_LABELS = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
const MONTH_LABELS = [
  'janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin',
  'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.',
];

function pad(n) {
  return String(n).padStart(2, '0');
}

export function toISODate(date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function todayISO() {
  return toISODate(new Date());
}

export function addDaysISO(iso, days) {
  const d = new Date(`${iso}T00:00:00`);
  d.setDate(d.getDate() + days);
  return toISODate(d);
}

export function isTodayISO(iso) {
  return iso === todayISO();
}

export function formatDayLabel(iso) {
  const d = new Date(`${iso}T00:00:00`);
  return DAY_LABELS[d.getDay()];
}

export function formatDayNumber(iso) {
  const d = new Date(`${iso}T00:00:00`);
  return d.getDate();
}

export function formatDateLong(iso) {
  const d = new Date(`${iso}T00:00:00`);
  return `${DAY_LABELS[d.getDay()]}. ${d.getDate()} ${MONTH_LABELS[d.getMonth()]} ${d.getFullYear()}`;
}

export function formatDateShort(iso) {
  const d = new Date(`${iso}T00:00:00`);
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
}

export function formatMonthLabel(iso) {
  const d = new Date(`${iso}T00:00:00`);
  return `${MONTH_LABELS[d.getMonth()]} ${d.getFullYear()}`;
}

export function timeToMinutes(time) {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

export function minutesToTime(minutes) {
  const h = Math.floor(minutes / 60) % 24;
  const m = minutes % 60;
  return `${pad(h)}:${pad(m)}`;
}

export function addMinutesToTime(time, minutesToAdd) {
  return minutesToTime(timeToMinutes(time) + minutesToAdd);
}

export function rangesOverlap(startA, durA, startB, durB) {
  const aStart = timeToMinutes(startA);
  const aEnd = aStart + durA;
  const bStart = timeToMinutes(startB);
  const bEnd = bStart + durB;
  return aStart < bEnd && bStart < aEnd;
}

export function getWeekDays(centerISO, span = 7) {
  const days = [];
  for (let i = 0; i < span; i += 1) {
    days.push(addDaysISO(centerISO, i));
  }
  return days;
}

export function isPastISO(iso) {
  return iso < todayISO();
}

/** Lundi de la semaine contenant la date donnée. */
export function getWeekStart(iso) {
  const d = new Date(`${iso}T00:00:00`);
  const mondayOffset = (d.getDay() + 6) % 7;
  return addDaysISO(iso, -mondayOffset);
}
