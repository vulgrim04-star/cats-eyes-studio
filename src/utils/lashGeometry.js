/** Géométrie du schéma Lash Map.
 *
 * Tout est calculé : aucune coordonnée n'est écrite à la main dans un composant, et
 * rien n'est dessiné en canvas — le schéma reste un SVG vectoriel, donc zoomable,
 * imprimable et exportable en PDF sans perte.
 *
 * Repère : viewBox de 600 × 440, œil FERMÉ vu de face. Le bord ciliaire est une
 * Bézier quadratique en « U » très ouvert ; au-dessus s'ouvre l'éventail des secteurs
 * (rayons divergents issus d'un foyer situé SOUS l'œil), en dessous tombe la frange de
 * cils (rayons issus d'un foyer situé AU-DESSUS, ce qui les fait s'éventer vers
 * l'extérieur comme sur une vraie paupière).
 *
 * Deux conventions valables partout dans le module :
 *   • `t` parcourt le bord ciliaire de 0 (extrémité gauche du dessin) à 1 (droite) ;
 *   • le secteur d'index 0 est TOUJOURS le coin interne — c'est le dessin qui est
 *     retourné pour l'œil gauche (`mirrored`), jamais l'ordre des données.
 */

import { MM_MAX, MM_MIN, clampMm, interpolateLength, parseMm } from './lashCalculations';

export const VIEWBOX = { width: 600, height: 480 };

/** Palette du schéma, en valeurs littérales et NON en variables CSS de thème.
 *
 * Deux raisons, dans cet ordre : le schéma est une planche imprimable — il doit sortir
 * identique à l'écran, en PDF et en PNG, sans dépendre du thème de l'appareil ; et des
 * cils dessinés en « encre » sur un fond sombre seraient invisibles en mode nuit. Le
 * schéma est donc toujours posé sur son propre papier clair, dans les deux thèmes.
 */
export const PALETTE = {
  paper: '#FDFBF7',
  /** Pile de polices écrite en toutes lettres : un `var(--font-body)` ne signifierait
   *  plus rien dans un SVG exporté puis ouvert ailleurs. */
  fontStack: "'DM Sans','Segoe UI',sans-serif",
  ink: '#241A12',
  lidTint: '#F1E7DA',
  sectorFill: '#FFFFFF',
  /** Remplissage du secteur retenu : crème chaud plutôt que blanc pur, qui ferait un
   *  trou dans la paupière modelée. */
  sectorActiveFill: '#FBF4E7',
  sectorStroke: '#E0D5C6',
  accent: '#C9A961',
  accentDark: '#7A612A',
  muted: '#9C8A73',
  text: '#2B2724',
  /** Alerte de sécurité. Un ambre franchement plus orangé que l'or de la marque : ces
   *  deux couleurs se côtoient sur le schéma et ne doivent pas se confondre. */
  warnFill: '#F8E3C4',
  warnStroke: '#B4661C',

  /** Valeurs du RELIEF.
   *
   *  Un cil n'est pas d'une seule encre : il est dense et presque noir à la racine, et
   *  s'éclaircit en s'affinant vers la pointe. Tout était auparavant tracé dans le seul
   *  `ink`, d'où l'aspect de peigne à dents égales. Ces deux bornes alimentent un unique
   *  dégradé partagé par les ~250 tracés — une définition, aucun surcoût de rendu. */
  lashRoot: '#0B0705',
  lashTip: '#4A3728',
  /** Plan arrière de la frange : plus clair et légèrement flouté, il creuse la
   *  profondeur au lieu d'ajouter des traits. */
  lashBackRoot: '#33281E',
  lashBackTip: '#8A7660',
  browRoot: '#2A1E14',
  browTip: '#7E6549',
  /** Modelé de la paupière : du creux de l'orbite (haut) au bord ciliaire (bas). */
  lidHigh: '#FBF5EC',
  lidLow: '#EADCC7',
  creaseLine: '#DAC7AC',
};

