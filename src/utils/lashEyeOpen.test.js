import { describe, expect, it } from 'vitest';
import {
  OPEN_GRADIENT_BOUNDS,
  buildLowerLashes,
  lowerLashDirection,
  lowerLidPoint,
  openEyeIris,
  openEyePaths,
  openLashFrame,
  upperLashDirection,
  upperLidPoint,
} from './lashEyeOpen';
import { VIEWBOX, buildExtensionLashes, buildSectors } from './lashGeometry';

const samples = (n = 11) => Array.from({ length: n }, (_, i) => i / (n - 1));

describe('contour de l’œil ouvert', () => {
  it('ouvre bien un œil : la paupière haute est au-dessus de la basse partout entre les coins', () => {
    samples().slice(1, -1).forEach((t) => {
      expect(upperLidPoint(t).y).toBeLessThan(lowerLidPoint(t).y);
    });
  });

  // Sans cette jonction, le blanc de l'œil fuirait par les deux bouts et le contour ne
  // fermerait pas — la découpe de l'iris n'aurait alors plus de bord.
  it('referme les deux paupières exactement aux coins', () => {
    [0, 1].forEach((t) => {
      expect(upperLidPoint(t)).toEqual(lowerLidPoint(t));
    });
  });

  it('tient dans le cadre de la planche', () => {
    samples(21).forEach((t) => {
      [upperLidPoint(t), lowerLidPoint(t)].forEach((p) => {
        expect(p.x).toBeGreaterThanOrEqual(0);
        expect(p.x).toBeLessThanOrEqual(VIEWBOX.width);
        expect(p.y).toBeGreaterThanOrEqual(0);
        expect(p.y).toBeLessThanOrEqual(VIEWBOX.height);
      });
    });
  });

  it('rend des tracés SVG exploitables dans les deux orientations', () => {
    [false, true].forEach((mirrored) => {
      Object.values(openEyePaths(mirrored)).forEach((d) => {
        expect(typeof d).toBe('string');
        expect(d.startsWith('M')).toBe(true);
        expect(d).not.toMatch(/NaN|undefined/);
      });
    });
  });

  // Les surfaces se remplissent : un tracé ouvert se refermerait de lui-même par une
  // droite, et l'ombre de paupière déborderait sur le sourcil.
  it('ferme les tracés qui sont des surfaces', () => {
    const paths = openEyePaths();
    ['aperture', 'upperShade', 'socket'].forEach((key) => expect(paths[key].endsWith('Z')).toBe(true));
    ['upperLid', 'lowerLid', 'crease', 'waterline'].forEach((key) =>
      expect(paths[key].endsWith('Z')).toBe(false)
    );
  });
});

describe('cils de l’œil ouvert', () => {
  // Tout le sens de la bascule : sur la planche les cils descendent, ici ils remontent.
  it('fait monter les cils du haut et descendre ceux du bas', () => {
    samples().forEach((t) => {
      expect(upperLashDirection(t).y).toBeLessThan(0);
      expect(lowerLashDirection(t).y).toBeGreaterThan(0);
    });
  });

  it('les évase vers l’extérieur à mesure qu’on s’éloigne du centre', () => {
    expect(upperLashDirection(0.05).x).toBeLessThan(upperLashDirection(0.3).x);
    expect(upperLashDirection(0.95).x).toBeGreaterThan(upperLashDirection(0.7).x);
    expect(Math.abs(upperLashDirection(0.5).x)).toBeLessThan(0.05);
  });

  // Les secteurs sont découpés une seule fois, en `t` croissant. Si `x` ne croissait pas
  // avec `t`, le coin interne d'un œil se dessinerait à la place du coin externe.
  it('garde x croissant avec t, œil retourné compris', () => {
    [false, true].forEach((mirrored) => {
      const frame = openLashFrame({ mirrored });
      const xs = samples(21).map((t) => frame.point(t).x);
      xs.slice(1).forEach((x, i) => expect(x).toBeGreaterThan(xs[i]));
    });
  });

  it('retourne le repère par réflexion, sans le déformer', () => {
    const droit = openLashFrame();
    const gauche = openLashFrame({ mirrored: true });
    samples().forEach((t) => {
      const a = droit.point(1 - t);
      const b = gauche.point(t);
      expect(b.x).toBeCloseTo(VIEWBOX.width - a.x, 6);
      expect(b.y).toBeCloseTo(a.y, 6);
      expect(gauche.direction(t).x).toBeCloseTo(-droit.direction(1 - t).x, 6);
      expect(gauche.direction(t).y).toBeCloseTo(droit.direction(1 - t).y, 6);
    });
  });
});

