import { describe, expect, it } from 'vitest';
import { formatVersionLabel, readVersionPayload, shouldOfferUpdate } from './appVersion';

describe('shouldOfferUpdate', () => {
  it('propose la mise à jour quand la version servie diffère de celle chargée', () => {
    expect(shouldOfferUpdate('2ebae5a', 'b90e81a')).toBe(true);
  });

  it('ne propose rien quand c’est la même version', () => {
    expect(shouldOfferUpdate('2ebae5a', '2ebae5a')).toBe(false);
    expect(shouldOfferUpdate('2ebae5a', ' 2ebae5a ')).toBe(false);
  });

  // Le cas qui compte sur un téléphone : une requête qui échoue ne doit pas inviter à
  // recharger, puisque c'est justement le moment où le rechargement ne peut pas aboutir.
  it('ne propose rien quand la version servie est inconnue ou illisible', () => {
    expect(shouldOfferUpdate('2ebae5a', null)).toBe(false);
    expect(shouldOfferUpdate('2ebae5a', undefined)).toBe(false);
    expect(shouldOfferUpdate('2ebae5a', '')).toBe(false);
    expect(shouldOfferUpdate('2ebae5a', '   ')).toBe(false);
    expect(shouldOfferUpdate('2ebae5a', 42)).toBe(false);
  });

  it('ne propose rien en développement, d’un côté comme de l’autre', () => {
    expect(shouldOfferUpdate('dev', 'b90e81a')).toBe(false);
    expect(shouldOfferUpdate('2ebae5a', 'dev')).toBe(false);
  });

  it('ne propose rien si la version chargée est inexploitable', () => {
    expect(shouldOfferUpdate('', 'b90e81a')).toBe(false);
    expect(shouldOfferUpdate(null, 'b90e81a')).toBe(false);
  });
});

describe('readVersionPayload', () => {
  it('lit la version d’une réponse conforme', () => {
    expect(readVersionPayload({ version: 'b90e81a', builtAt: 'x' })).toBe('b90e81a');
    expect(readVersionPayload({ version: '  b90e81a  ' })).toBe('b90e81a');
  });

  // La réécriture catch-all renvoie index.html sur toute adresse inconnue : si le fichier
  // de version manquait, on récupérerait du HTML. Mieux vaut « je ne sais pas ».
  it('renvoie null sur tout ce qui n’est pas une version', () => {
    expect(readVersionPayload(null)).toBeNull();
    expect(readVersionPayload({})).toBeNull();
    expect(readVersionPayload({ version: '' })).toBeNull();
    expect(readVersionPayload({ version: 123 })).toBeNull();
    expect(readVersionPayload('<!doctype html>')).toBeNull();
  });
});

describe('formatVersionLabel', () => {
  it('accole la version et la date de construction', () => {
    const label = formatVersionLabel('2ebae5a', '2026-07-30T09:12:00.000Z');
    expect(label.startsWith('2ebae5a · ')).toBe(true);
    expect(label).toMatch(/\d/);
  });

  it('se contente de la version quand la date est absente ou illisible', () => {
    expect(formatVersionLabel('2ebae5a', '')).toBe('2ebae5a');
    expect(formatVersionLabel('2ebae5a', 'pas-une-date')).toBe('2ebae5a');
  });
});
