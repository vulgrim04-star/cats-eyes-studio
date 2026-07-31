import { describe, expect, it } from 'vitest';
import {
  DEFAULT_REFERENTIALS,
  moveValue,
  normalizeList,
  normalizeReferentials,
  withCurrentValue,
} from './referentials';

describe('normalizeList', () => {
  it('nettoie les espaces superflus', () => {
    expect(normalizeList(['  Bon ', 'Abîmé'], 'lashConditions')).toEqual(['Bon', 'Abîmé']);
  });

  it('écarte les entrées vides', () => {
    expect(normalizeList(['Bon', '', '   ', null, undefined], 'lashConditions')).toEqual(['Bon']);
  });

  // Deux entrées qui ne diffèrent que par la casse sont la même chose pour une praticienne :
  // les garder toutes les deux dans un menu ne ferait que semer le doute au moment de choisir.
  it('écarte les doublons, casse et accents de saisie compris', () => {
    expect(normalizeList(['Bon', 'bon', 'BON'], 'lashConditions')).toEqual(['Bon']);
  });

  it('conserve l’ordre voulu', () => {
    expect(normalizeList(['Longs', 'Courts', 'Moyens'], 'naturalLengths')).toEqual(['Longs', 'Courts', 'Moyens']);
  });

  // Un menu déroulant sans la moindre option ne rend pas le champ libre : il le rend
  // inutilisable. Mieux vaut revenir aux valeurs par défaut.
  it('retombe sur les valeurs par défaut quand la liste est vidée', () => {
    expect(normalizeList([], 'lashConditions')).toEqual(DEFAULT_REFERENTIALS.lashConditions);
    expect(normalizeList(['', '  '], 'naturalLengths')).toEqual(DEFAULT_REFERENTIALS.naturalLengths);
    expect(normalizeList(null, 'lashTypes')).toEqual(DEFAULT_REFERENTIALS.lashTypes);
    expect(normalizeList('Bon', 'lashConditions')).toEqual(DEFAULT_REFERENTIALS.lashConditions);
  });

  it('ne renvoie pas la liste par défaut elle-même, pour qu’une modification ne la corrompe pas', () => {
    const list = normalizeList([], 'lashConditions');
    list.push('Ajouté par erreur');
    expect(DEFAULT_REFERENTIALS.lashConditions).not.toContain('Ajouté par erreur');
  });
});

describe('normalizeReferentials', () => {
  it('complète les listes absentes', () => {
    expect(normalizeReferentials({ lashConditions: ['Super'] })).toEqual({
      lashTypes: DEFAULT_REFERENTIALS.lashTypes,
      lashConditions: ['Super'],
      naturalLengths: DEFAULT_REFERENTIALS.naturalLengths,
    });
  });

  it('résiste à un état enregistré absent ou corrompu', () => {
    expect(normalizeReferentials(undefined)).toEqual(DEFAULT_REFERENTIALS);
    expect(normalizeReferentials({ lashTypes: 42 })).toEqual(DEFAULT_REFERENTIALS);
  });
});

describe('withCurrentValue', () => {
  // La garantie qui compte : retirer une valeur des réglages ne doit pas faire disparaître
  // ce qui est déjà enregistré sur une fiche cliente.
  it('réintègre une valeur retirée de la liste mais encore portée par une fiche', () => {
    expect(withCurrentValue(['Bon', 'Normal'], 'Fragilisé')).toEqual(['Bon', 'Normal', 'Fragilisé']);
  });

  it('n’ajoute rien quand la valeur est déjà dans la liste', () => {
    expect(withCurrentValue(['Bon', 'Normal'], 'Bon')).toEqual(['Bon', 'Normal']);
    expect(withCurrentValue(['Bon', 'Normal'], 'bon')).toEqual(['Bon', 'Normal']);
  });

  it('n’ajoute rien pour une fiche sans valeur', () => {
    expect(withCurrentValue(['Bon'], '')).toEqual(['Bon']);
    expect(withCurrentValue(['Bon'], null)).toEqual(['Bon']);
    expect(withCurrentValue(['Bon'], undefined)).toEqual(['Bon']);
  });

  it('résiste à une liste absente', () => {
    expect(withCurrentValue(null, 'Fragilisé')).toEqual(['Fragilisé']);
  });
});

describe('moveValue', () => {
  it('échange avec le voisin', () => {
    expect(moveValue(['A', 'B', 'C'], 1, -1)).toEqual(['B', 'A', 'C']);
    expect(moveValue(['A', 'B', 'C'], 1, 1)).toEqual(['A', 'C', 'B']);
  });

  it('ne fait rien aux extrémités', () => {
    expect(moveValue(['A', 'B'], 0, -1)).toEqual(['A', 'B']);
    expect(moveValue(['A', 'B'], 1, 1)).toEqual(['A', 'B']);
  });

  it('ne modifie pas la liste d’origine', () => {
    const list = ['A', 'B'];
    moveValue(list, 0, 1);
    expect(list).toEqual(['A', 'B']);
  });
});
