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

  // Un cil est une silhouette FERMÉE : deux bords qui partent de la racine et se
  // rejoignent à la pointe (`M racineG Q … pointe Q … racineD Z`). Le tracé revient donc
  // à son point de départ, et c'est le point MÉDIAN — la pointe — qui doit descendre.
  // La garantie testée reste la même qu'avant le passage aux cils fuselés : la frange
  // pend sous la paupière et ne sort pas du cadre.
  it('dessine les cils naturels sous la paupière, dans le cadre', () => {
    const lashes = buildNaturalLashes({ count: 40 });
    expect(lashes).toHaveLength(40);
    lashes.forEach((lash) => {
      const points = pointsOf(lash.d);
      const tip = points[Math.floor(points.length / 2)];
      const [rootLeft] = points;
      const rootRight = points[points.length - 1];
      expect(tip.y).toBeGreaterThan(rootLeft.y);
      expect(tip.y).toBeGreaterThan(rootRight.y);
      // Les deux racines encadrent le même point du bord ciliaire : même hauteur, à
      // l'épaisseur du cil près.
      expect(Math.abs(rootLeft.y - rootRight.y)).toBeLessThan(3);
      points.forEach((point) => expect(insideViewBox(point)).toBe(true));
    });
  });

  /** Abscisse de la racine d'un cil, lue sur son tracé.
   *
   *  Les assertions de dégradé s'expriment sur la POSITION et non sur l'index du tableau :
   *  les cils naissent désormais secteur par secteur — c'est ce qui permet à la densité de
   *  se voir — et l'ordre du tableau n'est donc plus l'ordre le long de la paupière. */
  const rootX = (lash) => Number(lash.d.slice(1).split(',')[0]);
  const leftmost = (lashes) => lashes.reduce((a, b) => (rootX(b) < rootX(a) ? b : a));
  const rightmost = (lashes) => lashes.reduce((a, b) => (rootX(b) > rootX(a) ? b : a));

  it('allonge les extensions là où les millimètres sont plus grands', () => {
    const sectors = buildSectors(6);
    const courtes = buildExtensionLashes([8, 8, 8, 8, 8, 8], sectors, { count: 24 });
    const longues = buildExtensionLashes([16, 16, 16, 16, 16, 16], sectors, { count: 24 });
    expect(Math.max(...courtes.map((l) => l.mm))).toBeLessThan(Math.min(...longues.map((l) => l.mm)));

    const degrade = buildExtensionLashes([8, 9, 10, 11, 12, 13], sectors, { count: 24 });
    expect(leftmost(degrade).mm).toBeLessThan(rightmost(degrade).mm);
  });

  it('suit le dégradé dans le bon sens sur un œil en miroir', () => {
    const sectors = buildSectors(6, { mirrored: true });
    const lashes = buildExtensionLashes([8, 9, 10, 11, 12, 13], sectors, { count: 24, mirrored: true });
    // Secteur 0 (interne, 8 mm) est à DROITE du dessin : les cils de gauche sont donc
    // les plus longs.
    expect(leftmost(lashes).mm).toBeGreaterThan(rightmost(lashes).mm);
  });

  // LE MANQUE QUE TOUT CECI COMBLE : seule la longueur se voyait. Un secteur passé en DD,
  // en 0.15 ou en Mega Volume s'enregistrait sans que le dessin bouge d'un pixel.
  it('rend visibles la courbure, le diamètre et la densité, secteur par secteur', () => {
    const sectors = buildSectors(4);
    const base = { length: 11, curl: 'J', diameter: '0.03', density: 'Classic', style: 'Classique' };
    const plat = buildExtensionLashes(Array.from({ length: 4 }, () => ({ ...base })), sectors, { count: 40 });
    const marque = buildExtensionLashes(
      Array.from({ length: 4 }, () => ({ ...base, curl: 'DD', diameter: '0.15', density: 'Mega Volume' })),
      sectors,
      { count: 40 }
    );

    const epaisseur = (l) => l.reduce((s, x) => s + x.width, 0) / l.length;
    expect(epaisseur(marque)).toBeGreaterThan(epaisseur(plat) * 2);

    // La cambrure se lit sur l'écart entre la racine et la pointe : un cil très recourbé
    // s'écarte davantage de sa direction de départ.
    const cambrure = (l) => l.reduce((s, x) => s + x.d.length, 0);
    expect(cambrure(marque)).not.toBe(cambrure(plat));

    // Même nombre total demandé, mais un secteur fourni en reçoit davantage que ses
    // voisins : c'est ce qui fait qu'un 5D au centre se voit.
    const degrade = buildExtensionLashes(
      [
        { ...base, density: 'Classic' },
        { ...base, density: 'Mega Volume' },
        { ...base, density: 'Mega Volume' },
        { ...base, density: 'Classic' },
      ],
      sectors,
      { count: 40 }
    );
    const dansSecteur = (lashes, xMin, xMax) => lashes.filter((l) => rootX(l) >= xMin && rootX(l) < xMax).length;
    const largeur = 600;
    const bord = dansSecteur(degrade, 0, largeur / 4);
    const centre = dansSecteur(degrade, largeur / 4, largeur / 2);
    expect(centre).toBeGreaterThan(bord);
  });

  // LE DÉFAUT QUE CE TEST FIGE. Les cils étaient répartis entre secteurs au prorata de leur
  // densité, mais leur nombre TOTAL était fixe : monter tout l'œil de Classic en Mega Volume
  // augmentait chaque part dans la même proportion, donc ne changeait rigoureusement rien à
  // l'écran. Le réglage s'enregistrait, le dessin restait identique — et rien ne le signalait.
  it('dessine plus de cils quand TOUT l’œil monte en densité', () => {
    const sectors = buildSectors(8);
    const eye = (density, style = 'Classique') =>
      buildExtensionLashes(
        Array.from({ length: 8 }, () => ({ length: 11, curl: 'C', diameter: '0.07', density, style })),
        sectors
      );

    const classic = eye('Classic').length;
    const cinqD = eye('5D').length;
    const mega = eye('Mega Volume').length;
    expect(cinqD).toBeGreaterThan(classic);
    expect(mega).toBeGreaterThan(cinqD);
    // Plafonné : un Mega Volume vaut près de quatre fois la pose de référence, mais un
    // dessin quatre fois plus chargé serait un aplat noir — et mille tracés sur téléphone.
    expect(mega).toBeLessThan(classic * 2.6);
  });

  it('accepte encore un simple tableau de longueurs', () => {
    const sectors = buildSectors(4);
    const lashes = buildExtensionLashes([8, 10, 12, 14], sectors, { count: 20 });
    expect(lashes.length).toBeGreaterThan(0);
    lashes.forEach((l) => expect(Number.isFinite(l.mm)).toBe(true));
  });
});
