/** Géométrie de la VUE ŒIL OUVERT.
 *
 *  À QUOI ELLE SERT. La planche technique dessine un œil FERMÉ, vu de dessus : c'est la
 *  position de travail, celle où l'on pose, et c'est sur elle qu'on règle les secteurs.
 *  Mais ce n'est pas ce que la cliente verra. Un dégradé 9-13 lu à plat ne dit pas
 *  grand-chose du regard qu'il donne une fois les yeux ouverts, et c'est précisément ce
 *  qu'on veut pouvoir montrer avant de commencer.
 *
 *  UN SCHÉMA, PAS UN PORTRAIT. Aucune photo, aucune peau, aucune couleur d'iris : un œil
 *  dessiné, dans la même encre et sur le même papier que la planche. Une simulation
 *  photoréaliste promettrait une exactitude qu'on ne peut pas tenir — la forme de l'œil de
 *  chaque cliente est différente — là où un schéma annonce franchement ce qu'il est.
 *
 *  LE MÊME MOTEUR DE CILS. Cette vue ne redessine pas les cils : elle fournit un `frame`
 *  — d'où part un cil, vers où il se dirige — à `buildExtensionLashes`, qui reste seul à
 *  savoir traduire longueur, courbure, diamètre, densité et technique. Deux moteurs de
 *  dessin finiraient par diverger, et la vue ouverte montrerait autre chose que la fiche.
 *
 *  REPÈRE. Même viewBox que la planche (600 × 480) et même convention : `t` parcourt la
 *  ligne ciliaire de 0 (gauche du dessin) à 1 (droite), le secteur d'index 0 restant
 *  toujours le coin interne — c'est le DESSIN qu'on retourne pour l'œil gauche.
 */

import { LASH_PX_MAX, PALETTE, VIEWBOX, seededRandom, taperedPath } from './lashGeometry';

/** Contour de l'œil ouvert, dans l'orientation NON retournée : coin interne à gauche.
 *
 *  Les deux coins ne sont pas à la même hauteur — le coin externe est légèrement plus haut
 *  que l'interne — parce qu'un œil dont les deux coins s'alignent fait masque, pas regard.
 *  C'est aussi ce léger relèvement qui rend lisible l'effet d'un Cat Eye.
 */
const OPEN = {
  inner: { x: 72, y: 268 },
  outer: { x: 528, y: 240 },
  /** Point de contrôle de la paupière supérieure : c'est lui qui donne l'ouverture. */
  upper: { x: 300, y: 78 },
  /** Et celui de la paupière inférieure. */
  lower: { x: 300, y: 424 },
  /** Pli de la paupière, plus haut que l'arête et légèrement rentré aux deux coins. */
  crease: { x: 300, y: 16 },
  creaseInset: 18,
  creaseLift: 26,
};

/** Foyer des cils supérieurs, SOUS l'œil : la frange s'en éloigne, donc elle monte et
 *  s'évase vers les coins. Même construction que sur la planche fermée, où le foyer est
 *  au-dessus et les cils descendent — un seul principe, deux positions. */
const UPPER_FOCUS = { x: 300, y: 620 };

/** Foyer des cils inférieurs, au-dessus : ils descendent. */
const LOWER_FOCUS = { x: 300, y: -120 };

/** Cils du bas : courts, clairsemés, décoratifs. Ils ne portent aucune donnée de la fiche
 *  — on ne pose pas d'extensions dessus — mais sans eux l'œil a l'air amputé. */
export const LOWER_LASH_COUNT = 46;

const round = (n) => Math.round(n * 100) / 100;

function quad(p0, control, p2, t) {
  const u = 1 - t;
  return {
    x: u * u * p0.x + 2 * u * t * control.x + t * t * p2.x,
    y: u * u * p0.y + 2 * u * t * control.y + t * t * p2.y,
  };
}

function unit(from, to) {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const length = Math.hypot(dx, dy) || 1;
  return { x: dx / length, y: dy / length };
}

/** Réflexion autour de l'axe vertical du cadre. Les deux yeux d'une même fiche sont le
 *  même dessin retourné, jamais deux dessins. */
const flipPoint = (p) => ({ x: VIEWBOX.width - p.x, y: p.y });
const flipVector = (v) => ({ x: -v.x, y: v.y });

const creaseStart = () => ({ x: OPEN.inner.x + OPEN.creaseInset, y: OPEN.inner.y - OPEN.creaseLift });
const creaseEnd = () => ({ x: OPEN.outer.x - OPEN.creaseInset, y: OPEN.outer.y - OPEN.creaseLift });

// --- Lignes de l'œil --------------------------------------------------------------

/** Point de la paupière supérieure — la LIGNE CILIAIRE — à la position `t`. */
export function upperLidPoint(t) {
  return quad(OPEN.inner, OPEN.upper, OPEN.outer, t);
}

/** Point de la paupière inférieure à la position `t`. */
export function lowerLidPoint(t) {
  return quad(OPEN.inner, OPEN.lower, OPEN.outer, t);
}