/** Bord ciliaire de l'œil fermé.
 *  L'œil occupe 76 % de la largeur du cadre : les marges latérales restantes suffisent au
 *  sourcil et aux libellés d'axe. Les élargir davantage ferait sortir les coins de
 *  l'éventail du cadre ; les resserrer rendrait les secteurs trop étroits pour le doigt
 *  (voir le test de taille des cibles). */
const LID = { p0: { x: 72, y: 258 }, p1: { x: 300, y: 486 }, p2: { x: 528, y: 258 } };

/** Foyer des secteurs, sous l'œil : plus il est bas, plus l'éventail est resserré. */
const FAN_FOCUS = { x: 300, y: 880 };

/** Foyer des cils, au-dessus de l'œil : donne l'évasement de la frange. */
const LASH_FOCUS = { x: 300, y: -260 };

/** Hauteur des secteurs, mesurée le long du rayon. */
export const SECTOR_HEIGHT = 168;

/** On n'ouvre pas de secteur sur les tout derniers pourcents du bord ciliaire : la
 *  paupière y est trop pincée pour qu'on y pose quoi que ce soit. */
const T_MIN = 0.045;
const T_MAX = 0.955;

/** Un mapping en dessous de 6 secteurs ne décrit plus une courbe ; au-dessus de 16 les
 *  secteurs deviennent trop étroits pour être visés au doigt. */
export const SECTOR_MIN = 6;
export const SECTOR_MAX = 16;
export const SECTOR_DEFAULT = 12;

/** Découpage de départ sur téléphone. Douze secteurs sur une planche de 390 px ne
 *  laissent que 29 px de large aux secteurs centraux, très en dessous des 44 px d'une
 *  cible tactile confortable ; huit les ramènent au-delà du seuil. */
export const SECTOR_COMPACT = 8;

/** Seuil du mode téléphone. À garder aligné sur le point de rupture des feuilles de
 *  style du module (`@media (max-width: 719px)`). */
export const COMPACT_VIEWPORT_PX = 720;

/** Découpage à la CRÉATION d'une fiche, selon la largeur d'écran.
 *
 *  Ne s'applique jamais à une fiche déjà enregistrée : le nombre de secteurs est une
 *  donnée de la séance, pas un réglage d'affichage — rouvrir une fiche sur un autre
 *  appareil ne doit pas la redécouper.
 * @param {number} width largeur de la fenêtre, en pixels CSS
 * @returns {number}
 */
export function sectorCountForWidth(width) {
  if (!Number.isFinite(width) || width <= 0) return SECTOR_DEFAULT;
  return width < COMPACT_VIEWPORT_PX ? SECTOR_COMPACT : SECTOR_DEFAULT;
}

/** Longueur dessinée d'un cil d'extension, aux deux bornes métier. Volontairement non
 *  proportionnelle : un 6 mm à l'échelle réelle serait invisible sur le schéma. */
const LASH_PX_MIN = 38;
const LASH_PX_MAX = 82;

/** Densité de la frange.
 *
 *  Volontairement élevée : c'est la densité qui fait la différence entre une frange et un
 *  peigne. Chaque cil étant désormais une silhouette fuselée et non un trait d'épaisseur
 *  constante, on peut en poser beaucoup plus sans que le dessin ne s'empâte — les pointes
 *  s'affinent et se chevauchent au lieu de s'additionner. */
export const NATURAL_LASH_COUNT = 300;
export const EXTENSION_LASH_COUNT = 240;
export const BROW_HAIR_COUNT = 280;

const round = (n) => Math.round(n * 100) / 100;

/** Générateur pseudo-aléatoire à graine (mulberry32).
 *  Indispensable ici : le dessin doit être IDENTIQUE d'un rendu à l'autre, sans quoi
 *  la frange frémirait à chaque frappe et deux exports de la même fiche différeraient.
 */
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

// --- Points et directions --------------------------------------------------------

/** Point du bord ciliaire à la position `t`. */
export function lidPoint(t) {
  const u = 1 - t;
  return {
    x: u * u * LID.p0.x + 2 * u * t * LID.p1.x + t * t * LID.p2.x,
    y: u * u * LID.p0.y + 2 * u * t * LID.p1.y + t * t * LID.p2.y,
  };
}

function unit(from, to) {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const length = Math.hypot(dx, dy) || 1;
  return { x: dx / length, y: dy / length };
}

