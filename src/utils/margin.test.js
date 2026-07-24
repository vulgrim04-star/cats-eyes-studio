import { describe, expect, it } from 'vitest';
import { estimateCost, estimateMargin } from './margin';

describe('estimateCost', () => {
  it("applique le ratio de la catégorie quand aucun coût n'est renseigné", () => {
    expect(estimateCost({ price: 100, category: 'cils' })).toBe(20);
    expect(estimateCost({ price: 100, category: 'sourcils' })).toBe(16);
    expect(estimateCost({ price: 100, category: 'categorie-inconnue' })).toBe(18);
  });

  it('respecte un costOverride explicite, même égal à 0', () => {
    expect(estimateCost({ price: 100, category: 'cils', costOverride: 12.5 })).toBe(12.5);
    expect(estimateCost({ price: 100, category: 'cils', costOverride: 0 })).toBe(0);
  });
});

describe('estimateMargin', () => {
  it('calcule la marge et le pourcentage à partir du prix et du coût', () => {
    const { cost, margin, marginPercent } = estimateMargin({ price: 100, category: 'cils' });
    expect(cost).toBe(20);
    expect(margin).toBe(80);
    expect(marginPercent).toBe(80);
  });

  it('ne divise jamais par zéro quand le prix est 0', () => {
    expect(estimateMargin({ price: 0, category: 'cils' }).marginPercent).toBe(0);
  });
});
