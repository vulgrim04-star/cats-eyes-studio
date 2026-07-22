import { staff } from '../data/staff';
import { formatDayLabel, minutesToTime, rangesOverlap, timeToMinutes } from './date';

const STEP_MINUTES = 30;

/** dayHours ressemble à { open: '09:00', close: '18:30', closed: false }. */
export function daySchedule(salon, date) {
  const key = formatDayLabel(date).toLowerCase();
  return salon?.hours?.[key];
}

export function availableSlots(appointments, date, duration, salon = {}) {
  const schedule = daySchedule(salon, date);
  if (!schedule || schedule.closed) return [];

  const openMinutes = timeToMinutes(schedule.open ?? '09:00');
  const closeMinutes = timeToMinutes(schedule.close ?? '18:30');
  const buffer = salon.bufferMinutes ?? 0;
  const slots = [];
  for (let m = openMinutes; m + duration <= closeMinutes; m += STEP_MINUTES) {
    const time = minutesToTime(m);
    const freeStaff = staff.find((s) =>
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