/** Direction d'un cil supérieur : vers le haut, et d'autant plus vers l'extérieur qu'on
 *  s'approche d'un coin. */
export function upperLashDirection(t) {
  return unit(UPPER_FOCUS, upperLidPoint(t));
}

/** Direction d'un cil inférieur : vers le bas, même construction inversée. */
export function lowerLashDirection(t) {
  return unit(LOWER_FOCUS, lowerLidPoint(t));
}

/**
 * Repère de pose des extensions sur l'œil ouvert, prêt pour `buildExtensionLashes`.
 *
 * `x` croît avec `t` dans les deux orientations : c'est ce qui permet aux secteurs —
 * découpés une seule fois, en coordonnées de la planche — de tomber au bon endroit sur
 * l'œil retourné comme sur l'autre.
 *
 * @param {{mirrored?: boolean}} [options]
 * @returns {{point: (t:number) => {x:number,y:number}, direction: (t:number) => {x:number,y:number}}}
 */
export function openLashFrame({ mirrored = false } = {}) {
  if (!mirrored) return { point: upperLidPoint, direction: upperLashDirection };
  return {
    point: (t) => flipPoint(upperLidPoint(1 - t)),
    direction: (t) => flipVector(upperLashDirection(1 - t)),
  };
}

// --- Tracés -----------------------------------------------------------------------

/** Une quadratique retournée reste une quadratique : il suffit de réfléchir ses trois
 *  points de contrôle. On émet donc de vraies courbes, et non des polylignes échantillonnées
 *  qui alourdiraient le fichier exporté. */
function quadPath(p0, control, p2, mirrored, close = false) {
  const [a, c, b] = [p0, control, p2].map((p) => (mirrored ? flipPoint(p) : p));
  const d = `M${round(a.x)},${round(a.y)} Q${round(c.x)},${round(c.y)} ${round(b.x)},${round(b.y)}`;
  return close ? `${d} Z` : d;
}

function lensPath(control0, control1, mirrored) {
  const [start, end] = [OPEN.inner, OPEN.outer].map((p) => (mirrored ? flipPoint(p) : p));
  const [c0, c1] = [control0, control1].map((p) => (mirrored ? flipPoint(p) : p));
  return (
    `M${round(start.x)},${round(start.y)} ` +
    `Q${round(c0.x)},${round(c0.y)} ${round(end.x)},${round(end.y)} ` +
    `Q${round(c1.x)},${round(c1.y)} ${round(start.x)},${round(start.y)} Z`
  );
}

/**
 * Tous les tracés de la vue, dans l'orientation demandée.
 *
 * @param {boolean} [mirrored]
 * @returns {{aperture:string, upperLid:string, lowerLid:string, upperShade:string,
 *   waterline:string, crease:string, socket:string}}
 */
export function openEyePaths(mirrored = false) {
  return {
    /** L'ouverture elle-même : le blanc de l'œil, et la découpe qui borne l'iris. */
    aperture: lensPath(OPEN.upper, OPEN.lower, mirrored),
    upperLid: quadPath(OPEN.inner, OPEN.upper, OPEN.outer, mirrored),
    lowerLid: quadPath(OPEN.inner, OPEN.lower, OPEN.outer, mirrored),
    /** Ombre portée de la paupière sur le globe. C'est ELLE qui donne le modelé : sans
     *  cette bande, l'œil ouvert est un contour, pas un volume. Découpée par `aperture`. */
    upperShade: lensPath(OPEN.upper, { x: OPEN.upper.x, y: OPEN.upper.y + 58 }, mirrored),
    /** Muqueuse du bas, une ligne claire juste au-dessus de la paupière inférieure. */
    waterline: quadPath(
      OPEN.inner,
      { x: OPEN.lower.x, y: OPEN.lower.y - 12 },
      OPEN.outer,
      mirrored
    ),
    crease: quadPath(creaseStart(), OPEN.crease, creaseEnd(), mirrored),
    /** Creux de l'orbite : la peau entre le pli et la ligne ciliaire. */
    socket: (() => {
      const [a, b] = [creaseStart(), creaseEnd()].map((p) => (mirrored ? flipPoint(p) : p));
      const [c0, c1] = [OPEN.crease, OPEN.upper].map((p) => (mirrored ? flipPoint(p) : p));
      return (
        `M${round(a.x)},${round(a.y)} ` +
        `Q${round(c0.x)},${round(c0.y)} ${round(b.x)},${round(b.y)} ` +
        `Q${round(c1.x)},${round(c1.y)} ${round(a.x)},${round(a.y)} Z`
      );
    })(),
  };
}

/**
 * Iris, pupille et reflets.
 *
 * Le cercle DÉBORDE volontairement l'ouverture en haut et en bas : c'est la découpe par
 * `aperture` qui le rogne, exactement comme la paupière rogne un vrai iris. Un iris
 * entièrement visible, posé entre les deux paupières sans les toucher, donne le regard fixe
 * d'un dessin animé.
 *
 * @param {boolean} [mirrored]
 */
