import { describe, expect, it } from 'vitest';
import {
  MM_DEFAULT,
  MM_MAX,
  MM_MIN,
  applyDrag,
  averageMm,
  clampMm,
  estimateProductCost,
  formatMm,
  interpolateLength,
  isSafeForNaturalLash,
  mmToPixels,
  parseMm,
  pixelsToDelta,
  roundMm,
  stepZoneValue,
  validateLashLength,
} from './lashCalculations';

describe('parseMm', () => {
  it('lit les entiers, décimales et virgules françaises', () => {
    expect(parseMm('11')).toBe(11);
    expect(parseMm('11.5')).toBe(11.5);
    expect(parseMm('11,5')).toBe(11.5);
    expect(parseMm(12)).toBe(12);
  });

  it('retombe sur la longueur par défaut quand la saisie est vide ou illisible', () => {
    expect(parseMm('')).toBe(MM_DEFAULT);
    expect(parseMm(null)).toBe(MM_DEFAULT);
    expect(parseMm('abc')).toBe(MM_DEFAULT);
    expect(parseMm('0')).toBe(MM_DEFAULT);
  });
});

describe('clampMm / roundMm / formatMm', () => {
  it('borne aux limites métier', () => {
    expect(clampMm(2)).toBe(MM_MIN);
    expect(clampMm(25)).toBe(MM_MAX);
    expect(clampMm(11)).toBe(11);
  });

  it('arrondit au demi-millimètre', () => {
    expect(roundMm(11.2)).toBe(11);
    expect(roundMm(11.3)).toBe(11.5);
  });

  it('formate sans décimale inutile', () => {
    expect(formatMm(11)).toBe('11');
    expect(formatMm(11.5)).toBe('11.5');
  });
});

describe('validateLashLength', () => {
  it('accepte un secteur vide sans le marquer en erreur', () => {
    expect(validateLashLength('')).toMatchObject({ valid: true, empty: true, mm: MM_DEFAULT, warning: null });
  });

  it('refuse hors bornes en indiquant la limite atteinte', () => {
    expect(validateLashLength('4')).toMatchObject({ valid: false, mm: MM_MIN });
    expect(validateLashLength('22')).toMatchObject({ valid: false, mm: MM_MAX });
    expect(validateLashLength('abc').valid).toBe(false);
  });

  it('accepte une valeur dans les bornes', () => {
    expect(validateLashLength('11,5')).toMatchObject({ valid: true, empty: false, mm: 11.5 });
  });
});

describe('isSafeForNaturalLash', () => {
  it('abaisse le plafond sur des cils fragiles', () => {
    expect(isSafeForNaturalLash(13, 'très fins et cassants')).toBe(false);
    expect(isSafeForNaturalLash(10, 'très fins et cassants')).toBe(true);
  });

  it('reste permissif sur des cils épais', () => {
    expect(isSafeForNaturalLash(15, 'épais et résistants')).toBe(true);
    expect(isSafeForNaturalLash(17, 'épais et résistants')).toBe(false);
  });

  it('sans description reconnue, applique le plafond métier', () => {
    expect(isSafeForNaturalLash(17)).toBe(true);
    expect(isSafeForNaturalLash(19)).toBe(false);
  });
});

describe('interpolateLength', () => {
  const anchors = [0.2, 0.5, 0.8];

  it('rend la valeur exacte sur une ancre', () => {
    expect(interpolateLength(0.2, anchors, [8, 12, 10])).toBe(8);
    expect(interpolateLength(0.5, anchors, [8, 12, 10])).toBe(12);
  });

  it('interpole entre deux ancres', () => {
    expect(interpolateLength(0.35, anchors, [8, 12, 10])).toBeCloseTo(10, 5);
  });

  it('prolonge au-delà des extrémités', () => {
    expect(interpolateLength(0, anchors, [8, 12, 10])).toBe(8);
    expect(interpolateLength(1, anchors, [8, 12, 10])).toBe(10);
  });

  it('utilise la longueur par défaut pour les valeurs vides', () => {
    expect(interpolateLength(0.5, anchors, ['', '', ''])).toBe(MM_DEFAULT);
    expect(interpolateLength(0.5, [], [])).toBe(MM_DEFAULT);
  });
});

describe('averageMm', () => {
  it('ignore les valeurs vides et rend null si tout est vide', () => {
    expect(averageMm([10, '', 12])).toBe(11);
    expect(averageMm(['', ''])).toBeNull();
  });
});

describe('ajustement au doigt', () => {
  it('applique la sensibilité 40 px = 3 mm, dans les deux sens', () => {
    expect(pixelsToDelta(40)).toBeCloseTo(3, 5);
    expect(mmToPixels(3)).toBeCloseTo(40, 5);
    expect(pixelsToDelta(mmToPixels(7))).toBeCloseTo(7, 5);
  });

  it('allonge vers le haut et raccourcit vers le bas', () => {
    expect(applyDrag(11, mmToPixels(2))).toEqual({ mm: 13, value: '13' });
    expect(applyDrag(11, -mmToPixels(2))).toEqual({ mm: 9, value: '9' });
  });

  it('arrondit au demi-millimètre et reste dans les bornes', () => {
    expect(applyDrag(11, mmToPixels(0.4)).mm).toBe(11.5);
    expect(applyDrag(11, mmToPixels(50)).mm).toBe(MM_MAX);
    expect(applyDrag(11, -mmToPixels(50)).mm).toBe(MM_MIN);
  });

  it('avance et recule d’un pas clavier, en butant sur les bornes', () => {
    expect(stepZoneValue(11, 1)).toEqual({ mm: 11.5, value: '11.5' });
    expect(stepZoneValue(11, -1)).toEqual({ mm: 10.5, value: '10.5' });
    expect(stepZoneValue(11, 2, 1)).toEqual({ mm: 13, value: '13' });
    expect(stepZoneValue(18, 1).mm).toBe(MM_MAX);
    expect(stepZoneValue(6, -1).mm).toBe(MM_MIN);
  });
});

describe('estimateProductCost', () => {
  it('reste silencieux tant que le stock ne fournit pas de coût unitaire', () => {
    expect(estimateProductCost({}, {})).toBeNull();
  });

  it('calcule le coût quand le coût unitaire est connu', () => {
    expect(estimateProductCost({}, { costPerLash: 0.01, lashesPerEye: 100 })).toEqual({ lashes: 200, cost: 2 });
  });
});
