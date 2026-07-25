import { describe, expect, it, vi, afterEach } from 'vitest';
import { newUuid } from './id';

const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('newUuid', () => {
  it('produit un UUID v4 valide et distinct à chaque appel', () => {
    expect(newUuid()).toMatch(UUID_V4);
    expect(newUuid()).not.toBe(newUuid());
  });

  // Sur http://192.168.x.x — le cas quand on teste l'application depuis son téléphone sur
  // le réseau local — `randomUUID` n'existe pas : l'appel direct levait une TypeError et
  // rendait l'onglet Photos inutilisable.
  it('fonctionne sans crypto.randomUUID, hors contexte sécurisé', () => {
    vi.stubGlobal('crypto', { getRandomValues: globalThis.crypto.getRandomValues.bind(globalThis.crypto) });
    expect(newUuid()).toMatch(UUID_V4);
  });

  it('reste utilisable même sans Web Crypto du tout', () => {
    vi.stubGlobal('crypto', {});
    expect(typeof newUuid()).toBe('string');
    expect(newUuid().length).toBeGreaterThan(8);
  });
});
