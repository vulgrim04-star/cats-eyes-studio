import { describe, expect, it } from 'vitest';
import { availableSlots } from './booking';
import { formatDayLabel } from './date';
import { staff } from '../data/staff';

// Date lointaine et fixe pour ne jamais tomber sur "aujourd'hui" (qui filtre les créneaux passés).
const FUTURE_DATE = '2030-06-10';

function salonWithHours(hours) {
  const key = formatDayLabel(FUTURE_DATE).toLowerCase();
  return { hours: { [key]: hours } };
}

describe('availableSlots', () => {
  it('ne retourne aucun créneau quand le salon est fermé ce jour-là', () => {
    const salon = salonWithHours({ open: '09:00', close: '18:00', closed: true });
    expect(availableSlots([], FUTURE_DATE, 60, salon)).toEqual([]);
  });

  it('propose un créneau libre quand personne n\'a de rendez-vous', () => {
    const salon = salonWithHours({ open: '09:00', close: '10:00', closed: false });
    const slots = availableSlots([], FUTURE_DATE, 60, salon);
    expect(slots).toHaveLength(1);
    expect(slots[0].time).toBe('09:00');
  });

  it('exclut une esthéticienne déjà prise sur ce créneau', () => {
    const salon = salonWithHours({ open: '09:00', close: '10:00', closed: false });
    const busyStaffId = staff[0].id;
    const appointments = [{ staffId: busyStaffId, date: FUTURE_DATE, time: '09:00', duration: 60, status: 'confirmed' }];
    expect(availableSlots(appointments, FUTURE_DATE, 60, salon, busyStaffId)).toEqual([]);
  });

  it('ignore les rendez-vous annulés lors du calcul des disponibilités', () => {
    const salon = salonWithHours({ open: '09:00', close: '10:00', closed: false });
    const busyStaffId = staff[0].id;
    const appointments = [{ staffId: busyStaffId, date: FUTURE_DATE, time: '09:00', duration: 60, status: 'cancelled' }];
    expect(availableSlots(appointments, FUTURE_DATE, 60, salon, busyStaffId)).toHaveLength(1);
  });
});
