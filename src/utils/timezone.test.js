import { describe, it, expect } from 'vitest';
import { detectTimeZone, isValidTimeZone, zonedDateTimeToUtc } from './timezone';

const iso = (d) => d.toISOString();

describe('zonedDateTimeToUtc — heure d’hiver / heure d’été', () => {
  // Europe/Zurich : UTC+1 en hiver, UTC+2 en été. C'est l'écart d'une heure entre ces deux
  // cas qui décalerait un rappel « 24h avant » deux fois par an.
  it('applique UTC+1 en hiver', () => {
    expect(iso(zonedDateTimeToUtc('2026-01-15', '14:00', 'Europe/Zurich'))).toBe('2026-01-15T13:00:00.000Z');
  });

  it('applique UTC+2 en été', () => {
    expect(iso(zonedDateTimeToUtc('2026-08-03', '14:00', 'Europe/Zurich'))).toBe('2026-08-03T12:00:00.000Z');
  });

  // Les deux bascules 2026 en Europe : 29 mars et 25 octobre, à 01:00 UTC.
  it('reste juste la veille et le lendemain du passage à l’heure d’été', () => {
    expect(iso(zonedDateTimeToUtc('2026-03-28', '14:00', 'Europe/Zurich'))).toBe('2026-03-28T13:00:00.000Z');
    expect(iso(zonedDateTimeToUtc('2026-03-30', '14:00', 'Europe/Zurich'))).toBe('2026-03-30T12:00:00.000Z');
  });

  it('reste juste de part et d’autre du retour à l’heure d’hiver', () => {
    expect(iso(zonedDateTimeToUtc('2026-10-24', '14:00', 'Europe/Zurich'))).toBe('2026-10-24T12:00:00.000Z');
    expect(iso(zonedDateTimeToUtc('2026-10-26', '14:00', 'Europe/Zurich'))).toBe('2026-10-26T13:00:00.000Z');
  });

  // Le jour même de la bascule, très tôt : c'est le cas que la première passe de correction
  // place du mauvais côté, et que la seconde rattrape.
  it('gère une heure matinale le jour même de la bascule', () => {
    expect(iso(zonedDateTimeToUtc('2026-03-29', '09:00', 'Europe/Zurich'))).toBe('2026-03-29T07:00:00.000Z');
    expect(iso(zonedDateTimeToUtc('2026-10-25', '09:00', 'Europe/Zurich'))).toBe('2026-10-25T08:00:00.000Z');
  });
});

describe('zonedDateTimeToUtc — autres fuseaux', () => {
  it('gère un fuseau à l’ouest', () => {
    // New York : UTC-4 en été.
    expect(iso(zonedDateTimeToUtc('2026-08-03', '14:00', 'America/New_York'))).toBe('2026-08-03T18:00:00.000Z');
  });

  it('gère un décalage non entier', () => {
    // Kolkata : UTC+5:30, sans heure d'été.
    expect(iso(zonedDateTimeToUtc('2026-08-03', '14:00', 'Asia/Kolkata'))).toBe('2026-08-03T08:30:00.000Z');
  });

  it('gère un fuseau sans décalage', () => {
    expect(iso(zonedDateTimeToUtc('2026-01-15', '14:00', 'UTC'))).toBe('2026-01-15T14:00:00.000Z');
  });

  it('traverse correctement minuit', () => {
    expect(iso(zonedDateTimeToUtc('2026-08-03', '00:30', 'Europe/Zurich'))).toBe('2026-08-02T22:30:00.000Z');
  });
});

describe('zonedDateTimeToUtc — entrées inexploitables', () => {
  it.each([
    ['date au mauvais format', '03/08/2026', '14:00'],
    ['date absente', undefined, '14:00'],
    ['heure absente', '2026-08-03', undefined],
    ['heure vide', '2026-08-03', ''],
    ['heure hors bornes', '2026-08-03', '25:00'],
    ['minutes hors bornes', '2026-08-03', '14:99'],
  ])('renvoie null — %s', (_label, date, time) => {
    expect(zonedDateTimeToUtc(date, time, 'Europe/Zurich')).toBeNull();
  });

  // Un fuseau mal saisi ne doit pas faire échouer tout un balayage de rappels : on retombe
  // sur le fuseau par défaut plutôt que de lever.
  it('retombe sur le fuseau par défaut si celui fourni est invalide', () => {
    expect(iso(zonedDateTimeToUtc('2026-01-15', '14:00', 'Mars/Olympus_Mons'))).toBe('2026-01-15T13:00:00.000Z');
    expect(iso(zonedDateTimeToUtc('2026-01-15', '14:00', undefined))).toBe('2026-01-15T13:00:00.000Z');
  });
});

describe('isValidTimeZone / detectTimeZone', () => {
  it('reconnaît un fuseau IANA', () => {
    expect(isValidTimeZone('Europe/Zurich')).toBe(true);
    expect(isValidTimeZone('UTC')).toBe(true);
  });

  it.each([['inventé', 'Mars/Olympus_Mons'], ['vide', ''], ['absent', undefined], ['non textuel', 42]])(
    'rejette un fuseau %s',
    (_label, value) => {
      expect(isValidTimeZone(value)).toBe(false);
    }
  );

  it('détecte un fuseau utilisable', () => {
    expect(isValidTimeZone(detectTimeZone())).toBe(true);
  });
});
