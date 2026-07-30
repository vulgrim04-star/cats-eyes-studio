import { describe, it, expect } from 'vitest';
import { dueReminders } from './reminders';

// Salon en Suisse, en été : UTC+2. Un rendez-vous à 14h00 commence donc à 12h00 UTC.
const settings = (notifications = { reminder24h: true, reminder2h: true }) => ({
  salon: { timezone: 'Europe/Zurich' },
  notifications,
});

const CLIENTS = [
  { id: 'cli_1', firstName: 'Léa', lastName: 'Martin', email: 'lea@example.com' },
  { id: 'cli_2', firstName: 'Sans', lastName: 'Adresse', email: '' },
];

const apt = (patch = {}) => ({
  id: 'apt_1',
  clientId: 'cli_1',
  date: '2026-08-03',
  time: '14:00',
  duration: 90,
  status: 'confirmed',
  ...patch,
});

const at = (iso) => new Date(iso);
const kinds = (result) => result.map((r) => r.kind);

describe('dueReminders — échéances', () => {
  it('déclenche le rappel 24h à l’heure dite, et lui seul', () => {
    const result = dueReminders({ appointments: [apt()], clients: CLIENTS, settings: settings(), now: at('2026-08-02T12:00:00Z') });
    expect(kinds(result)).toEqual(['24h']);
  });

  it('déclenche le rappel 2h à l’heure dite', () => {
    const result = dueReminders({ appointments: [apt()], clients: CLIENTS, settings: settings(), now: at('2026-08-03T10:00:00Z') });
    expect(kinds(result)).toEqual(['2h']);
  });

  it('n’envoie rien avant l’échéance', () => {
    // Une minute trop tôt pour le rappel de 24h.
    expect(dueReminders({ appointments: [apt()], clients: CLIENTS, settings: settings(), now: at('2026-08-02T11:59:00Z') })).toEqual([]);
  });

  // Un rappel arrivé après le début fait douter la cliente de l'heure qu'elle avait notée :
  // c'est pire que pas de rappel.
  it('n’envoie plus rien une fois le rendez-vous commencé', () => {
    expect(dueReminders({ appointments: [apt()], clients: CLIENTS, settings: settings(), now: at('2026-08-03T12:00:00Z') })).toEqual([]);
    expect(dueReminders({ appointments: [apt()], clients: CLIENTS, settings: settings(), now: at('2026-08-03T15:00:00Z') })).toEqual([]);
  });
});

describe('dueReminders — rattrapage', () => {
  // Le cas qui justifie toute la fenêtre : l'ordonnanceur n'a pas tourné pendant des heures.
  // Un rappel sauté ne se rattrape jamais, contrairement à un rappel un peu tardif.
  it('rattrape un rappel 24h manqué de plusieurs heures', () => {
    const result = dueReminders({ appointments: [apt()], clients: CLIENTS, settings: settings(), now: at('2026-08-02T17:00:00Z') });
    expect(kinds(result)).toEqual(['24h']);
  });

  it('abandonne un rappel 24h manqué au-delà de la fenêtre de rattrapage', () => {
    // 6h de fenêtre : à +7h l'échéance de 24h est périmée, seule reste l'attente du rappel 2h.
    const result = dueReminders({ appointments: [apt()], clients: CLIENTS, settings: settings(), now: at('2026-08-02T19:00:00Z') });
    expect(result).toEqual([]);
  });

  it('après une longue interruption, envoie le rappel encore utile et abandonne le périmé', () => {
    // Reprise à 10h05 UTC la veille au soir passée : l'échéance 2h vient d'arriver et part,
    // celle de 24h (due 22h plus tôt) est périmée depuis longtemps et reste au placard.
    const result = dueReminders({ appointments: [apt()], clients: CLIENTS, settings: settings(), now: at('2026-08-03T10:05:00Z') });
    expect(kinds(result)).toEqual(['2h']);
  });
});

describe('dueReminders — statuts', () => {
  // `pending` est l'état par défaut de tout rendez-vous créé, y compris via une demande en
  // ligne acceptée : l'exclure priverait de rappel la majorité des rendez-vous réels.
  it.each([
    ['confirmed', true],
    ['pending', true],
    ['cancelled', false],
    ['completed', false],
    ['no-show', false],
  ])('statut %s → rappel %s', (status, expected) => {
    const result = dueReminders({
      appointments: [apt({ status })],
      clients: CLIENTS,
      settings: settings(),
      now: at('2026-08-02T12:00:00Z'),
    });
    expect(result.length > 0).toBe(expected);
  });
});