describe('branchement sur le moteur de cils', () => {
  const zones = Array.from({ length: 12 }, (_, i) => ({
    length: 8 + i * 0.4,
    curl: 'C',
    diameter: '0.07',
    density: 'Classic',
    style: 'Classique',
  }));

  // La vue ouverte ne redessine pas les cils : elle change le REPÈRE de pose. Ce test
  // vérifie le contrat entre les deux modules — le seul endroit où ils se parlent.
  it('produit des cils dont la pointe est au-dessus de la racine', () => {
    const sectors = buildSectors(zones.length);
    const lashes = buildExtensionLashes(zones, sectors, { frame: openLashFrame() });
    expect(lashes.length).toBeGreaterThan(50);
    lashes.forEach((lash) => {
      const [rootY, tipY] = pointsOf(lash.d);
      expect(tipY).toBeLessThan(rootY);
    });
  });

  it('les pose bien sur la ligne ciliaire du haut', () => {
    const sectors = buildSectors(zones.length);
    const lashes = buildExtensionLashes(zones, sectors, { frame: openLashFrame() });
    lashes.forEach((lash) => {
      const [rootY] = pointsOf(lash.d);
      // Tolérance : la racine est décalée d'une demi-épaisseur de cil de part et d'autre
      // de la ligne, le tracé étant une silhouette et non un trait.
      expect(Math.abs(rootY - nearestLidY(lash.d))).toBeLessThan(6);
    });
  });
});

/** Racine (premier point du tracé) et pointe (fin de la première quadratique). */
function pointsOf(d) {
  const numbers = d.match(/-?\d+(\.\d+)?/g).map(Number);
  return [numbers[1], numbers[5]];
}

function nearestLidY(d) {
  const numbers = d.match(/-?\d+(\.\d+)?/g).map(Number);
  const x = numbers[0];
  let best = Infinity;
  let bestY = 0;
  samples(201).forEach((t) => {
    const p = upperLidPoint(t);
    if (Math.abs(p.x - x) < best) {
      best = Math.abs(p.x - x);
      bestY = p.y;
    }
  });
  return bestY;
}

describe('iris', () => {
  it('déborde l’ouverture pour être rogné par les paupières', () => {
    const iris = openEyeIris();
    expect(iris.cy - iris.r).toBeLessThan(upperLidPoint(0.5).y);
    expect(iris.cy + iris.r).toBeGreaterThan(lowerLidPoint(0.5).y);
  });

  it('reste dans les bornes latérales de l’œil', () => {
    const iris = openEyeIris();
    expect(iris.cx - iris.r).toBeGreaterThan(upperLidPoint(0).x);
    expect(iris.cx + iris.r).toBeLessThan(upperLidPoint(1).x);
  });

  it('se déplace avec l’œil retourné', () => {
    expect(openEyeIris(true).cx).toBeCloseTo(VIEWBOX.width - openEyeIris().cx, 6);
  });

  // Une pièce n'a qu'une lampe : elle éclaire les deux yeux du même côté. Des reflets qui
  // basculeraient avec le dessin donneraient deux sources contradictoires — et
  // contrediraient le dégradé de l'iris, dont la lumière ne bascule pas non plus.
  it('garde ses reflets du même côté sur les deux yeux', () => {
    const droit = openEyeIris();
    const gauche = openEyeIris(true);
    droit.highlights.forEach((h, i) => {
      expect(gauche.highlights[i].x - gauche.cx).toBeCloseTo(h.x - droit.cx, 6);
      expect(gauche.highlights[i].y).toBeCloseTo(h.y, 6);
    });
  });

  it('garde la pupille à l’intérieur de l’iris', () => {
    const iris = openEyeIris();
    expect(iris.pupilR).toBeGreaterThan(0);
    expect(iris.pupilR).toBeLessThan(iris.r);
  });
});

describe('bornes de dégradé', () => {
  // Le piège exact que ces bornes évitent : reprendre celles de la planche fermée, où les
  // cils descendent, teindrait toute la frange ouverte d'un noir uni.
  it('va du bas sombre vers le haut clair, à l’inverse de la planche', () => {
    expect(OPEN_GRADIENT_BOUNDS.lash.y0).toBeGreaterThan(OPEN_GRADIENT_BOUNDS.lash.y1);
  });

  it('couvre réellement l’étendue des cils dessinés', () => {
    const sectors = buildSectors(12);
    const zones = Array.from({ length: 12 }, () => ({ length: 15, curl: 'D', diameter: '0.15' }));
    const lashes = buildExtensionLashes(zones, sectors, { frame: openLashFrame() });
    const tips = lashes.map((lash) => pointsOf(lash.d)[1]);
    expect(Math.min(...tips)).toBeGreaterThan(OPEN_GRADIENT_BOUNDS.lash.y1);
    expect(Math.max(...tips)).toBeLessThan(OPEN_GRADIENT_BOUNDS.lash.y0);
  });
});

describe('cils du bas', () => {
  it('rend le même dessin à graine égale', () => {
    expect(buildLowerLashes()).toEqual(buildLowerLashes());
  });

  it('respecte le nombre demandé et rend des tracés valides', () => {
    const lashes = buildLowerLashes({ count: 20 });
    expect(lashes).toHaveLength(20);
    lashes.forEach((lash) => {
      expect(lash.d.startsWith('M')).toBe(true);
      expect(lash.d).not.toMatch(/NaN/);
      expect(lash.opacity).toBeGreaterThan(0);
      expect(lash.opacity).toBeLessThanOrEqual(1);
    });
  });

  it('les dessine sous l’œil, jamais dedans', () => {
    buildLowerLashes().forEach((lash) => {
      const [rootY, tipY] = pointsOf(lash.d);
      expect(tipY).toBeGreaterThan(rootY);
    });
  });
});
