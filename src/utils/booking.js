import { staff } from '../data/staff';
import { formatDayLabel, isTodayISO, minutesToTime, rangesOverlap, timeToMinutes } from './date';

const STEP_MINUTES = 30;

/** dayHours ressemble à { open: '09:00', close: '18:30', closed: false }. */
export function daySchedule(salon, date) {
  const key = formatDayLabel(date).toLowerCase();
  return salon?.hours?.[key];
}

/** staffId optionnel : ne cherche des créneaux que pour cette esthéticienne précise
 * (utilisé par l'agenda côté équipe). Sans staffId, cherche parmi toute l'équipe
 * (utilisé par l'espace de réservation en ligne). */
export function availableSlots(appointments, date, duration, salon = {}, staffId = null) {
  const schedule = daySchedule(salon, date);
  if (!schedule || schedule.closed) return [];

  const openMinutes = timeToMinutes(schedule.open ?? '09:00');
  const closeMinutes = timeToMinutes(schedule.close ?? '18:30');
  const buffer = salon.bufferMinutes ?? 0;
  const candidates = staffId ? staff.filter((s) => s.id === staffId) : staff;
  const nowMinutes = isTodayISO(date) ? new Date().getHours() * 60 + new Date().getMinutes() : -1;
  const slots = [];
  for (let m = openMinutes; m + duration <= closeMinutes; m += STEP_MINUTES) {
    if (m < nowMinutes) continue;
    const time = minutesToTime(m);
    const freeStaff = candidates.find((s) =>
      !appointments.some(
        (a) =>
          a.staffId === s.id &&
          a.date === date &&
          a.status !== 'cancelled' &&
          rangesOverlap(a.time, a.duration, time, duration, buffer)
      )
    );
    if (freeStaff) {
      slots.push({ time, staffId: freeStaff.id, staffName: freeStaff.name });
    }
  }
  return slots;
}