describe('dueReminders — préférences', () => {
  it('respecte une bascule désactivée', () => {
    const only24 = dueReminders({
      appointments: [apt()],
      clients: CLIENTS,
      settings: settings({ reminder24h: true, reminder2h: false }),
      now: at('2026-08-03T10:00:00Z'),
    });
    expect(only24).toEqual([]);
  });

  it('n’envoie rien quand les deux bascules sont éteintes', () => {
    const result = dueReminders({
      appointments: [apt()],
      clients: CLIENTS,
      settings: settings({ reminder24h: false, reminder2h: false }),
      now: at('2026-08-02T12:00:00Z'),
    });
    expect(result).toEqual([]);
  });

  it('n’envoie rien sans paramètres du tout', () => {
    expect(dueReminders({ appointments: [apt()], clients: CLIENTS, settings: null, now: at('2026-08-02T12:00:00Z') })).toEqual([]);
  });
});

describe('dueReminders — destinataire', () => {
  it('ignore en silence une cliente sans adresse e-mail', () => {
    const result = dueReminders({
      appointments: [apt({ clientId: 'cli_2' })],
      clients: CLIENTS,
      settings: settings(),
      now: at('2026-08-02T12:00:00Z'),
    });
    expect(result).toEqual([]);
  });

  it('ignore un rendez-vous dont la fiche cliente n’existe plus', () => {
    const result = dueReminders({
      appointments: [apt({ clientId: 'cli_supprimee' })],
      clients: CLIENTS,
      settings: settings(),
      now: at('2026-08-02T12:00:00Z'),
    });
    expect(result).toEqual([]);
  });

  it('joint la fiche cliente au rappel, pour que l’appelant n’ait pas à la rechercher', () => {
    const [reminder] = dueReminders({ appointments: [apt()], clients: CLIENTS, settings: settings(), now: at('2026-08-02T12:00:00Z') });
    expect(reminder.client.email).toBe('lea@example.com');
    expect(reminder.appointmentId).toBe('apt_1');
    expect(reminder.startsAt.toISOString()).toBe('2026-08-03T12:00:00.000Z');
  });
});

describe('dueReminders — fuseau horaire', () => {
  // Sans conversion, « 14h » serait lu comme 14h UTC et le rappel partirait deux heures trop
  // tard en été — l'erreur exacte que le fuseau du salon sert à éviter.
  it('décale l’échéance selon le fuseau du salon', () => {
    const paris = dueReminders({ appointments: [apt()], clients: CLIENTS, settings: settings(), now: at('2026-08-02T12:00:00Z') });
    expect(kinds(paris)).toEqual(['24h']);

    const utc = dueReminders({
      appointments: [apt()],
      clients: CLIENTS,
      settings: { salon: { timezone: 'UTC' }, notifications: { reminder24h: true, reminder2h: true } },
      now: at('2026-08-02T12:00:00Z'),
    });
    expect(utc).toEqual([]); // À 14h UTC, l'échéance de 24h n'est qu'à 14h00, pas 12h00.
  });

  it('tient compte de l’heure d’hiver', () => {
    const winter = dueReminders({
      appointments: [apt({ date: '2026-01-15' })],
      clients: CLIENTS,
      settings: settings(),
      now: at('2026-01-14T13:00:00Z'), // UTC+1 : 14h locale = 13h UTC
    });
    expect(kinds(winter)).toEqual(['24h']);
  });
});

describe('dueReminders — robustesse', () => {
  it.each([
    ['sans identifiant', { id: undefined }],
    ['avec une date invalide', { date: '03/08/2026' }],
    ['sans heure', { time: undefined }],
  ])('écarte un rendez-vous %s', (_label, patch) => {
    const result = dueReminders({
      appointments: [apt(patch)],
      clients: CLIENTS,
      settings: settings(),
      now: at('2026-08-02T12:00:00Z'),
    });
    expect(result).toEqual([]);
  });

  it('accepte des listes absentes sans lever', () => {
    expect(() => dueReminders()).not.toThrow();
    expect(dueReminders({ appointments: null, clients: null, settings: settings() })).toEqual([]);
  });

  it('classe les rappels du rendez-vous le plus proche au plus lointain', () => {
    // Échéances à 12h00 et 15h00 UTC ; à 15h30 les deux sont dues et encore dans la fenêtre
    // de rattrapage. C'est la seule configuration où l'ordre est observable.
    const result = dueReminders({
      appointments: [apt({ id: 'apt_tard', time: '17:00' }), apt({ id: 'apt_tot', time: '14:00' })],
      clients: CLIENTS,
      settings: settings({ reminder24h: true, reminder2h: false }),
      now: at('2026-08-02T15:30:00Z'),
    });
    expect(result.map((r) => r.appointmentId)).toEqual(['apt_tot', 'apt_tard']);
  });
});
