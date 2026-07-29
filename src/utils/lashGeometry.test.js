import { describe, expect, it } from 'vitest';
import {
  COMPACT_VIEWPORT_PX,
  SECTOR_COMPACT,
  SECTOR_DEFAULT,
  SECTOR_MAX,
  SECTOR_MIN,
  VIEWBOX,
  sectorCountForWidth,
  axisLabelPoints,
  buildBrow,
  buildExtensionLashes,
  buildNaturalLashes,
  buildSectors,
  centerGuidePath,
  fanDirection,
  lashDirection,
  lidPoint,
  mmToLashLength,
  sectorAnchors,
} from './lashGeometry';
import { MM_MAX, MM_MIN } from './lashCalculations';

const insideViewBox = ({ x, y }) => x >= 0 && x <= VIEWBOX.width && y >= 0 && y <= VIEWBOX.height;

/** Extrait tous les couples de coordonnées d'un attribut `d`. */
function pointsOf(path) {
  return [...path.matchAll(/(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/g)].map((m) => ({
    x: Number(m[1]),
    y: Number(m[2]),
  }));
}

describe('lidPoint', () => {
  it('part et revient à la même hauteur, en creusant au centre', () => {
    expect(lidPoint(0).y).toBeCloseTo(lidPoint(1).y, 6);
    // L'axe SVG descend : le milieu de la paupière fermée est PLUS BAS que les coins.
    expect(lidPoint(0.5).y).toBeGreaterThan(lidPoint(0).y);
  });

  it('est symétrique par rapport au centre du viewBox', () => {
    expect(lidPoint(0.3).x + lidPoint(0.7).x).toBeCloseTo(VIEWBOX.width, 6);
  });
});

describe('directions', () => {
  it('ouvre les secteurs vers le haut et les cils vers le bas', () => {
    expect(fanDirection(0.5).y).toBeLessThan(0);
    expect(lashDirection(0.5).y).toBeGreaterThan(0);
  });

  it('évase les deux vers l’extérieur aux coins', () => {
    expect(fanDirection(0.05).x).toBeLessThan(0);
    expect(lashDirection(0.05).x).toBeLessThan(0);
    expect(fanDirection(0.95).x).toBeGreaterThan(0);
    expect(lashDirection(0.95).x).toBeGreaterThan(0);
  });

  it('est vertical au centre', () => {
    expect(fanDirection(0.5).x).toBeCloseTo(0, 6);
    expect(lashDirection(0.5).x).toBeCloseTo(0, 6);
  });
});

describe('buildSectors', () => {
  it('produit le nombre demandé, borné aux limites du module', () => {
    expect(buildSectors(12)).toHaveLength(12);
    expect(buildSectors(2)).toHaveLength(SECTOR_MIN);
    expect(buildSectors(99)).toHaveLength(SECTOR_MAX);
    expect(buildSectors()).toHaveLength(SECTOR_DEFAULT);
  });

  it('couvre la paupière sans trou ni recouvrement', () => {
    const sectors = buildSectors(12);
    sectors.slice(1).forEach((sector, i) => {
      expect(sector.t0).toBeCloseTo(sectors[i].t1, 10);
    });
    expect(sectors[0].t0).toBeGreaterThan(0);
    expect(sectors[11].t1).toBeLessThan(1);
  });

  it('place le secteur 0 (coin interne) à gauche, et à droite en miroir', () => {
    const normal = buildSectors(12);
    const mirrored = buildSectors(12, { mirrored: true });
    expect(normal[0].labelPoint.x).toBeLessThan(normal[11].labelPoint.x);
    expect(mirrored[0].labelPoint.x).toBeGreaterThan(mirrored[11].labelPoint.x);
    // Le miroir est exact : secteur i retourné = secteur i d'origine, symétrisé.
    expect(mirrored[0].labelPoint.x + normal[0].labelPoint.x).toBeCloseTo(VIEWBOX.width, 1);
  });

  it('rend un tracé fermé, entièrement dans le cadre, et une ancre de libellé au-dessus de la base', () => {
    buildSectors(SECTOR_MAX).forEach((sector) => {
      expect(sector.path.startsWith('M')).toBe(true);
      expect(sector.path.endsWith('Z')).toBe(true);
      pointsOf(sector.path).forEach((point) => expect(insideViewBox(point)).toBe(true));
      expect(sector.labelPoint.y).toBeLessThan(sector.basePoint.y);
      expect(insideViewBox(sector.labelPoint)).toBe(true);
    });
  });

  it('donne des ancres croissantes (décroissantes en miroir)', () => {
    const anchors = sectorAnchors(buildSectors(8));
    expect([...anchors].sort((a, b) => a - b)).toEqual(anchors);
    const mirroredAnchors = sectorAnchors(buildSectors(8, { mirrored: true }));
    expect([...mirroredAnchors].sort((a, b) => b - a)).toEqual(mirroredAnchors);
  });
});

describe('sectorCountForWidth', () => {
  it('découpe plus large sur téléphone que sur grand écran', () => {
    expect(sectorCountForWidth(390)).toBe(SECTOR_COMPACT);
    expect(sectorCountForWidth(1440)).toBe(SECTOR_DEFAULT);
  });

  it('bascule exactement au point de rupture des feuilles de style', () => {
    expect(sectorCountForWidth(COMPACT_VIEWPORT_PX - 1)).toBe(SECTOR_COMPACT);
    expect(sectorCountForWidth(COMPACT_VIEWPORT_PX)).toBe(SECTOR_DEFAULT);
  });

  it('retombe sur le découpage standard si la largeur est inexploitable', () => {
    expect(sectorCountForWidth(0)).toBe(SECTOR_DEFAULT);
    expect(sectorCountForWidth(NaN)).toBe(SECTOR_DEFAULT);
    expect(sectorCountForWidth(undefined)).toBe(SECTOR_DEFAULT);
  });
});

describe('taille des cibles tactiles', () => {
  /** Largeur du rectangle englobant d'un secteur, en unités du viewBox — c'est ce que
   *  mesure un navigateur sur le `<g>` correspondant. */
  const boxWidth = (sector) => {
    const xs = pointsOf(sector.path).map((p) => p.x);
    return Math.max(...xs) - Math.min(...xs);
  };

  /** Largeur de planche sur un téléphone de 390 px : la planche va d'un bord à l'autre. */
  const PHONE_PLATE_PX = 390;
  const TOUCH_TARGET_PX = 44;

  it('garde tous les secteurs au-dessus de 44 px sur un téléphone, au découpage compact', () => {
    const scale = PHONE_PLATE_PX / VIEWBOX.width;
    const narrowest = Math.min(...buildSectors(SECTOR_COMPACT).map(boxWidth));
    expect(narrowest * scale).toBeGreaterThanOrEqual(TOUCH_TARGET_PX);
  });

  // Une fiche déjà enregistrée garde son découpage : ouverte sur un téléphone, elle doit
  // au moins rester au-dessus du plancher WCAG 2.2 AA (24 px).
  it('garde le découpage standard au-dessus du plancher WCAG sur téléphone', () => {
    const scale = PHONE_PLATE_PX / VIEWBOX.width;
    const narrowest = Math.min(...buildSectors(SECTOR_DEFAULT).map(boxWidth));
    expect(narrowest * scale).toBeGreaterThanOrEqual(24);
  });

  // Au découpage maximal, 390 px d'écran ne peuvent PHYSIQUEMENT pas offrir 24 px par
  // secteur (390/16 = 24,4 px avant même de compter les marges du dessin). C'est un choix
  // délibéré de la praticienne, et les commandes équivalentes — pastilles, pas à pas,
  // panneau — restent, elles, au-dessus de 44 px.
  it('reste utilisable au découpage maximal, sans prétendre y tenir la cible tactile', () => {
    const scale = PHONE_PLATE_PX / VIEWBOX.width;
    const narrowest = Math.min(...buildSectors(SECTOR_MAX).map(boxWidth));
    expect(narrowest * scale).toBeGreaterThan(20);
    expect(narrowest * scale).toBeLessThan(24);
  });
});

describe('repères', () => {
  it('trace le guide central verticalement depuis la paupière', () => {
    const points = pointsOf(centerGuidePath());
    expect(points[0].x).toBeCloseTo(VIEWBOX.width / 2, 1);
    expect(points[1].x).toBeCloseTo(VIEWBOX.width / 2, 1);
    expect(points[1].y).toBeLessThan(points[0].y);
  });

  it('place interne, centre et externe de part et d’autre, et les échange en miroir', () => {
    const normal = axisLabelPoints(false);
    const mirrored = axisLabelPoints(true);
    expect(normal.inner.x).toBeLessThan(normal.center.x);
    expect(normal.center.x).toBeLessThan(normal.outer.x);
    expect(mirrored.inner.x).toBeGreaterThan(mirrored.center.x);
    expect(Object.values(normal).every(insideViewBox)).toBe(true);
  });
});

describe('mmToLashLength', () => {
  it('mappe les bornes métier sur les bornes de dessin', () => {
    expect(mmToLashLength(MM_MIN)).toBeLessThan(mmToLashLength(MM_MAX));
    expect(mmToLashLength(0)).toBe(mmToLashLength(MM_MIN));
    expect(mmToLashLength(40)).toBe(mmToLashLength(MM_MAX));
  });
});

describe('frange de cils', () => {
  it('est identique d’un appel à l’autre : le dessin ne doit jamais frémir', () => {
    expect(buildNaturalLashes()).toEqual(buildNaturalLashes());
    expect(buildBrow()).toEqual(buildBrow());
    expect(buildNaturalLashes({ seed: 1 })).not.toEqual(buildNaturalLashes({ seed: 2 }));
  });

  it('dessine les cils naturels sous la paupière, dans le cadre', () => {
    const lashes = buildNaturalLashes({ count: 40 });
    expect(lashes).toHaveLength(40);
    lashes.forEach((lash) => {
      const points = pointsOf(lash.d);
      expect(points[points.length - 1].y).toBeGreaterThan(points[0].y);
      points.forEach((point) => expect(insideViewBox(point)).toBe(true));
    });
  });

  it('allonge les extensions là où les millimètres sont plus grands', () => {
    const sectors = buildSectors(6);
    const courtes = buildExtensionLashes([8, 8, 8, 8, 8, 8], sectors, { count: 24 });
    const longues = buildExtensionLashes([16, 16, 16, 16, 16, 16], sectors, { count: 24 });
    courtes.forEach((lash, i) => expect(lash.mm).toBeLessThan(longues[i].mm));
    const degrade = buildExtensionLashes([8, 9, 10, 11, 12, 13], sectors, { count: 24 });
    expect(degrade[0].mm).toBeLessThan(degrade[23].mm);
  });

  it('suit le dégradé dans le bon sens sur un œil en miroir', () => {
    const sectors = buildSectors(6, { mirrored: true });
    const lashes = buildExtensionLashes([8, 9, 10, 11, 12, 13], sectors, { count: 24, mirrored: true });
    // Secteur 0 (interne, 8 mm) est à DROITE du dessin : les cils de gauche sont donc
    // les plus longs.
    expect(lashes[0].mm).toBeGreaterThan(lashes[23].mm);
  });
});