/** Direction d'ouverture d'un secteur : vers le haut et vers l'extérieur. */
export function fanDirection(t) {
  return unit(FAN_FOCUS, lidPoint(t));
}

/** Direction d'un cil : vers le bas et vers l'extérieur. */
export function lashDirection(t) {
  return unit(LASH_FOCUS, lidPoint(t));
}

/** Sommet du secteur à la position `t` (extrémité extérieure du rayon). */
function fanPoint(t, height = SECTOR_HEIGHT) {
  const base = lidPoint(t);
  const dir = fanDirection(t);
  return { x: base.x + dir.x * height, y: base.y + dir.y * height };
}

/** Longueur dessinée (unités du viewBox) d'un cil de `mm` millimètres. */
export function mmToLashLength(mm) {
  const clamped = clampMm(mm);
  return LASH_PX_MIN + ((clamped - MM_MIN) / (MM_MAX - MM_MIN)) * (LASH_PX_MAX - LASH_PX_MIN);
}

// --- Secteurs --------------------------------------------------------------------

/** Position `t` du secteur d'index `i`, avant/après retournement. */
function sectorRange(index, count, mirrored) {
  const step = (T_MAX - T_MIN) / count;
  const a = T_MIN + index * step;
  const b = a + step;
  return mirrored ? { t0: 1 - b, t1: 1 - a } : { t0: a, t1: b };
}

function samplePolyline(t0, t1, project, steps = 10) {
  const points = [];
  for (let i = 0; i <= steps; i += 1) {
    points.push(project(t0 + ((t1 - t0) * i) / steps));
  }
  return points;
}

