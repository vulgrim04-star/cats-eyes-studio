import { describe, expect, it } from 'vitest';
import {
  collectedTotal,
  extrasOf,
  extrasTotal,
  hasExtras,
  normalizeExtras,
  serviceRevenue,
  tipOf,
} from './billing';

describe('rendez-vous déjà enregistrés', () => {
  // Aucun rendez-vous existant n'a de champ `extras` ni `tip`. Les trois notions doivent
  // donc retomber exactement sur `price`, sans quoi tous les chiffres passés changeraient
  // au premier déploiement.
  it('valent exactement le prix quand il n’y a ni supplément ni pourboire', () => {
    const apt = { id: 'a', price: 65 };
    expect(serviceRevenue(apt)).toBe(65);
    expect(collectedTotal(apt)).toBe(65);
    expect(tipOf(apt)).toBe(0);
    expect(extrasTotal(apt)).toBe(0);
    expect(extrasOf(apt)).toEqual([]);
  });

  it('résistent à un rendez-vous absent ou sans prix', () => {
    expect(serviceRevenue(undefined)).toBe(0);
    expect(collectedTotal(null)).toBe(0);
    expect(serviceRevenue({})).toBe(0);
  });
});

describe('serviceRevenue', () => {
  it('ajoute les suppléments au tarif prévu', () => {
    const apt = { price: 65, extras: [{ label: 'Pose de 4 cils', amount: 10 }] };
    expect(serviceRevenue(apt)).toBe(75);
  });

  // La règle métier centrale : c'est elle qui rend la facture juste, puisque la TVA se
  // calcule sur cette assiette.
  it('n’inclut JAMAIS le pourboire', () => {
    const apt = { price: 65, tip: 15 };
    expect(serviceRevenue(apt)).toBe(65);
    expect(collectedTotal(apt)).toBe(80);
  });

  it('cumule plusieurs suppléments', () => {
    const apt = { price: 50, extras: [{ label: 'A', amount: 10 }, { label: 'B', amount: 5.5 }] };
    expect(serviceRevenue(apt)).toBe(65.5);
  });
});

describe('collectedTotal', () => {
  it('additionne prestation, suppléments et pourboire', () => {
    const apt = { price: 65, extras: [{ label: 'Retouche', amount: 10 }], tip: 5 };
    expect(collectedTotal(apt)).toBe(80);
    expect(serviceRevenue(apt)).toBe(75);
    expect(tipOf(apt)).toBe(5);
  });
});

describe('normalizeExtras', () => {
  it('écarte les lignes sans montant exploitable', () => {
    expect(normalizeExtras([
      { label: 'Vide', amount: '' },
      { label: 'Texte', amount: 'abc' },
      { label: 'Zéro', amount: 0 },
      { label: 'Bon', amount: 12 },
    ])).toEqual([{ label: 'Bon', amount: 12 }]);
  });

  // Un montant négatif saisi par erreur ferait baisser le chiffre d'affaires sans que rien
  // ne le signale : on l'écarte plutôt que de le propager.
  it('écarte un montant négatif', () => {
    expect(normalizeExtras([{ label: 'Remise', amount: -20 }])).toEqual([]);
  });

  it('accepte un montant saisi sous forme de texte', () => {
    expect(normalizeExtras([{ label: 'Pose', amount: '12.5' }])).toEqual([{ label: 'Pose', amount: 12.5 }]);
  });

  it('donne un libellé de repli plutôt qu’une ligne anonyme sur la facture', () => {
    expect(normalizeExtras([{ label: '   ', amount: 8 }])).toEqual([{ label: 'Supplément', amount: 8 }]);
    expect(normalizeExtras([{ amount: 8 }])).toEqual([{ label: 'Supplément', amount: 8 }]);
  });

  it('résiste à une valeur qui n’est pas une liste', () => {
    expect(normalizeExtras(null)).toEqual([]);
    expect(normalizeExtras('supplément')).toEqual([]);
    expect(normalizeExtras([null, undefined])).toEqual([]);
  });
});

describe('tipOf', () => {
  it('ignore un pourboire illisible ou négatif', () => {
    expect(tipOf({ tip: 'beaucoup' })).toBe(0);
    expect(tipOf({ tip: -5 })).toBe(0);
    expect(tipOf({ tip: '7.5' })).toBe(7.5);
  });
});

describe('hasExtras', () => {
  it('ne signale que des suppléments réels', () => {
    expect(hasExtras({ price: 50 })).toBe(false);
    expect(hasExtras({ price: 50, extras: [{ label: 'x', amount: 0 }] })).toBe(false);
    expect(hasExtras({ price: 50, extras: [{ label: 'x', amount: 5 }] })).toBe(true);
  });
});
