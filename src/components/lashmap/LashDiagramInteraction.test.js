import { describe, expect, it } from 'vitest';
import {
  DRAG_PX_PER_MM,
  MAX_ZONES,
  MIN_ZONES,
  addZone,
  applyDrag,
  buildZones,
  getZoneAtPosition,
  mirrorZones,
  mmToPixels,
  pixelsToDelta,
  removeZone,
  resizeZones,
  setZoneValue,
  stepZoneValue,
  zoneLabel,
} from './LashDiagramInteraction';
import { MM_MAX, MM_MIN, VIEWBOX } from '../../utils/lashCalculations';

describe('buildZones', () => {
  it('répartit les zones entre 10 % et 90 % de la courbe', () => {
    const zones = buildZones(6);
    expect(zones).toHaveLength(6);
    expect(zones[0].t).toBeCloseTo(0.1, 5);
    expect(zones[5].t).toBeCloseTo(0.9, 5);
    expect(zones.map((z) => z.index)).toEqual([0, 1, 2, 3, 4, 5]);
  });

  it('centre une zone unique et donne des identifiants stables', () => {
    const zones = buildZones(1);
    expect(zones[0].t).toBe(0.5);
    expect(zones[0].id).toBe('zone-0');
  });

  it('expose des positions en pourcentage du viewBox', () => {
    const zones = buildZones(4);
    zones.forEach((zone) => {
      expect(zone.left).toBeCloseTo((zone.x / VIEWBOX.width) * 100, 5);
      expect(zone.top).toBeCloseTo((zone.y / VIEWBOX.height) * 100, 5);
    });
  });
});

describe('getZoneAtPosition', () => {
  const zones = buildZones(6);

  it('rend la zone la plus proche horizontalement', () => {
    const target = zones[2];
    expect(getZoneAtPosition(zones, target.x + 4, target.y)?.index).toBe(2);
  });

  it('rattrape un appui au-dessus des cils (loin en y)', () => {
    const target = zones[4];
    expect(getZoneAtPosition(zones, target.x, 10)?.index).toBe(4);
  });

  it('rend null hors du dessin ou trop loin de toute zone', () => {
    expect(getZoneAtPosition(zones, zones[0].x, -20)).toBeNull();
    expect(getZoneAtPosition(zones, -200, 60)).toBeNull();
    expect(getZoneAtPosition([], 100, 60)).toBeNull();
    expect(getZoneAtPosition(zones, NaN, 60)).toBeNull();
  });
});

describe('pixelsToDelta / mmToPixels', () => {
  it('applique la sensibilité 40 px = 3 mm', () => {
    expect(pixelsToDelta(40)).toBeCloseTo(3, 5);
    expect(pixelsToDelta(-40)).toBeCloseTo(-3, 5);
    expect(mmToPixels(3)).toBeCloseTo(40, 5);
    expect(pixelsToDelta(mmToPixels(7))).toBeCloseTo(7, 5);
    expect(DRAG_PX_PER_MM).toBeGreaterThan(0);
  });
});

describe('applyDrag', () => {
  it('allonge vers le haut et raccourcit vers le bas', () => {
    expect(applyDrag('11', mmToPixels(2))).toEqual({ mm: 13, value: '13' });
    expect(applyDrag('11', -mmToPixels(2))).toEqual({ mm: 9, value: '9' });
  });

  it('arrondit au demi-millimètre', () => {
    expect(applyDrag('11', mmToPixels(0.4)).mm).toBe(11.5);
    expect(applyDrag('11', mmToPixels(0.2)).mm).toBe(11);
  });

  it('reste dans les bornes métier', () => {
    expect(applyDrag('11', mmToPixels(50)).mm).toBe(MM_MAX);
    expect(applyDrag('11', -mmToPixels(50)).mm).toBe(MM_MIN);
  });

  it('part de la longueur par défaut quand la zone est vide', () => {
    expect(applyDrag('', 0).mm).toBe(13);
  });
});

describe('stepZoneValue', () => {
  it('avance et recule d\'un pas clavier', () => {
    expect(stepZoneValue('11', 1)).toEqual({ mm: 11.5, value: '11.5' });
    expect(stepZoneValue('11', -1)).toEqual({ mm: 10.5, value: '10.5' });
    expect(stepZoneValue('11', 2, 1)).toEqual({ mm: 13, value: '13' });
  });

  it('bute sur les bornes', () => {
    expect(stepZoneValue('18', 1).mm).toBe(MM_MAX);
    expect(stepZoneValue('6', -1).mm).toBe(MM_MIN);
  });
});

describe('opérations sur la liste de zones', () => {
  it('remplace une valeur sans muter la liste source', () => {
    const values = ['9', '10', '11', '11'];
    const next = setZoneValue(values, 1, '12');
    expect(next).toEqual(['9', '12', '11', '11']);
    expect(values[1]).toBe('10');
  });

  it('ajoute une zone en prolongeant la dernière valeur, sans dépasser le maximum', () => {
    expect(addZone(['9', '10', '11', '12'])).toEqual(['9', '10', '11', '12', '12']);
    const full = Array.from({ length: MAX_ZONES }, () => '11');
    expect(addZone(full)).toHaveLength(MAX_ZONES);
  });

  it('retire une zone sans passer sous le minimum', () => {
    expect(removeZone(['9', '10', '11', '12', '13'])).toHaveLength(4);
    const min = Array.from({ length: MIN_ZONES }, () => '11');
    expect(removeZone(min)).toHaveLength(MIN_ZONES);
  });

  it('redimensionne dans les deux sens en respectant les bornes', () => {
    expect(resizeZones(['9', '10', '11', '12'], 6)).toEqual(['9', '10', '11', '12', '12', '12']);
    expect(resizeZones(['9', '10', '11', '12', '13', '14'], 4)).toEqual(['9', '10', '11', '12']);
    expect(resizeZones(['9', '10', '11', '12'], 99)).toHaveLength(MAX_ZONES);
    expect(resizeZones(['9', '10', '11', '12'], 1)).toHaveLength(MIN_ZONES);
  });

  it('inverse le dégradé', () => {
    expect(mirrorZones(['8', '9', '10', '11'])).toEqual(['11', '10', '9', '8']);
  });
});

describe('zoneLabel', () => {
  it('nomme les coins selon le côté du coin interne', () => {
    expect(zoneLabel(0, 6, 'left')).toBe('Coin interne');
    expect(zoneLabel(5, 6, 'left')).toBe('Coin externe');
    expect(zoneLabel(0, 6, 'right')).toBe('Coin externe');
    expect(zoneLabel(2, 6, 'left')).toBe('Zone 3');
  });
});
