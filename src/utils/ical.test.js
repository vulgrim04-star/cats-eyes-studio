import { describe, it, expect } from 'vitest';
import { generateICS } from './ical';

const NOW = new Date('2026-07-30T09:15:30Z');

const apt = (patch = {}) => ({
  id: 'apt_1',
  date: '2026-08-03',
  time: '14:00',
  duration: 90,
  status: 'confirmed',
  client: { firstName: 'Léa', lastName: 'Martin' },
  service: { name: 'Volume russe' },
  ...patch,
});

/** Déplie les lignes de continuation pour pouvoir chercher une propriété entière. */
const unfold = (ics) => ics.replace(/\r\n /g, '');
const lines = (ics) => ics.split('\r\n');

describe('generateICS — enveloppe du calendrier', () => {
  it('nomme le calendrier, sans quoi Google l’affiche sous son URL brute', () => {
    const ics = generateICS([apt()], "Cat's Eyes", { now: NOW });
    expect(unfold(ics)).toContain("X-WR-CALNAME:Cat's Eyes");
  });

  it('retombe sur un nom neutre quand le salon n’a pas encore le sien', () => {
    const ics = generateICS([apt()], '   ', { now: NOW });
    expect(ics).toContain('X-WR-CALNAME:Rendez-vous');
  });

  it('annonce un intervalle de rafraîchissement aux calendriers abonnés', () => {
    const ics = generateICS([apt()], 'Salon', { now: NOW });
    expect(ics).toContain('REFRESH-INTERVAL;VALUE=DURATION:PT1H');
    expect(ics).toContain('X-PUBLISHED-TTL:PT1H');
    expect(ics).toContain('METHOD:PUBLISH');
  });

  it('sépare les lignes par CRLF et termine par un CRLF', () => {
    const ics = generateICS([apt()], 'Salon', { now: NOW });
    expect(ics.endsWith('END:VCALENDAR\r\n')).toBe(true);
    expect(ics).not.toMatch(/[^\r]\n/);
  });
});

describe('generateICS — événements', () => {
  it('écrit des heures flottantes (ni Z ni TZID) pour rester à l’heure du salon', () => {
    const ics = generateICS([apt()], 'Salon', { now: NOW });
    expect(ics).toContain('DTSTART:20260803T140000');
    expect(ics).toContain('DTEND:20260803T153000');
  });

  it('fait finir le lendemain un rendez-vous qui passe minuit', () => {
    const ics = generateICS([apt({ time: '23:30', duration: 90 })], 'Salon', { now: NOW });
    expect(ics).toContain('DTSTART:20260803T233000');
    expect(ics).toContain('DTEND:20260804T010000');
  });

  it('marque une demande non validée comme provisoire', () => {
    expect(generateICS([apt({ status: 'pending' })], 'Salon', { now: NOW })).toContain('STATUS:TENTATIVE');
    expect(generateICS([apt()], 'Salon', { now: NOW })).toContain('STATUS:CONFIRMED');
  });

  it('reporte l’adresse du salon sur chaque événement', () => {
    const ics = generateICS([apt()], 'Salon', { location: '3 rue du Lac, Genève', now: NOW });
    expect(unfold(ics)).toContain('LOCATION:3 rue du Lac\\, Genève');
  });

  it('retient une durée par défaut plutôt que de produire une durée absurde', () => {
    const ics = generateICS([apt({ duration: undefined })], 'Salon', { now: NOW });
    expect(ics).toContain('DTEND:20260803T150000');
  });

  it('nomme « Cliente » une fiche sans nom, jamais « undefined »', () => {
    const ics = generateICS([apt({ client: null })], 'Salon', { now: NOW });
    expect(ics).toContain('SUMMARY:Cliente — Volume russe');
    expect(ics).not.toContain('undefined');
  });
});

describe('generateICS — robustesse', () => {
  // La régression la plus coûteuse : un flux abonné qui contient une seule date invalide
  // n'est pas « un flux avec un trou », Google Agenda le rejette en entier. Un rendez-vous
  // à moitié saisi faisait donc disparaître tout l'agenda synchronisé, sans message nulle part.
  it('écarte le rendez-vous illisible et garde les autres', () => {
    const ics = generateICS([apt({ id: 'apt_bad', time: undefined }), apt()], 'Salon', { now: NOW });
    expect(ics).not.toContain('NaN');
    expect(ics.match(/BEGIN:VEVENT/g)).toHaveLength(1);
    expect(ics).toContain('UID:apt_1@cats-eyes-studio');
  });

  it.each([
    ['sans identifiant', { id: undefined }],
    ['avec une date au mauvais format', { date: '03/08/2026' }],
    ['avec une heure vide', { time: '' }],
  ])('écarte un rendez-vous %s', (_label, patch) => {
    const ics = generateICS([apt(patch)], 'Salon', { now: NOW });
    expect(ics).not.toContain('BEGIN:VEVENT');
  });

  it('accepte une liste absente sans lever', () => {
    expect(() => generateICS(undefined, 'Salon', { now: NOW })).not.toThrow();
    expect(generateICS(null, 'Salon', { now: NOW })).toContain('END:VCALENDAR');
  });
});

describe('generateICS — conformité RFC 5545', () => {
  it('replie les lignes au-delà de 75 octets, sans couper un caractère accentué', () => {
    const ics = generateICS(
      [apt({ service: { name: 'Extension de cils volume russe éphémère très longue durée' } })],
      'Salon',
      { now: NOW }
    );

    const encoder = new TextEncoder();
    for (const line of lines(ics)) {
      expect(encoder.encode(line).length).toBeLessThanOrEqual(75);
    }
    // Le contenu doit survivre au dépliage : c'est tout l'intérêt du repliage.
    expect(unfold(ics)).toContain('SUMMARY:Léa Martin — Extension de cils volume russe éphémère très longue durée');
  });

  it('échappe les caractères réservés au lieu de casser la ligne', () => {
    const ics = generateICS([apt({ notes: 'Allergie ; colle sensible, à noter' })], 'Salon', { now: NOW });
    expect(unfold(ics)).toContain('Allergie \\; colle sensible\\, à noter');
  });

  it('transforme un retour à la ligne des notes en \\n littéral', () => {
    const ics = generateICS([apt({ notes: 'Première ligne\nSeconde ligne' })], 'Salon', { now: NOW });
    expect(unfold(ics)).toContain('Première ligne\\nSeconde ligne');
    // Une note multiligne ne doit produire aucune ligne surnuméraire dans le flux.
    expect(lines(ics).filter((l) => l.startsWith('Seconde'))).toHaveLength(0);
  });
});
