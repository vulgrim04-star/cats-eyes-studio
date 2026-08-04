import { describe, expect, it } from 'vitest';
import {
  BROW_VIEWBOX,
  ZONE_ANCHORS,
  browGloss,
  browOutline,
  browSpine,
  buildBrowHairs,
  zoneHandles,
} from './browGeometry';
import { EMPTY_BROW_LOOK, normalizeLook } from './browShapes';

const inside = ({ x, y }) => x >= -2 && x <= BROW_VIEWBOX.width + 2 && y >= -2 && y <= BROW_VIEWBOX.height + 2;
const pointsOf = (path) =>
  [...path.matchAll(/(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/g)].map((m) => ({ x: Number(m[1]), y: Number(m[2]) }));

describe('browSpine', () => {
  const look = normalizeLook({ shapeId: 'soft-arch' });

  it('place les deux sourcils de part et d’autre du centre', () => {
    const droite = browSpine(look, 'right')(0.5);
    const gauche = browSpine(look, 'left')(0.5);
    expect(droite.x).toBeGreaterThan(BROW_VIEWBOX.width / 2);
    expect(gauche.x).toBeLessThan(BROW_VIEWBOX.width / 2);
  });

  it('les deux sourcils sont en miroir exact quand la symétrie est neutre', () => {
    [0, 0.3, 0.66, 1].forEach((t) => {
      const d = browSpine(look, 'right')(t);
      const g = browSpine(look, 'left')(t);
      expect(d.x + g.x).toBeCloseTo(BROW_VIEWBOX.width, 1);
      expect(d.y).toBeCloseTo(g.y, 1);
    });
  });

  // L'axe SVG descend : une arche plus haute a un `y` plus PETIT.
  it('une arche haute monte réellement le tracé', () => {
    const haut = browSpine(normalizeLook({ shapeId: 'high-arch' }), 'right')(ZONE_ANCHORS.arch);
    const doux = browSpine(normalizeLook({ shapeId: 'soft-arch' }), 'right')(ZONE_ANCHORS.arch);
    expect(haut.y).toBeLessThan(doux.y);
  });

  it('un Fox Brow relève sa queue', () => {
    const fox = browSpine(normalizeLook({ shapeId: 'fox' }), 'right')(1);
    const nat = browSpine(normalizeLook({ shapeId: 'natural' }), 'right')(1);
    expect(fox.y).toBeLessThan(nat.y);
  });

  // C'est ainsi qu'on épile : on raccourcit par la queue, jamais par la tête.
  it('la longueur raccourcit par la queue et laisse la tête en place', () => {
    const court = normalizeLook({ ...EMPTY_BROW_LOOK, length: 0 });
    const long = normalizeLook({ ...EMPTY_BROW_LOOK, length: 100 });
    expect(browSpine(court, 'right')(0).x).toBeCloseTo(browSpine(long, 'right')(0).x, 1);
    expect(browSpine(court, 'right')(1).x).toBeLessThan(browSpine(long, 'right')(1).x);
  });

  it('l’épaisseur suit le réglage', () => {
    const fin = browSpine(normalizeLook({ thickness: 0 }), 'right')(0.5);
    const epais = browSpine(normalizeLook({ thickness: 100 }), 'right')(0.5);
    expect(epais.weight).toBeGreaterThan(fin.weight);
  });

  it('la symétrie décale un sourcil et pas l’autre', () => {
    const asym = normalizeLook({ symmetry: 100 });
    const d = browSpine(asym, 'right')(ZONE_ANCHORS.arch);
    const g = browSpine(asym, 'left')(ZONE_ANCHORS.arch);
    expect(Math.abs(d.y - g.y)).toBeGreaterThan(2);
  });

  it('ne sort jamais du cadre, même aux réglages extrêmes', () => {
    const extreme = normalizeLook({ archHeight: 100, angle: 100, thickness: 100, length: 100, symmetry: 100 });
    ['left', 'right'].forEach((side) => {
      for (let i = 0; i <= 20; i += 1) expect(inside(browSpine(extreme, side)(i / 20))).toBe(true);
    });
  });
});

describe('browOutline', () => {
  it('produit une silhouette fermée, dans le cadre', () => {
    const d = browOutline(EMPTY_BROW_LOOK, 'right');
    expect(d.trim().endsWith('Z')).toBe(true);
    pointsOf(d).forEach((p) => expect(inside(p)).toBe(true));
  });
});

describe('buildBrowHairs', () => {
  it('est identique d’un appel à l’autre : le dessin ne doit pas frémir', () => {
    expect(buildBrowHairs(EMPTY_BROW_LOOK, 'right')).toEqual(buildBrowHairs(EMPTY_BROW_LOOK, 'right'));
  });

  it('la densité fait varier le nombre de poils', () => {
    const peu = buildBrowHairs(normalizeLook({ density: 0 }), 'right').length;
    const beaucoup = buildBrowHairs(normalizeLook({ density: 100 }), 'right').length;
    expect(beaucoup).toBeGreaterThan(peu);
    expect(peu).toBeGreaterThan(0);
  });

  it('un laminé intense pose plus de poils qu’un rendu naturel', () => {
    const naturel = buildBrowHairs(normalizeLook({ effectId: 'natural' }), 'right').length;
    const lamine = buildBrowHairs(normalizeLook({ effectId: 'lam-strong' }), 'right').length;
    expect(lamine).toBeGreaterThan(naturel);
  });

  // Les poils d'un sourcil remontent : c'est ce qui distingue un sourcil peigné d'un trait.
  it('les poils montent depuis l’arête', () => {
    buildBrowHairs(EMPTY_BROW_LOOK, 'right').slice(0, 40).forEach((hair) => {
      const p = pointsOf(hair.d);
      const tip = p[Math.floor(p.length / 2)];
      expect(tip.y).toBeLessThan(p[0].y);
    });
  });

  it('les poils partent vers la tempe, de chaque côté', () => {
    const tipOf = (hair) => pointsOf(hair.d)[Math.floor(pointsOf(hair.d).length / 2)];
    const d = buildBrowHairs(EMPTY_BROW_LOOK, 'right')[10];
    const g = buildBrowHairs(EMPTY_BROW_LOOK, 'left')[10];
    expect(tipOf(d).x).toBeGreaterThan(pointsOf(d.d)[0].x);
    expect(tipOf(g).x).toBeLessThan(pointsOf(g.d)[0].x);
  });

  it('reste dans le cadre', () => {
    buildBrowHairs(normalizeLook({ archHeight: 100, thickness: 100 }), 'right').forEach((hair) => {
      pointsOf(hair.d).forEach((p) => expect(inside(p)).toBe(true));
    });
  });
});

describe('zoneHandles', () => {
  it('donne une pastille par zone, au-dessus du tracé et dans le cadre', () => {
    const handles = zoneHandles(EMPTY_BROW_LOOK, 'right');
    expect(handles.map((h) => h.id)).toEqual(['head', 'body', 'arch', 'tail']);
    handles.forEach((h) => expect(inside(h)).toBe(true));
  });

  it('les pastilles suivent la forme choisie', () => {
    const doux = zoneHandles(normalizeLook({ shapeId: 'soft-arch' }), 'right').find((h) => h.id === 'arch');
    const haut = zoneHandles(normalizeLook({ shapeId: 'high-arch' }), 'right').find((h) => h.id === 'arch');
    expect(haut.y).toBeLessThan(doux.y);
  });
});

describe('browGloss', () => {
  // Un reflet permanent ferait un sourcil mouillé en permanence.
  it('n’apparaît que sur les effets brillants', () => {
    expect(browGloss(normalizeLook({ effectId: 'natural' }), 'right')).toBeNull();
    expect(browGloss(normalizeLook({ effectId: 'wet' }), 'right')).not.toBeNull();
  });

  it('brille davantage sur un effet wet que sur un laminé léger', () => {
    const wet = browGloss(normalizeLook({ effectId: 'wet' }), 'right');
    const leger = browGloss(normalizeLook({ effectId: 'lam-light' }), 'right');
    expect(wet.opacity).toBeGreaterThan(leger.opacity);
  });
});
