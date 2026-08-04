import { ZONE_IDS, effectById, effectiveZones, normalizeLook } from './browShapes';
import { taperedPath } from './lashGeometry';

/** Géométrie du Brow Lift : deux sourcils, dessinés depuis les quatre zones.
 *
 *  Comme pour le Lash Studio, tout est CALCULÉ — aucune coordonnée n'est écrite à la main
 *  dans un composant, et le rendu reste vectoriel donc exportable sans perte.
 *
 *  Repère : viewBox de 640 × 260, les deux sourcils vus de face. `t` parcourt une arête de
 *  0 (tête, près du nez) à 1 (queue, vers la tempe). Le sourcil GAUCHE de l'image est le
 *  droit de la cliente — on la regarde en face — et c'est le miroir du même tracé.
 */

export const BROW_VIEWBOX = { width: 640, height: 260 };

/** Demi-largeur d'un sourcil et écart entre les deux, en unités du viewBox. */
const BROW_SPAN = 236;
const GAP = 44;
const BASELINE = 176;

/** Amplitude verticale d'un `lift` de 0 à 100.
 *
 *  Réglée à l'œil sur le dessin, pas au jugé : à 104, l'écart entre une tête basse et une
 *  arche haute atteignait deux fois l'épaisseur du sourcil, et la paire ondulait au lieu de
 *  s'arquer — on lisait une vague, pas un sourcil. À 68, l'écart vaut environ une fois et
 *  demie l'épaisseur, ce qui est la proportion d'un vrai sourcil, et les dix formes restent
 *  parfaitement distinctes les unes des autres. */
const LIFT_RANGE = 68;

/** Épaisseur du sourcil aux deux bornes de `weight`. */
const WEIGHT_MIN = 7;
const WEIGHT_MAX = 30;

const round = (n) => Math.round(n * 100) / 100;

/** Générateur à graine : le dessin doit être IDENTIQUE d'un rendu à l'autre, sans quoi
 *  les poils frémiraient à chaque mouvement de curseur. */
