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

/** Rédacteur de tracés conscient du retournement : `p(point)` sort « x,y » déjà réfléchi
 *  si besoin. Les surfaces de peau ne sont pas toutes des lentilles entre les deux coins —
 *  il leur faut des points libres. */
function writer(mirrored) {
  return (point) => {
    const q = mirrored ? flipPoint(point) : point;
    return `${round(q.x)},${round(q.y)}`;
  };
}

/** Bande entre deux courbes partageant leurs extrémités : le motif de presque toutes les
 *  surfaces de l'œil — muqueuse, ombre portée, renflement du bord ciliaire, creux. */
function bandPath(start, end, outerControl, innerControl, mirrored) {
  const p = writer(mirrored);
  return (
    `M${p(start)} Q${p(outerControl)} ${p(end)} Q${p(innerControl)} ${p(start)} Z`
  );
}

/**
 * Tous les tracés de la vue, dans l'orientation demandée.
 *
 * @param {boolean} [mirrored]
 */
export function openEyePaths(mirrored = false) {
  const p = writer(mirrored);
  return {
    /** L'ouverture elle-même : le blanc de l'œil, et la découpe qui borne tout ce qui
     *  appartient au globe — iris, ombre de la frange, éclat humide, veinules. */
    aperture: lensPath(OPEN.upper, OPEN.lower, mirrored),
    upperLid: quadPath(OPEN.inner, OPEN.upper, OPEN.outer, mirrored),
    lowerLid: quadPath(OPEN.inner, OPEN.lower, OPEN.outer, mirrored),

    /** OMBRE PORTÉE DE LA FRANGE sur le globe. Une frange dense arrête réellement la
     *  lumière ; sans cette ombre, les cils sont posés SUR l'image au lieu d'y être. Large
     *  et très fondue — c'est une ombre, pas un trait. */
    lashShadow: lensPath(OPEN.upper, { x: OPEN.upper.x, y: OPEN.upper.y + 58 }, mirrored),

    /** RENFLEMENT DU BORD CILIAIRE — le « tightline ». La peau y est la plus épaisse et
     *  c'est de là que sortent réellement les cils : sans ce ressaut, la frange semble
     *  poussée à même le blanc de l'œil. */
    ridge: bandPath(
      OPEN.inner,
      OPEN.outer,
      OPEN.upper,
      { x: OPEN.upper.x, y: OPEN.upper.y + 34 },
      mirrored
    ),

    /** MUQUEUSE du bas, le liseré humide juste au-dessus de la paupière inférieure. */
    waterline: quadPath(OPEN.inner, { x: OPEN.lower.x, y: OPEN.lower.y - 12 }, OPEN.outer, mirrored),

    crease: quadPath(creaseStart(), OPEN.crease, creaseEnd(), mirrored),

    /** Paupière mobile : la peau entre le pli et la ligne ciliaire. */
    socket: bandPath(creaseStart(), creaseEnd(), OPEN.crease, OPEN.upper, mirrored),

    /** CARONCULE, la petite masse rosée du coin interne. C'est l'un des détails dont
     *  l'absence trahit le plus un œil dessiné : sans elle, le coin se referme en pointe
     *  nette, ce qu'aucun œil ne fait. */
    caruncle:
      `M${p({ x: OPEN.inner.x + 2, y: OPEN.inner.y - 2 })} ` +
      `Q${p({ x: OPEN.inner.x + 34, y: OPEN.inner.y - 26 })} ${p({ x: OPEN.inner.x + 42, y: OPEN.inner.y - 2 })} ` +
      `Q${p({ x: OPEN.inner.x + 32, y: OPEN.inner.y + 24 })} ${p({ x: OPEN.inner.x + 2, y: OPEN.inner.y - 2 })} Z`,
  };
}

/**
 * ÉCLAT HUMIDE du globe : la lueur diffuse sur le blanc de l'œil, du côté externe.
 *
 * Distincte des reflets de l'iris, qui sont des points nets : celle-ci est large et
 * fondue. C'est ce qui distingue un œil vivant d'un œil dessiné à plat.
 */
export function openGlobeSheen(mirrored = false) {
  const center = mirrored ? flipPoint({ x: 438, y: 296 }) : { x: 438, y: 296 };
  return { cx: round(center.x), cy: round(center.y), rx: 48, ry: 17 };
}

/** Modelé de la peau autour de l'œil.
 *
 *  CE QUI MANQUAIT LE PLUS. Un œil détouré sur du papier se lit toujours comme un
 *  pictogramme, si soigné soit-il : c'est l'arcade, le creux de l'orbite et la pommette
 *  qui en font un regard. Tout est ici en tons très doux et fondus — la peau doit ASSEOIR
 *  la frange, jamais lui disputer l'attention.
 *
 *  Le champ de peau se dissout dans le papier sur ses bords (dégradé radial côté
 *  définitions) : pas de rectangle de peau en travers de la planche, pas de cadrage
 *  photographique. L'œil est installé dans un visage qui s'efface.
 */
