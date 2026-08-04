import { describe, expect, it } from 'vitest';
import {
  BROW_EFFECTS,
  BROW_SHAPES,
  BROW_TONES,
  EMPTY_BROW_LOOK,
  ZONE_IDS,
  clampOffset,
  clampPercent,
  effectiveZone,
  effectiveZones,
  isCustomized,
  lookSummary,
  normalizeLook,
  renderedTone,
  resetShape,
  shapeById,
  toneById,
} from './browShapes';

describe('bibliothèque', () => {
  it('porte les dix formes demandées, chacune décrivant ses quatre zones', () => {
    expect(BROW_SHAPES).toHaveLength(10);
    BROW_SHAPES.forEach((shape) => {
      expect(Object.keys(shape.zones).sort()).toEqual([...ZONE_IDS].sort());
      ZONE_IDS.forEach((id) => {
        expect(shape.zones[id].lift).toBeGreaterThanOrEqual(0);
        expect(shape.zones[id].weight).toBeGreaterThanOrEqual(0);
      });
    });
  });

  it('n’a aucun identifiant en double', () => {
    expect(new Set(BROW_SHAPES.map((s) => s.id)).size).toBe(10);
    expect(new Set(BROW_TONES.map((t) => t.id)).size).toBe(12);
    expect(new Set(BROW_EFFECTS.map((e) => e.id)).size).toBe(5);
  });

  // Une pastille qui n'afficherait pas la vraie teinte ne servirait à rien : on choisit
  // une teinture à l'œil.
  it('donne douze teintes en hexadécimal valide', () => {
    expect(BROW_TONES).toHaveLength(12);
    BROW_TONES.forEach((t) => expect(t.hex, `${t.label} : ${t.hex}`).toMatch(/^#[0-9A-F]{6}$/i));
  });

  it('les formes distinguent bien les silhouettes du métier', () => {
    // Un Fox Brow relève la queue ; un High Arch monte l'arche ; un Straight aplatit.
    expect(shapeById('fox').zones.tail.lift).toBeGreaterThan(shapeById('natural').zones.tail.lift);
    expect(shapeById('high-arch').zones.arch.lift).toBeGreaterThan(shapeById('soft-arch').zones.arch.lift);
    const droit = shapeById('straight').zones;
    expect(Math.abs(droit.arch.lift - droit.head.lift)).toBeLessThan(10);
  });

  it('retombe sur une valeur utilisable plutôt que sur rien', () => {
    expect(shapeById('inventé').id).toBe('natural');
    expect(toneById(undefined).id).toBe('t4');
  });
});

describe('normalizeLook', () => {
  it('complète un look absent', () => {
    expect(normalizeLook(undefined)).toEqual(EMPTY_BROW_LOOK);
  });

  it('borne tout réglage hors plage', () => {
    const l = normalizeLook({ intensity: 400, saturation: -30, archHeight: 'abc' });
    expect(l.intensity).toBe(100);
    expect(l.saturation).toBe(0);
    expect(l.archHeight).toBe(50);
  });

  it('borne les retouches de zone à ±50', () => {
    const l = normalizeLook({ zones: { arch: { lift: 900, weight: -900 } } });
    expect(l.zones.arch.lift).toBe(50);
    expect(l.zones.arch.weight).toBe(-50);
  });

  it('remplace un identifiant inconnu', () => {
    const l = normalizeLook({ shapeId: 'zzz', toneId: 'zzz', effectId: 'zzz' });
    expect(l.shapeId).toBe('natural');
    expect(l.toneId).toBe('t4');
    expect(l.effectId).toBe('natural');
  });
});

describe('clampPercent et clampOffset', () => {
  it('bornent et arrondissent', () => {
    expect(clampPercent(150)).toBe(100);
    expect(clampPercent(-8)).toBe(0);
    expect(clampOffset(80)).toBe(50);
    expect(clampOffset(-80)).toBe(-50);
    expect(clampOffset('abc')).toBe(0);
  });
});

describe('effectiveZone', () => {
  const base = normalizeLook({ shapeId: 'soft-arch' });

  it('rend le modèle tel quel quand rien n’est réglé', () => {
    expect(effectiveZone(base, 'arch').lift).toBe(shapeById('soft-arch').zones.arch.lift);
  });

  // Relever l'arche en soulevant aussi la tête ne relèverait rien du tout.
  it('la hauteur d’arche agit sur l’arche, pas sur la tête', () => {
    const haut = normalizeLook({ ...base, archHeight: 100 });
    expect(effectiveZone(haut, 'arch').lift).toBeGreaterThan(effectiveZone(base, 'arch').lift);
    expect(effectiveZone(haut, 'head').lift).toBe(effectiveZone(base, 'head').lift);
  });

  it('l’angle bascule la queue et la tête en sens inverse', () => {
    const incline = normalizeLook({ ...base, angle: 100 });
    expect(effectiveZone(incline, 'tail').lift).toBeGreaterThan(effectiveZone(base, 'tail').lift);
    expect(effectiveZone(incline, 'head').lift).toBeLessThan(effectiveZone(base, 'head').lift);
  });

  it('l’épaisseur agit sur toutes les zones', () => {
    const epais = normalizeLook({ ...base, thickness: 100 });
    ZONE_IDS.forEach((id) => {
      expect(effectiveZone(epais, id).weight).toBeGreaterThan(effectiveZone(base, id).weight);
    });
  });

  // Aucun visage n'est symétrique : c'est ce réglage qui permet de compenser au lieu de
  // dessiner deux sourcils faux à l'identique.
  it('la symétrie décale un côté par rapport à l’autre', () => {
    const asym = normalizeLook({ ...base, symmetry: 100 });
    expect(effectiveZone(asym, 'arch', 'right').lift).toBeGreaterThan(effectiveZone(asym, 'arch', 'left').lift);
    expect(effectiveZone(base, 'arch', 'right').lift).toBe(effectiveZone(base, 'arch', 'left').lift);
  });

  it('la retouche d’une zone ne touche pas les autres', () => {
    const retouche = normalizeLook({ ...base, zones: { tail: { lift: 30, weight: 0 } } });
    expect(effectiveZone(retouche, 'tail').lift).toBeGreaterThan(effectiveZone(base, 'tail').lift);
    expect(effectiveZone(retouche, 'arch').lift).toBe(effectiveZone(base, 'arch').lift);
  });

  it('ne sort jamais de 0–100, même en cumulant tous les réglages', () => {
    const extreme = normalizeLook({ archHeight: 100, angle: 100, thickness: 100, symmetry: 100, zones: { arch: { lift: 50, weight: 50 }, tail: { lift: 50, weight: 50 } } });
    ['left', 'right'].forEach((side) => {
      effectiveZones(extreme, side).forEach((z) => {
        expect(z.lift).toBeGreaterThanOrEqual(0);
        expect(z.lift).toBeLessThanOrEqual(100);
        expect(z.weight).toBeGreaterThanOrEqual(0);
        expect(z.weight).toBeLessThanOrEqual(100);
      });
    });
  });

  it('rend les quatre zones dans l’ordre tête → queue', () => {
    expect(effectiveZones(base).map((z) => z.id)).toEqual(['head', 'body', 'arch', 'tail']);
  });
});

describe('isCustomized et resetShape', () => {
  it('ne signale rien sur un look neuf', () => {
    expect(isCustomized(EMPTY_BROW_LOOK)).toBe(false);
  });

  it('signale une retouche de zone comme un réglage global', () => {
    expect(isCustomized({ ...EMPTY_BROW_LOOK, archHeight: 80 })).toBe(true);
    expect(isCustomized({ ...EMPTY_BROW_LOOK, zones: { tail: { lift: 10, weight: 0 } } })).toBe(true);
  });

  // On change souvent d'avis sur le dessin sans remettre en cause la teinte.
  it('remet la forme sans toucher à la coloration ni à l’effet', () => {
    const look = normalizeLook({ archHeight: 90, toneId: 't9', effectId: 'wet', intensity: 90, zones: { arch: { lift: 40, weight: 0 } } });
    const remis = resetShape(look);
    expect(remis.archHeight).toBe(50);
    expect(remis.zones.arch.lift).toBe(0);
    expect(remis.toneId).toBe('t9');
    expect(remis.effectId).toBe('wet');
    expect(remis.intensity).toBe(90);
    expect(isCustomized(remis)).toBe(false);
  });
});

describe('renderedTone', () => {
  it('produit toujours un hexadécimal valide, pour toute combinaison', () => {
    BROW_TONES.forEach((t) => {
      [0, 50, 100].forEach((saturation) =>
        [0, 50, 100].forEach((warmth) =>
          [0, 100].forEach((intensity) => {
            expect(renderedTone({ toneId: t.id, saturation, warmth, intensity }).hex).toMatch(/^#[0-9A-F]{6}$/);
          })
        )
      );
    });
  });

  it('désature vers un gris quand la saturation tombe à zéro', () => {
    const gris = renderedTone({ toneId: 't9', saturation: 0, warmth: 50, intensity: 50 });
    const [r, g, b] = gris.hex.slice(1).match(/../g).map((h) => parseInt(h, 16));
    expect(Math.abs(r - g)).toBeLessThanOrEqual(2);
    expect(Math.abs(g - b)).toBeLessThanOrEqual(2);
  });

  it('la chaleur déplace le rouge et le bleu en sens inverse', () => {
    const chaud = renderedTone({ toneId: 't4', warmth: 100, saturation: 60, intensity: 50 });
    const froid = renderedTone({ toneId: 't4', warmth: 0, saturation: 60, intensity: 50 });
    const rgb = (h) => h.slice(1).match(/../g).map((x) => parseInt(x, 16));
    expect(rgb(chaud.hex)[0]).toBeGreaterThan(rgb(froid.hex)[0]);
    expect(rgb(chaud.hex)[2]).toBeLessThan(rgb(froid.hex)[2]);
  });

  it('l’intensité assombrit sans jamais tout ramener au même noir', () => {
    const fort = renderedTone({ toneId: 't12', intensity: 100, saturation: 60, warmth: 50 });
    const faible = renderedTone({ toneId: 't12', intensity: 0, saturation: 60, warmth: 50 });
    const clarte = (h) => h.slice(1).match(/../g).reduce((s, x) => s + parseInt(x, 16), 0);
    expect(clarte(fort.hex)).toBeLessThan(clarte(faible.hex));
    expect(clarte(fort.hex)).toBeGreaterThan(0);
  });

  // Un sourcil totalement transparent se lit comme une panne, pas comme une teinture légère.
  it('ne fait jamais disparaître le sourcil', () => {
    expect(renderedTone({ transparency: 100 }).opacity).toBeGreaterThanOrEqual(0.15);
  });

  it('la transparence agit bien sur l’opacité', () => {
    expect(renderedTone({ transparency: 0 }).opacity).toBeGreaterThan(renderedTone({ transparency: 80 }).opacity);
  });
});

describe('lookSummary', () => {
  it('résume forme, effet, teinte et intensité', () => {
    expect(lookSummary({ shapeId: 'fox', effectId: 'lam-strong', toneId: 't9', intensity: 80 })).toBe(
      'Fox Brow · Laminé intense · n°9 Cuivré · 80 %'
    );
  });
});