function seededRandom(seed) {
  let a = seed >>> 0;
  return () => {
    a += 0x6d2b79f5;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Position `t` du centre de chaque zone le long de l'arête.
 *  L'arche est aux deux tiers et non au milieu : c'est là qu'elle tombe sur un vrai
 *  sourcil, et la déplacer au centre donne un dessin de bande dessinée. */
export const ZONE_ANCHORS = { head: 0.06, body: 0.36, arch: 0.66, tail: 0.98 };

/** Interpolation lisse entre les quatre ancres — un sourcil est une courbe continue, pas
 *  quatre segments mis bout à bout. */
function sampleAt(t, values) {
  const anchors = ZONE_IDS.map((id) => ZONE_ANCHORS[id]);
  if (t <= anchors[0]) return values[0];
  if (t >= anchors[anchors.length - 1]) return values[values.length - 1];
  for (let i = 0; i < anchors.length - 1; i += 1) {
    if (t >= anchors[i] && t <= anchors[i + 1]) {
      const span = anchors[i + 1] - anchors[i];
      const local = span === 0 ? 0 : (t - anchors[i]) / span;
      // Lissage en cosinus : la jonction entre deux zones ne doit pas faire d'angle.
      const eased = (1 - Math.cos(local * Math.PI)) / 2;
      return values[i] * (1 - eased) + values[i + 1] * eased;
    }
  }
  return values[values.length - 1];
}

/**
 * Arête d'un sourcil : la ligne médiane, et l'épaisseur en chaque point.
 *
 * @param {object} look séance
 * @param {'left'|'right'} side côté DE L'IMAGE
 * @returns {(t:number) => {x:number, y:number, weight:number}}
 */
export function browSpine(look, side) {
  const clean = normalizeLook(look);
  // La symétrie est exprimée du point de vue de la cliente : le sourcil de gauche sur
  // l'image est le sien à droite.
  const zones = effectiveZones(clean, side === 'left' ? 'right' : 'left');
  const lifts = zones.map((z) => z.lift);
  const weights = zones.map((z) => z.weight);

  // La longueur raccourcit par la QUEUE, jamais par la tête : c'est ainsi qu'on épile.
  const lengthFactor = 0.72 + (clean.length / 100) * 0.42;
  const span = BROW_SPAN * lengthFactor;
  const inner = BROW_VIEWBOX.width / 2 + GAP / 2;

  return (t) => {
    const lift = sampleAt(t, lifts);
    const weight = sampleAt(t, weights);
    const x = side === 'right' ? inner + span * t : BROW_VIEWBOX.width - inner - span * t;
    return {
      x: round(x),
      y: round(BASELINE - (lift / 100) * LIFT_RANGE),
      weight: WEIGHT_MIN + (weight / 100) * (WEIGHT_MAX - WEIGHT_MIN),
    };
  };
}

/** Silhouette pleine d'un sourcil, pour l'aplat de couleur sous les poils. */
export function browOutline(look, side, steps = 40) {
  const spine = browSpine(look, side);
  const top = [];
  const bottom = [];
  for (let i = 0; i <= steps; i += 1) {
    const t = i / steps;
    const p = spine(t);
    // Les extrémités s'affinent : un sourcil ne se termine pas au carré.
    const taper = Math.min(1, Math.sin(Math.PI * Math.min(1, Math.max(0, t))) * 1.6 + 0.15);
    const half = (p.weight / 2) * taper;
    top.push({ x: p.x, y: p.y - half });
    bottom.push({ x: p.x, y: p.y + half });
  }
  const line = (points) => points.map((p, i) => `${i === 0 ? 'M' : 'L'}${round(p.x)},${round(p.y)}`).join(' ');
  return `${line(top)} ${line([...bottom].reverse()).replace('M', 'L')} Z`;
}

/**
 * Poils d'un sourcil.
 *
 * Ils partent de l'arête et remontent en s'écartant : c'est `fan` de l'effet qui décide de
 * combien. Un laminé intense les redresse presque à la verticale, un fluffy les éparpille.
 *
 * @returns {Array<{key:number, d:string, opacity:number}>}
 */
export function buildBrowHairs(look, side, { count = 380, seed = 7311 } = {}) {
  const clean = normalizeLook(look);
  const effect = effectById(clean.effectId);
  const spine = browSpine(look, side);
  const random = seededRandom(seed);
  const total = Math.round(count * effect.density * (0.55 + (clean.density / 100) * 0.9));

  return Array.from({ length: total }, (_, i) => {
    const t = 0.015 + (i / Math.max(1, total - 1)) * 0.97;
    const p = spine(t);
    const jitter = (random() - 0.5) * p.weight * 0.9;
    const base = { x: p.x + (random() - 0.5) * 3, y: p.y + jitter };

    // Direction : vers la queue, et d'autant plus vers le haut que l'effet écarte.
    const toTail = side === 'right' ? 1 : -1;
    const length = (11 + random() * 13) * (1 - 0.35 * t);
    const rise = 0.35 + effect.fan * (0.5 + random() * 0.8);
    const tip = { x: base.x + toTail * length * (1 - rise * 0.5), y: base.y - length * rise };
    const control = {
      x: (base.x + tip.x) / 2 + toTail * 2,
      y: (base.y + tip.y) / 2 - length * 0.18,
    };

    return {
      key: i,
      d: taperedPath(base, control, tip, 1.3 + random() * 0.9),
      opacity: round(0.6 + random() * 0.4),
    };
  });
}

/** Point de saisie d'une zone, pour poser la pastille cliquable sur le dessin. */
export function zoneHandles(look, side) {
  const spine = browSpine(look, side);
  return ZONE_IDS.map((id) => {
    const p = spine(ZONE_ANCHORS[id]);
    return { id, x: p.x, y: round(p.y - p.weight / 2 - 16) };
  });
}

/** Reflet du laminé : un arc clair posé sur le haut du sourcil. Absent quand l'effet ne
 *  brille pas — un reflet permanent ferait un sourcil mouillé en permanence. */
export function browGloss(look, side) {
  const clean = normalizeLook(look);
  const effect = effectById(clean.effectId);
  if (effect.gloss <= 0) return null;
  const spine = browSpine(look, side);
  const points = [];
  for (let i = 0; i <= 24; i += 1) {
    const t = 0.18 + (i / 24) * 0.62;
    const p = spine(t);
    points.push({ x: p.x, y: round(p.y - p.weight * 0.26) });
  }
  return {
    d: points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' '),
    opacity: round(effect.gloss),
  };
}