function toPath(points, close = true) {
  const d = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${round(p.x)},${round(p.y)}`).join(' ');
  return close ? `${d} Z` : d;
}

/** Découpe l'œil en `count` secteurs.
 *
 * Chaque secteur est un quadrilatère curviligne : le bord ciliaire en bas, deux rayons
 * sur les côtés, un arc en haut. Il sort prêt à être posé dans un `<path d=…>`.
 *
 * @param {number} count nombre de secteurs (borné à SECTOR_MIN…SECTOR_MAX)
 * @param {{mirrored?: boolean}} [options] retourne le dessin (œil gauche)
 * @returns {Array<{id:string, index:number, t0:number, t1:number, tMid:number,
 *   path:string, labelPoint:{x:number,y:number}, basePoint:{x:number,y:number},
 *   dividerPath:string}>}
 */
export function buildSectors(count, { mirrored = false } = {}) {
  const n = Math.min(SECTOR_MAX, Math.max(SECTOR_MIN, Math.floor(count) || SECTOR_DEFAULT));
  return Array.from({ length: n }, (_, index) => {
    const { t0, t1 } = sectorRange(index, n, mirrored);
    const tMid = (t0 + t1) / 2;
    const bottom = samplePolyline(t0, t1, (t) => lidPoint(t));
    const top = samplePolyline(t1, t0, (t) => fanPoint(t));
    const dir = fanDirection(tMid);
    const base = lidPoint(tMid);
    return {
      id: `sector-${index}`,
      index,
      t0,
      t1,
      tMid,
      path: toPath([...bottom, ...top]),
      basePoint: base,
      labelPoint: {
        x: round(base.x + dir.x * SECTOR_HEIGHT * 0.54),
        y: round(base.y + dir.y * SECTOR_HEIGHT * 0.54),
      },
      dividerPath: toPath([lidPoint(t0), fanPoint(t0)], false),
    };
  });
}

/** Positions `t` des centres de secteurs, pour interpoler une longueur continue. */
export function sectorAnchors(sectors) {
  return sectors.map((sector) => sector.tMid);
}

/** Repère central en pointillés (le « CENTRE » des maquettes). */
export function centerGuidePath() {
  return toPath([lidPoint(0.5), fanPoint(0.5, SECTOR_HEIGHT + 26)], false);
}

/** Ancres des trois libellés d'axe, au-dessus de l'éventail.
 *  Les extrémités sont ramenées dans le cadre : sur un éventail large, le prolongement
 *  du rayon sortirait du viewBox et le libellé serait rogné.
 * @param {boolean} mirrored
 * @returns {{inner:{x,y}, center:{x,y}, outer:{x,y}}}
 */
export function axisLabelPoints(mirrored = false) {
  const place = (t, margin) => {
    const p = fanPoint(mirrored ? 1 - t : t, SECTOR_HEIGHT + margin);
    return { x: round(Math.min(VIEWBOX.width - 46, Math.max(46, p.x))), y: round(Math.max(20, p.y)) };
  };
  return { inner: place(T_MIN, 14), center: place(0.5, 22), outer: place(T_MAX, 14) };
}

// --- Frange de cils --------------------------------------------------------------

/** Cil FUSELÉ : une silhouette pleine, épaisse à la racine et effilée en pointe.
 *
 *  C'est le geste qui change tout. Un `<path>` au trait a une épaisseur constante : cent
 *  cils tracés ainsi donnent un peigne à dents égales, jamais une frange. Un vrai cil
 *  s'amincit sur toute sa longueur — on décrit donc ses DEUX bords, qui se rejoignent à la
 *  pointe, et on remplit. Le surcoût est nul : c'est toujours un seul chemin par cil.
 *
 * @param {number} t position sur le bord ciliaire
 * @param {number} length longueur dessinée
 * @param {number} bend courbure latérale
 * @param {number} width épaisseur à la racine
 * @param {number} curveRatio position du point de contrôle le long du cil
 */
export function taperedPath(base, control, tip, width) {
  const axis = unit(base, tip);
  const perp = { x: -axis.y, y: axis.x };
  const half = width / 2;
  const leftBase = { x: base.x + perp.x * half, y: base.y + perp.y * half };
  const rightBase = { x: base.x - perp.x * half, y: base.y - perp.y * half };
  const leftControl = { x: control.x + perp.x * half * 0.42, y: control.y + perp.y * half * 0.42 };
  const rightControl = { x: control.x - perp.x * half * 0.42, y: control.y - perp.y * half * 0.42 };
  return (
    `M${round(leftBase.x)},${round(leftBase.y)} ` +
    `Q${round(leftControl.x)},${round(leftControl.y)} ${round(tip.x)},${round(tip.y)} ` +
    `Q${round(rightControl.x)},${round(rightControl.y)} ${round(rightBase.x)},${round(rightBase.y)} Z`
  );
}

function lashShape(t, length, bend, width, curveRatio = 0.55) {
  const base = lidPoint(t);
  const dir = lashDirection(t);
  const perp = { x: -dir.y, y: dir.x };
  const tip = { x: base.x + dir.x * length, y: base.y + dir.y * length };
  const control = {
    x: base.x + dir.x * length * curveRatio + perp.x * bend,
    y: base.y + dir.y * length * curveRatio + perp.y * bend,
  };
  return taperedPath(base, control, tip, width);
}

/** Profil naturel : les cils sont plus courts aux deux coins qu'au centre. */
function naturalProfile(t) {
  const fromCenter = Math.abs(t - 0.5) / 0.5;
  return 1 - 0.42 * fromCenter ** 1.6;
}

/** Cils naturels : couche décorative, identique d'un rendu à l'autre.
 * @param {{mirrored?:boolean, count?:number, seed?:number}} [options]
 * @returns {Array<{key:number, d:string, width:number, opacity:number}>}
 */
export function buildNaturalLashes({ mirrored = false, count = NATURAL_LASH_COUNT, seed = 20260729 } = {}) {
  const random = seededRandom(seed);
  return Array.from({ length: count }, (_, i) => {
    const spread = 0.015 + (i / (count - 1)) * 0.97;
    const t0 = spread + (random() - 0.5) * 0.008;
    const t = mirrored ? 1 - t0 : t0;
    const length = (26 + random() * 22) * naturalProfile(t0);
    // Courbure franche : un cil qui ne se recourbe pas est un piquant. L'amplitude croît
    // vers les coins, où la frange s'évase naturellement.
    const bend = (0.5 - t) * 2 * (11 + random() * 10);
    // Un cil sur trois passe au PLAN ARRIÈRE. Tiré du même flux à graine que le reste,
    // donc stable d'un rendu à l'autre : le dessin ne doit jamais frémir entre deux
    // rendus, ni différer entre deux exports de la même fiche.
    const back = random() < 0.34;
    const width = round(1.1 + random() * 0.8);
    return {
      key: i,
      d: lashShape(t, length * (back ? 1.06 : 1), bend, width, 0.48 + random() * 0.12),
      width,
      opacity: round(0.44 + random() * 0.3),
      back,
    };
  });
}

/** Cils d'extension : leur longueur suit les valeurs saisies, interpolées entre les
 *  centres de secteurs pour que le dégradé reste continu d'un secteur à l'autre.
 * @param {Array<string|number>} lengths longueurs en mm, un élément par secteur
 * @param {Array<{tMid:number}>} sectors
 * @param {{mirrored?:boolean, count?:number, seed?:number}} [options]
 */
export function buildExtensionLashes(lengths, sectors, { mirrored = false, count = EXTENSION_LASH_COUNT, seed = 41 } = {}) {
  const random = seededRandom(seed);
  const anchors = sectorAnchors(sectors);
  // Les ancres sont décroissantes sur un œil retourné : `interpolateLength` attend une
  // suite croissante, on lui présente donc la version non retournée du repère.
  const ordered = mirrored ? [...anchors].reverse() : anchors;
  const orderedLengths = mirrored ? [...lengths].reverse() : lengths;

  return Array.from({ length: count }, (_, i) => {
    const t = T_MIN + ((T_MAX - T_MIN) * i) / (count - 1) + (random() - 0.5) * 0.006;
    const mm = interpolateLength(t, ordered, orderedLengths);
    const length = mmToLashLength(mm) * (0.94 + random() * 0.12);
    const bend = (0.5 - t) * 2 * (13 + random() * 11);
    // Même principe que la frange naturelle : une part des extensions passe derrière,
    // ce qui donne l'épaisseur d'un vrai bouquet plutôt qu'une rangée de traits égaux.
    const back = random() < 0.32;
    const width = round(1.5 + random() * 0.9);
    return {
      key: i,
      d: lashShape(t, length * (back ? 0.93 : 1), bend, width, 0.5 + random() * 0.1),
      width,
      opacity: round(0.86 + random() * 0.14),
      back,
      mm,
    };
  });
}

// --- Sourcil ---------------------------------------------------------------------

const BROW = { p0: { x: 98, y: 86 }, p1: { x: 292, y: -6 }, p2: { x: 522, y: 66 } };

/** Bornes verticales des dégradés, en unités du viewBox.
 *
 *  Déduites de la géométrie plutôt qu'écrites en dur dans les composants : le bord
 *  ciliaire culmine à `LID.p0.y`, les cils descendent au plus de `LASH_PX_MAX`. Si la
 *  courbe de l'œil bouge un jour, le relief suivra sans qu'on ait à y repenser.
 */
export const GRADIENT_BOUNDS = {
  lash: { y0: LID.p0.y - 10, y1: LID.p1.y + LASH_PX_MAX },
  brow: { y0: BROW.p1.y - 10, y1: BROW.p0.y + 40 },
  lid: { y0: LID.p1.y - 150, y1: LID.p1.y },
};

function browPoint(t) {
  const u = 1 - t;
  return {
    x: u * u * BROW.p0.x + 2 * u * t * BROW.p1.x + t * t * BROW.p2.x,
    y: u * u * BROW.p0.y + 2 * u * t * BROW.p1.y + t * t * BROW.p2.y,
  };
}

function browTangent(t) {
  const ahead = browPoint(Math.min(1, t + 0.01));
  const behind = browPoint(Math.max(0, t - 0.01));
  return unit(behind, ahead);
}

/** Sourcil : poils fins suivant une arête, épais à la tête, effilé à la queue.
 *  Décoratif, mais c'est lui qui donne au schéma son allure de planche de formation.
 */
export function buildBrow({ mirrored = false, count = BROW_HAIR_COUNT, seed = 907 } = {}) {
  const random = seededRandom(seed);
  return Array.from({ length: count }, (_, i) => {
    const t = 0.02 + (i / (count - 1)) * 0.96;
    const spine = browPoint(t);
    const tangent = browTangent(t);
    const perp = { x: -tangent.y, y: tangent.x };
    // Arête resserrée et poils plus courts : un sourcil se lit à sa forme, pas à
    // l'éparpillement de ses poils. L'ancien réglage étalait la touffe sur 22 unités,
    // d'où l'aspect broussailleux qui tirait le dessin vers le croquis.
    const thickness = 15 - 9 * t;
    const offset = (random() - 0.5) * thickness;
    const length = (10 + random() * 12) * (1 - 0.35 * t);
    const lift = 0.34 + random() * 0.3;
    const start = { x: spine.x + perp.x * offset, y: spine.y + perp.y * offset };
    const end = {
      x: start.x + tangent.x * length - perp.x * length * lift,
      y: start.y + tangent.y * length - perp.y * length * lift,
    };
    const control = {
      x: (start.x + end.x) / 2 - perp.x * length * 0.18,
      y: (start.y + end.y) / 2 - perp.y * length * 0.18,
    };
    const mirror = (p) => (mirrored ? { x: VIEWBOX.width - p.x, y: p.y } : p);
    const [s, c, e] = [mirror(start), mirror(control), mirror(end)];
    // Poils fuselés eux aussi : c'est ce qui distingue un sourcil d'un gribouillis. Et
    // une opacité plus franche, sans quoi la forme d'ensemble ne se lit pas.
    const width = round(1 + random() * 0.7);
    return {
      key: i,
      d: taperedPath(s, c, e, width),
      width,
      opacity: round(0.52 + random() * 0.34),
    };
  });
}

/** Trait du bord ciliaire (le « liner »), dessiné par-dessus la frange. */
export function lidLinePath() {
  return `M${LID.p0.x},${LID.p0.y} Q${LID.p1.x},${LID.p1.y} ${LID.p2.x},${LID.p2.y}`;
}

/** Surface de la paupière : la bande de peau entre le bord ciliaire et le pli, teintée
 *  très légèrement pour asseoir le dessin sans jamais concurrencer les cils. */
export function lidSurfacePath() {
  const start = lidPoint(0);
  const end = lidPoint(1);
  const crease = { x: LID.p1.x, y: LID.p1.y - 132 };
  return `M${round(start.x)},${round(start.y)} Q${LID.p1.x},${LID.p1.y} ${round(end.x)},${round(end.y)} Q${crease.x},${round(crease.y)} ${round(start.x)},${round(start.y)} Z`;
}

/** Pli de la paupière : l'arc supérieur de la surface, tracé seul.
 *
 *  C'est ce trait qui fait basculer le dessin d'un « trait avec des cils » à un œil :
 *  sans lui, la paupière n'a pas d'épaisseur et le regard n'a pas de creux. Volontairement
 *  très pâle — il asseoit l'anatomie, il ne doit jamais concurrencer la frange. */
export function lidCreasePath() {
  const start = lidPoint(0);
  const end = lidPoint(1);
  const crease = { x: LID.p1.x, y: LID.p1.y - 132 };
  return `M${round(start.x)},${round(start.y)} Q${crease.x},${round(crease.y)} ${round(end.x)},${round(end.y)}`;
}

/** Renflement du bord ciliaire : une bande étroite juste au-dessus du liner, plus dense
 *  que le reste de la paupière. C'est là que la peau est la plus épaisse, et c'est ce
 *  ressaut qui donne au bord son relief. */
export function lidRidgePath() {
  const start = lidPoint(0);
  const end = lidPoint(1);
  const ridge = { x: LID.p1.x, y: LID.p1.y - 34 };
  return `M${round(start.x)},${round(start.y)} Q${LID.p1.x},${LID.p1.y} ${round(end.x)},${round(end.y)} Q${ridge.x},${round(ridge.y)} ${round(start.x)},${round(start.y)} Z`;
}

/** Longueur en mm d'un secteur, telle qu'elle sera dessinée (bornée). */
export function sectorMm(value) {
  return clampMm(parseMm(value));
}
