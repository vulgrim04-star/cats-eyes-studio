import { describe, expect, it } from 'vitest';
import {
  MM_DEFAULT,
  MM_MAX,
  MM_MIN,
  PX_MAX,
  PX_MIN,
  averageMm,
  buildLashLines,
  calculateLashLine,
  clampMm,
  diffMaps,
  estimateProductCost,
  formatMm,
  interpolateLength,
  isSafeForNaturalLash,
  lashLinePoint,
  mmToRenderPx,
  parseMm,
  roundMm,
  validateLashLength,
} from './lashCalculations';
import { buildZones } from '../components/lashmap/LashDiagramInteraction';

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

describe('mmToRenderPx', () => {
  it('mappe les bornes métier sur les bornes de dessin', () => {
    expect(mmToRenderPx(MM_MIN)).toBe(PX_MIN);
    expect(mmToRenderPx(MM_MAX)).toBe(PX_MAX);
  });

  it('reste dans les bornes de dessin hors limites', () => {
    expect(mmToRenderPx(0)).toBe(PX_MIN);
    expect(mmToRenderPx(40)).toBe(PX_MAX);
  });
});

describe('validateLashLength', () => {
  it('accepte une zone vide sans la marquer en erreur', () => {
    const result = validateLashLength('');
    expect(result).toMatchObject({ valid: true, empty: true, mm: MM_DEFAULT, warning: null });
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

describe('lashLinePoint', () => {
  it('passe par les coins et culmine au centre', () => {
    expect(lashLinePoint(0)).toEqual({ x: 20, y: 92 });
    expect(lashLinePoint(1)).toEqual({ x: 260, y: 92 });
    // Sommet de la Bézier : y minimal (l'axe SVG descend vers le bas).
    expect(lashLinePoint(0.5).y).toBeLessThan(lashLinePoint(0.25).y);
  });
});

describe('interpolateLength', () => {
  const zones = buildZones(3);

  it('rend la valeur exacte sur une zone', () => {
    expect(interpolateLength(zones[0].t, zones, ['8', '12', '10'])).toBe(8);
    expect(interpolateLength(zones[1].t, zones, ['8', '12', '10'])).toBe(12);
  });

  it('interpole entre deux zones', () => {
    const middle = (zones[0].t + zones[1].t) / 2;
    expect(interpolateLength(middle, zones, ['8', '12', '10'])).toBeCloseTo(10, 5);
  });

  it('prolonge les extrémités au-delà des zones', () => {
    expect(interpolateLength(0, zones, ['8', '12', '10'])).toBe(8);
    expect(interpolateLength(1, zones, ['8', '12', '10'])).toBe(10);
  });

  it('utilise la longueur par défaut pour les zones vides', () => {
    expect(interpolateLength(zones[1].t, zones, ['', '', ''])).toBe(MM_DEFAULT);
  });
});

describe('calculateLashLine / buildLashLines', () => {
  it('dessine un cil qui part du bord ciliaire vers le haut', () => {
    const zones = buildZones(6);
    const lash = calculateLashLine(0.5, zones, ['11', '11', '11', '11', '11', '11']);
    expect(lash.y2).toBeLessThan(lash.y1);
    expect(lash.mm).toBe(11);
  });

  it('produit le nombre de cils demandé, plus longs là où la valeur est plus grande', () => {
    const zones = buildZones(4);
    const lines = buildLashLines(['8', '8', '14', '14'], zones, 10);
    expect(lines).toHaveLength(10);
    expect(lines[0].mm).toBeLessThan(lines[9].mm);
  });
});

describe('averageMm', () => {
  it('ignore les zones vides et rend null si tout est vide', () => {
    expect(averageMm(['10', '', '12'])).toBe(11);
    expect(averageMm(['', ''])).toBeNull();
  });
});

describe('diffMaps', () => {
  const previous = {
    curl: 'C',
    length: '11',
    thickness: '0.05',
    styles: ['Volume'],
    zonesLeft: ['9', '10', '11', '11'],
    zonesRight: ['9', '10', '11', '11'],
  };

  it('ne rend aucun changement pour deux fiches identiques', () => {
    expect(diffMaps(previous, previous).changes).toHaveLength(0);
  });

  it('relève les champs modifiés et les écarts de longueur moyenne', () => {
    const current = { ...previous, curl: 'CC', zonesLeft: ['10', '11', '12', '12'] };
    const { changes } = diffMaps(current, previous);
    const curl = changes.find((c) => c.key === 'curl');
    const left = changes.find((c) => c.key === 'zonesLeft');
    expect(curl).toMatchObject({ from: 'C', to: 'CC' });
    expect(left.delta).toBe(1);
    expect(changes.find((c) => c.key === 'zonesRight')).toBeUndefined();
  });

  it('rend une liste vide sans fiche de comparaison', () => {
    expect(diffMaps(previous, null).changes).toEqual([]);
  });
});

describe('estimateProductCost', () => {
  it('reste silencieux tant que le stock ne fournit pas de coût unitaire', () => {
    expect(estimateProductCost({}, {})).toBeNull();
  });

  it('calcule le coût quand le coût unitaire est connu', () => {
    expect(estimateProductCost({}, { costPerLash: 0.01, lashesPerEye: 100 })).toEqual({
      lashes: 200,
      cost: 2,
    });
  });
});
