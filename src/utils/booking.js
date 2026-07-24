import { formatDayLabel, isTodayISO, minutesToTime, rangesOverlap, timeToMinutes } from './date';

const STEP_MINUTES = 30;

/** dayHours ressemble à { open: '09:00', close: '18:30', closed: false }. */
export function daySchedule(salon, date) {
  const key = formatDayLabel(date).toLowerCase();
  return salon?.hours?.[key];
}

/** Calcule les créneaux libres pour une praticienne indépendante (une seule personne
 * réalise toutes les prestations) : un créneau est libre s'il ne chevauche aucun
 * rendez-vous existant ce jour-là. */
export function availableSlots(appointments, date, duration, salon = {}) {
  const schedule = daySchedule(salon, date);
  if (!schedule || schedule.closed) return [];

  const openMinutes = timeToMinutes(schedule.open ?? '09:00');
  const closeMinutes = timeToMinutes(schedule.close ?? '18:30');
  const buffer = salon.bufferMinutes ?? 0;
  const nowMinutes = isTodayISO(date) ? new Date().getHours() * 60 + new Date().getMinutes() : -1;
  const slots = [];
  for (let m = openMinutes; m + duration <= closeMinutes; m += STEP_MINUTES) {
    if (m < nowMinutes) continue;
    const time = minutesToTime(m);
    const busy = appointments.some(
      (a) => a.date === date && a.status !== 'cancelled' && rangesOverlap(a.time, a.duration, time, duration, buffer)
    );
    if (!busy) slots.push({ time });
  }
  return slots;
}
