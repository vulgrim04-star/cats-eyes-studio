import { describe, expect, it } from 'vitest';
import { availableSlots } from './booking';
import { formatDayLabel } from './date';

// Date lointaine et fixe pour ne jamais tomber sur "aujourd'hui" (qui filtre les créneaux passés).
const FUTURE_DATE = '2030-06-10';

function salonWithHours(hours) {
  const key = formatDayLabel(FUTURE_DATE).toLowerCase();
  return { hours: { [key]: hours } };
}

describe('availableSlots (praticienne indépendante)', () => {
  it('ne retourne aucun créneau quand le salon est fermé ce jour-là', () => {
    const salon = salonWithHours({ open: '09:00', close: '18:00', closed: true });
    expect(availableSlots([], FUTURE_DATE, 60, salon)).toEqual([]);
  });

  it("propose un créneau libre quand il n'y a aucun rendez-vous", () => {
    const salon = salonWithHours({ open: '09:00', close: '10:00', closed: false });
    const slots = availableSlots([], FUTURE_DATE, 60, salon);
    expect(slots).toHaveLength(1);
    expect(slots[0].time).toBe('09:00');
  });

  it('exclut un créneau déjà pris ce jour-là', () => {
    const salon = salonWithHours({ open: '09:00', close: '10:00', closed: false });
    const appointments = [{ date: FUTURE_DATE, time: '09:00', duration: 60, status: 'confirmed' }];
    expect(availableSlots(appointments, FUTURE_DATE, 60, salon)).toEqual([]);
  });

  it('ignore les rendez-vous annulés lors du calcul des disponibilités', () => {
    const salon = salonWithHours({ open: '09:00', close: '10:00', closed: false });
    const appointments = [{ date: FUTURE_DATE, time: '09:00', duration: 60, status: 'cancelled' }];
    expect(availableSlots(appointments, FUTURE_DATE, 60, salon)).toHaveLength(1);
  });
});
