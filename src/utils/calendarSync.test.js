import { describe, it, expect } from 'vitest';
import {
  APPLE,
  GOOGLE,
  OTHER,
  calendarFeedUrl,
  detectCalendarTarget,
  googleSubscribeUrl,
  webcalUrl,
} from './calendarSync';

const FEED = { origin: 'https://cats-eyes.example', ownerId: 'owner-1', token: 'tok-abc' };

describe('calendarFeedUrl', () => {
  it('compose l’adresse du flux servi par api/ics', () => {
    expect(calendarFeedUrl(FEED)).toBe('https://cats-eyes.example/api/ics?u=owner-1&t=tok-abc');
  });

  it('ne double pas la barre oblique quand l’origine en porte déjà une', () => {
    expect(calendarFeedUrl({ ...FEED, origin: 'https://cats-eyes.example/' })).toBe(
      'https://cats-eyes.example/api/ics?u=owner-1&t=tok-abc'
    );
  });

  it('échappe les valeurs plutôt que de produire une adresse cassée', () => {
    expect(calendarFeedUrl({ ...FEED, token: 'a b&c' })).toContain('t=a%20b%26c');
  });

  it.each([
    ['sans origine', { origin: '' }],
    ['sans compte', { ownerId: undefined }],
    ['sans jeton', { token: '' }],
  ])('ne renvoie rien %s — mieux vaut aucun lien qu’un lien qui refusera', (_label, patch) => {
    expect(calendarFeedUrl({ ...FEED, ...patch })).toBe('');
  });

  it('ne renvoie rien quand on ne lui passe rien', () => {
    expect(calendarFeedUrl()).toBe('');
  });
});

describe('webcalUrl', () => {
  // Le schéma décide de la nature de l'opération : en https, iOS télécharge un fichier figé ;
  // en webcal, il crée un abonnement qui se met à jour. C'est toute la différence entre
  // l'export manuel et la synchronisation.
  it('remplace le schéma https par webcal', () => {
    expect(webcalUrl('https://cats-eyes.example/api/ics?u=1&t=2')).toBe('webcal://cats-eyes.example/api/ics?u=1&t=2');
  });

  it('remplace aussi http, sans toucher au reste de l’adresse', () => {
    expect(webcalUrl('http://localhost:5173/api/ics?u=1&t=2')).toBe('webcal://localhost:5173/api/ics?u=1&t=2');
  });

  it('ne remplace que le schéma, pas une occurrence dans la requête', () => {
    expect(webcalUrl('https://x.example/api/ics?u=https://y')).toBe('webcal://x.example/api/ics?u=https://y');
  });

  it('accepte une adresse vide', () => {
    expect(webcalUrl('')).toBe('');
  });
});

describe('googleSubscribeUrl', () => {
  it('passe le flux en webcal encodé, la forme que Google traite comme un abonnement', () => {
    expect(googleSubscribeUrl(calendarFeedUrl(FEED))).toBe(
      'https://calendar.google.com/calendar/r?cid=webcal%3A%2F%2Fcats-eyes.example%2Fapi%2Fics%3Fu%3Downer-1%26t%3Dtok-abc'
    );
  });

  it('accepte une adresse vide', () => {
    expect(googleSubscribeUrl('')).toBe('');
  });
});

describe('detectCalendarTarget', () => {
  it.each([
    ['iPhone', 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15', APPLE],
    ['iPad moderne, qui s’annonce comme un Mac', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15', APPLE],
    ['Mac', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Chrome/126.0', APPLE],
    ['Android', 'Mozilla/5.0 (Linux; Android 14; Pixel 8) Chrome/126.0', GOOGLE],
    ['ChromeOS', 'Mozilla/5.0 (X11; CrOS x86_64 14541.0.0) Chrome/126.0', GOOGLE],
    ['Windows', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/126.0', OTHER],
  ])('reconnaît %s', (_label, userAgent, expected) => {
    expect(detectCalendarTarget(userAgent)).toBe(expected);
  });

  it('ne suppose rien quand le navigateur ne dit rien', () => {
    expect(detectCalendarTarget()).toBe(OTHER);
    expect(detectCalendarTarget('')).toBe(OTHER);
  });
});
