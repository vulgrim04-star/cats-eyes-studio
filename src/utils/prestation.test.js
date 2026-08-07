import { describe, expect, it } from 'vitest';
import {
  PRESTATIONS,
  PRESTATION_IDS,
  availablePrestations,
  lastPrestation,
  normalizePrestation,
  prestationById,
  shouldOfferChoice,
  studiosFor,
} from './prestation';

const TOUT = { lash: true, brow: true };
const CILS_SEULS = { lash: true, brow: false };
const SOURCILS_SEULS = { lash: false, brow: true };

const ids = (list) => list.map((p) => p.id);

describe('availablePrestations', () => {
  it('propose les trois quand le salon fait tout', () => {
    expect(ids(availablePrestations(TOUT))).toEqual(['lash', 'brow', 'both']);
  });

  // « Les deux » promettrait un onglet sourcils qui n'apparaîtrait jamais.
  it('retire « les deux » dès qu’un studio est éteint', () => {
    expect(ids(availablePrestations(CILS_SEULS))).toEqual(['lash']);
    expect(ids(availablePrestations(SOURCILS_SEULS))).toEqual(['brow']);
  });

});

describe('shouldOfferChoice', () => {
  it('offre le choix quand il y en a un', () => {
    expect(shouldOfferChoice(TOUT)).toBe(true);
  });

  // Un choix qui n'en est pas un est de l'encombrement, pas un réglage.
  it('ne l’offre pas quand une seule prestation reste possible', () => {
    expect(shouldOfferChoice(CILS_SEULS)).toBe(false);
    expect(shouldOfferChoice(SOURCILS_SEULS)).toBe(false);
  });
});

describe('normalizePrestation', () => {
  it('garde une prestation valide', () => {
    expect(normalizePrestation('both', TOUT)).toBe('both');
    expect(normalizePrestation('brow', TOUT)).toBe('brow');
  });

  it('retombe sur la première disponible si la valeur est absente ou inconnue', () => {
    expect(normalizePrestation(undefined, TOUT)).toBe('lash');
    expect(normalizePrestation('maquillage', TOUT)).toBe('lash');
    expect(normalizePrestation(null, SOURCILS_SEULS)).toBe('brow');
  });

  // Le cas qui casse en production : une séance enregistrée « les deux », puis le salon
  // désactive le sourcil dans ses Réglages. La séance ne doit pas rouvrir sur un onglet
  // qui n'existe plus.
  it('rattrape une prestation devenue impossible depuis les Réglages', () => {
    expect(normalizePrestation('both', CILS_SEULS)).toBe('lash');
    expect(normalizePrestation('lash', SOURCILS_SEULS)).toBe('brow');
  });

  // `normalizeModules` rallume tout devant un réglage qui éteindrait tout : la liste des
  // prestations disponibles n'est donc jamais vide, et ce cas ne doit pas jeter.
  it('survit à un réglage qui éteint tout', () => {
    expect(PRESTATION_IDS).toContain(normalizePrestation('both', { lash: false, brow: false }));
  });
});

describe('studiosFor', () => {
  it('déduit les onglets de la prestation', () => {
    expect(studiosFor('lash', TOUT)).toEqual(['lash']);
    expect(studiosFor('brow', TOUT)).toEqual(['brow']);
    expect(studiosFor('both', TOUT)).toEqual(['lash', 'brow']);
  });

  it('ne rend jamais un studio que les Réglages ont éteint', () => {
    expect(studiosFor('both', CILS_SEULS)).toEqual(['lash']);
    expect(studiosFor('both', SOURCILS_SEULS)).toEqual(['brow']);
  });
});

describe('lastPrestation', () => {
  it('reprend la prestation de la séance la plus récente', () => {
    const seances = [
      { date: '2026-01-10', prestation: 'lash' },
      { date: '2026-03-02', prestation: 'both' },
      { date: '2025-12-01', prestation: 'brow' },
    ];
    expect(lastPrestation(seances, TOUT)).toBe('both');
  });

  it('ignore les séances antérieures au champ', () => {
    const seances = [{ date: '2026-03-02' }, { date: '2026-01-10', prestation: 'brow' }];
    expect(lastPrestation(seances, TOUT)).toBe('brow');
  });

  it('retombe sur le repli sans historique exploitable', () => {
    expect(lastPrestation([], TOUT)).toBe('lash');
    expect(lastPrestation(undefined, TOUT)).toBe('lash');
    expect(lastPrestation([{ date: '2026-01-10', prestation: 'both' }], SOURCILS_SEULS)).toBe('brow');
  });
});

describe('prestationById', () => {
  it('rend la prestation demandée, et un repli sûr sinon', () => {
    expect(prestationById('brow').label).toBe('Sourcils');
    expect(prestationById('inconnue')).toBe(PRESTATIONS[0]);
  });
});