export function skinPaths(mirrored = false) {
  const p = writer(mirrored);
  return {
    /** Arcade sourcilière : la saillie osseuse sous le sourcil, plus claire car elle prend
     *  la lumière. Entre la ligne du sourcil et le pli. */
    browBone: bandPath(creaseStart(), creaseEnd(), { x: 300, y: -88 }, OPEN.crease, mirrored),

    /** Sillon lacrymal, sous la paupière inférieure. Discret : marqué, il donnerait un
     *  regard fatigué, ce qu'aucune cliente ne veut voir de sa pose. */
    tearTrough: bandPath(OPEN.inner, OPEN.outer, { x: 300, y: 516 }, OPEN.lower, mirrored),

    /** Racine du nez, côté coin interne : une ombre verticale très douce qui donne au
     *  visage son relief central. */
    noseBridge: `M${p({ x: -20, y: 40 })} Q${p({ x: 176, y: 250 })} ${p({ x: -20, y: 476 })} Z`,

    /** Haut de la pommette : une clarté large sous l'œil, qui referme le modelé. */
    cheek: `M${p({ x: 24, y: 500 })} Q${p({ x: 300, y: 348 })} ${p({ x: 576, y: 500 })} Z`,
  };
}

/**
 * FIBRES DE L'IRIS : les stries radiales entre la pupille et le limbe.
 *
 * C'est le détail qui fait passer l'iris de la pastille au tissu. Elles alternent claires
 * et sombres autour de la teinte de base, et s'arrêtent avant l'anneau limbique — dans un
 * vrai iris, la trame se referme sous le limbe.
 *
 * @param {{mirrored?:boolean, count?:number, seed?:number}} [options]
 * @returns {Array<{key:number, d:string, width:number, opacity:number, light:boolean}>}
 */
export function irisFibres({ mirrored = false, count = 104, seed = 1789 } = {}) {
  const iris = openEyeIris(false);
  const random = seededRandom(seed);
  return Array.from({ length: count }, (_, i) => {
    const angle = (i / count) * Math.PI * 2 + (random() - 0.5) * 0.06;
    const from = iris.pupilR + 1 + random() * 7;
    const to = iris.r - 5 - random() * 18;
    const at = (radius) => {
      const point = { x: iris.cx + Math.cos(angle) * radius, y: iris.cy + Math.sin(angle) * radius };
      return mirrored ? flipPoint(point) : point;
    };
    const a = at(from);
    const b = at(to);
    return {
      key: i,
      d: `M${round(a.x)},${round(a.y)} L${round(b.x)},${round(b.y)}`,
      width: round(0.8 + random() * 1.4),
      // Assez pour que le tissu se devine, pas assez pour faire un soleil : des stries
      // trop marquées se lisent comme un motif imprimé sur l'iris, pas comme sa trame.
      opacity: round(0.11 + random() * 0.24),
      light: random() < 0.46,
    };
  });
}

/**
 * VEINULES du blanc de l'œil, vers les deux coins.
 *
 * Volontairement peu nombreuses et très pâles : c'est le détail le plus facile à rater.
 * Trop appuyées, elles donnent un œil irrité — l'exact contraire de ce qu'une planche de
 * pose doit montrer. Elles sont découpées par l'ouverture, comme tout ce qui appartient au
 * globe.
 *
 * @param {{mirrored?:boolean, count?:number, seed?:number}} [options]
 */
export function globeVeins({ mirrored = false, count = 7, seed = 4211 } = {}) {
  const random = seededRandom(seed);
  const center = { x: 300, y: 252 };
  return Array.from({ length: count }, (_, i) => {
    // Aux coins seulement : le centre du globe est masqué par l'iris, une veinule y serait
    // invisible et n'aurait coûté que des octets.
    const t = i % 2 === 0 ? 0.05 + random() * 0.15 : 0.8 + random() * 0.15;
    const top = upperLidPoint(t);
    const bottom = lowerLidPoint(t);
    const k = 0.3 + random() * 0.45;
    const start = { x: top.x + (bottom.x - top.x) * k, y: top.y + (bottom.y - top.y) * k };
    const dir = unit(start, center);
    const length = 26 + random() * 40;
    const end = { x: start.x + dir.x * length, y: start.y + dir.y * length };
    const perp = { x: -dir.y, y: dir.x };
    const bend = (random() - 0.5) * 26;
    const control = {
      x: (start.x + end.x) / 2 + perp.x * bend,
      y: (start.y + end.y) / 2 + perp.y * bend,
    };
    const [a, c, b] = [start, control, end].map((q) => (mirrored ? flipPoint(q) : q));
    return {
      key: i,
      d: `M${round(a.x)},${round(a.y)} Q${round(c.x)},${round(c.y)} ${round(b.x)},${round(b.y)}`,
      width: round(0.7 + random() * 0.8),
      opacity: round(0.1 + random() * 0.14),
    };
  });
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
    // Le grand reflet est tenu à l'ÉCART DE LA PUPILLE : à cheval sur son bord, il en
    // mangeait le haut-gauche et la pupille semblait décentrée — un défaut qu'on impute
    // au dessin de l'œil alors qu'il vient du reflet.
    highlights: [
      { ...offset(-41, -39), r: 15, opacity: 0.82 },
      { ...offset(38, 33), r: 8, opacity: 0.48 },
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
  /** Ombre portée de la frange sur le globe : dense contre la paupière, éteinte une
   *  quarantaine d'unités plus bas. Une ombre franche ferait un bandeau. */
  shadow: {
    y0: round(upperLidPoint(0.5).y),
    y1: round(upperLidPoint(0.5).y + 46),
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
  irisRim: PALETTE.irisRim,
  irisFibreLight: PALETTE.irisFibreLight,
  irisFibreDark: PALETTE.irisFibreDark,
  pupil: PALETTE.pupil,
  highlight: PALETTE.highlight,
  lidLine: PALETTE.ink,
  crease: PALETTE.creaseLine,
  skinHigh: PALETTE.skinHigh,
  skinLow: PALETTE.skinLow,
  caruncle: PALETTE.caruncle,
  vein: PALETTE.vein,
};