export function openEyeIris(mirrored = false) {
  const center = mirrored ? flipPoint({ x: 296, y: 252 }) : { x: 296, y: 252 };
  const offset = (dx, dy) => ({ x: center.x + dx, y: center.y + dy });
  return {
    cx: round(center.x),
    cy: round(center.y),
    r: 92,
    pupilR: 34,
    // Deux reflets, pas un : un seul point blanc fait bille de verre. Le grand marque la
    // source de lumière, le petit, à l'opposé et bien plus discret, la renvoie.
    //
    // ILS NE SE RETOURNENT PAS AVEC L'ŒIL, et c'est volontaire : une pièce n'a qu'une
    // lampe, elle éclaire les deux yeux du même côté. Les faire basculer donnerait deux
    // sources contradictoires — et surtout, elles contrediraient le dégradé de l'iris, dont
    // la lumière, elle, reste en haut à gauche.
    highlights: [
      { ...offset(-34, -34), r: 16, opacity: 0.85 },
      { ...offset(36, 31), r: 8, opacity: 0.5 },
    ],
  };
}

/** Bornes des dégradés propres à la vue ouverte.
 *
 *  Elles ne sont PAS celles de la planche : là-bas les cils descendent, ici ils montent.
 *  Réutiliser les mêmes bornes teindrait toute la frange de la seule couleur de racine —
 *  un noir uni, sans le moindre relief — et rien ne le signalerait, puisque le dessin
 *  s'afficherait normalement. D'où ce calcul, déduit de la géométrie plutôt qu'écrit à la
 *  main : si l'ouverture de l'œil bouge, le relief suit.
 *
 *  `y0` est toujours le DÉBUT du dégradé au sens de la planche — la racine pour les cils,
 *  le creux de l'orbite pour la paupière — afin que les définitions SVG des deux vues
 *  s'écrivent exactement de la même façon.
 */
export const OPEN_GRADIENT_BOUNDS = {
  lash: {
    y0: Math.max(OPEN.inner.y, OPEN.outer.y) + 8,
    y1: round(upperLidPoint(0.5).y - LASH_PX_MAX * 1.15),
  },
  lid: {
    y0: OPEN.crease.y + 80,
    y1: Math.max(OPEN.inner.y, OPEN.outer.y) + 4,
  },
};

// --- Cils du bas ------------------------------------------------------------------

/**
 * Frange inférieure : courte, clairsemée, purement décorative.
 *
 * Elle ne lit AUCUNE valeur de la fiche, et c'est voulu — on ne pose pas d'extensions sur
 * la paupière inférieure. Elle est là pour que l'œil se lise comme un œil ; la lui retirer
 * donnerait un regard amputé qui détournerait l'attention de ce qu'on vient regarder.
 *
 * @param {{mirrored?:boolean, count?:number, seed?:number}} [options]
 * @returns {Array<{key:number, d:string, opacity:number}>}
 */
export function buildLowerLashes({ mirrored = false, count = LOWER_LASH_COUNT, seed = 613 } = {}) {
  const random = seededRandom(seed);
  return Array.from({ length: count }, (_, i) => {
    const t = 0.08 + (i / Math.max(1, count - 1)) * 0.84 + (random() - 0.5) * 0.01;
    const base = mirrored ? flipPoint(lowerLidPoint(t)) : lowerLidPoint(t);
    const raw = lowerLashDirection(t);
    const dir = mirrored ? flipVector(raw) : raw;
    const perp = { x: -dir.y, y: dir.x };
    // Plus courts au centre qu'aux coins, comme la frange du haut mais dans un rapport
    // beaucoup plus resserré : des cils du bas trop longs font faux cils.
    const length = (11 + random() * 9) * (0.7 + 0.5 * Math.abs(t - 0.5) * 2);
    const bend = (0.5 - t) * 2 * (3 + random() * 3) * (mirrored ? -1 : 1);
    const tip = { x: base.x + dir.x * length, y: base.y + dir.y * length };
    const control = {
      x: base.x + dir.x * length * 0.5 + perp.x * bend,
      y: base.y + dir.y * length * 0.5 + perp.y * bend,
    };
    return {
      key: i,
      d: taperedPath(base, control, tip, round(0.9 + random() * 0.6)),
      opacity: round(0.4 + random() * 0.3),
    };
  });
}

/** Couleurs de la vue, reprises telles quelles de la palette de la planche : les deux vues
 *  sortent du même papier, et une seconde palette finirait par s'en écarter. */
export const OPEN_PALETTE = {
  sclera: PALETTE.sclera,
  scleraShade: PALETTE.scleraShade,
  iris: PALETTE.iris,
  irisRim: PALETTE.irisRim,
  pupil: PALETTE.pupil,
  highlight: PALETTE.highlight,
  lidLine: PALETTE.ink,
  crease: PALETTE.creaseLine,
};
