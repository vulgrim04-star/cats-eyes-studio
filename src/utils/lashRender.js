import { CURLS, DENSITIES, DIAMETERS, TECHNIQUES } from './lashReferentials';

/** Ce qui traduit une fiche technique en dessin.
 *
 *  LE MANQUE QU'IL COMBLE : jusqu'ici, SEULE LA LONGUEUR se voyait sur le schéma. On
 *  pouvait passer un secteur de C en DD, de 0.03 à 0.15, de Classic en Mega Volume — la
 *  fiche l'enregistrait, et le dessin restait rigoureusement identique. Une planche qui ne
 *  montre pas ce qu'on y règle n'est pas une planche, c'est un formulaire avec une image.
 *
 *  TOUT EST PUR ET TESTÉ, parce que ces correspondances sont des jugements de métier qu'on
 *  voudra corriger en les regardant : elles vivent ici, nommées, plutôt que semées en
 *  constantes dans la géométrie.
 *
 *  UNE HONNÊTETÉ SUR LES ÉCHELLES. Un 6D pose six fois plus de cils qu'un Classic ; le
 *  dessiner littéralement donnerait un bloc noir où l'on ne distinguerait plus rien, et
 *  surtout plus le dégradé de longueurs, qui est le sujet de la planche. Les facteurs
 *  ci-dessous sont donc LISIBLES et non littéraux : ils ordonnent correctement — un 5D est
 *  visiblement plus fourni qu'un 3D — sans prétendre compter les cils.
 */

/** Cambrure et forme de chaque courbure.
 *
 *  `bend` est l'amplitude du recourbement ; `curveRatio` dit OÙ le cil se recourbe, de 0
 *  (dès la racine) à 1 (seulement en bout). C'est ce second nombre qui distingue une L
 *  d'une D de même amplitude : la L reste droite puis se relève d'un coup, ce qui est
 *  précisément ce qu'on lui demande sur une paupière tombante.
 */
const CURL_SHAPE = {
  J: { bend: 0.45, curveRatio: 0.64 },
  B: { bend: 0.64, curveRatio: 0.60 },
  C: { bend: 0.85, curveRatio: 0.55 },
  CC: { bend: 1.05, curveRatio: 0.52 },
  D: { bend: 1.3, curveRatio: 0.48 },
  DD: { bend: 1.55, curveRatio: 0.45 },
  L: { bend: 1.2, curveRatio: 0.3 },
  M: { bend: 1.75, curveRatio: 0.42 },
};

/** Épaisseur du trait, en unités du viewBox, pour chaque diamètre de fibre. L'écart entre
 *  0.03 et 0.15 est de un à cinq dans la réalité ; à l'écran on le ramène à un à trois,
 *  faute de quoi un 0.03 disparaîtrait et un 0.15 empâterait tout. */
const DIAMETER_WIDTH = {
  '0.03': 1.0,
  '0.05': 1.35,
  '0.07': 1.75,
  '0.10': 2.3,
  '0.12': 2.8,
  '0.15': 3.4,
};

/** Nombre de cils, en multiples du Classic. Voir l'avertissement en tête de fichier : ces
 *  facteurs ordonnent, ils ne comptent pas. */
const DENSITY_FACTOR = {
  Classic: 1,
  '2D': 1.25,
  '3D': 1.5,
  '4D': 1.72,
  '5D': 1.92,
  '6D': 2.1,
  'Mega Volume': 2.5,
};

/**
 * Signature de chaque technique.
 *
 *  `spikeEvery` : un cil sur combien dépasse — 0 pour aucun.
 *  `spikeGain`  : de combien il dépasse, en fraction de sa longueur.
 *  `widthScale` : les techniques de volume emploient des fibres plus fines.
 *  `countScale` : et davantage de fibres.
 *  `clump`      : resserrement des cils en bouquets, de 0 (régulier) à 1 (très groupé).
 */
const TECHNIQUE_PROFILE = {
  Classique: { spikeEvery: 0, spikeGain: 0, widthScale: 1, countScale: 1, clump: 0 },
  Hybride: { spikeEvery: 7, spikeGain: 0.16, widthScale: 0.95, countScale: 1.15, clump: 0.25 },
  'Volume Russe': { spikeEvery: 0, spikeGain: 0, widthScale: 0.8, countScale: 1.3, clump: 0.45 },
  'Mega Volume': { spikeEvery: 0, spikeGain: 0, widthScale: 0.68, countScale: 1.55, clump: 0.6 },
  Wispy: { spikeEvery: 5, spikeGain: 0.28, widthScale: 0.9, countScale: 1.2, clump: 0.35 },
  'Kim K': { spikeEvery: 9, spikeGain: 0.38, widthScale: 0.92, countScale: 1.1, clump: 0.2 },
  'Wet Look': { spikeEvery: 0, spikeGain: 0, widthScale: 0.85, countScale: 1.25, clump: 0.75 },
  Anime: { spikeEvery: 4, spikeGain: 0.45, widthScale: 1, countScale: 0.85, clump: 0.5 },
};

/** Repli commun : une valeur inconnue — venue d'un référentiel modifié dans les Réglages,
 *  ou d'une fiche plus ancienne — ne doit jamais faire disparaître le dessin. On prend le
 *  cas le plus courant du métier, jamais `undefined`. */
const pick = (table, value, fallback) =>
  (value != null && Object.hasOwn(table, value) ? table[value] : table[fallback]);

/** Cambrure et forme d'une courbure. */
export function curlShape(curl) {
  return pick(CURL_SHAPE, curl, 'C');
}

/** Épaisseur du trait pour un diamètre de fibre. */
export function diameterWidth(diameter) {
  return pick(DIAMETER_WIDTH, diameter, '0.07');
}

/** Multiplicateur de nombre de cils pour une densité. */
export function densityFactor(density) {
  return pick(DENSITY_FACTOR, density, 'Classic');
}

/** Profil d'une technique de pose. */
export function techniqueProfile(technique) {
  return pick(TECHNIQUE_PROFILE, technique, 'Classique');
}

/** Plafond du nombre de cils dessinés, en multiples de la pose de référence.
 *
 *  Un œil entièrement en Mega Volume vaut, densité et technique combinées, près de quatre
 *  fois la pose de référence. Dessiner quatre fois plus de cils donnerait un aplat noir où
 *  le dégradé de longueurs — le sujet de la planche — disparaîtrait, et ferait passer le
 *  schéma de 240 à près de mille tracés, sur un téléphone, pendant la pose. On plafonne
 *  donc : au-delà, l'ordre reste juste, l'écart cesse de se creuser.
 */
export const DENSITY_DRAW_CAP = 2.2;

/** Toutes les correspondances couvrent-elles bien les référentiels du modèle ? Une entrée
 *  manquante ne se verrait pas — le repli la masquerait — d'où ce contrôle, exercé par les
 *  tests plutôt que laissé à la relecture. */
export const COVERAGE = {
  curls: CURLS.every((c) => Object.hasOwn(CURL_SHAPE, c)),
  diameters: DIAMETERS.every((d) => Object.hasOwn(DIAMETER_WIDTH, d)),
  densities: DENSITIES.every((d) => Object.hasOwn(DENSITY_FACTOR, d)),
  techniques: TECHNIQUES.every((t) => Object.hasOwn(TECHNIQUE_PROFILE, t)),
};

/**
 * Valeur d'une propriété numérique à la position `t`, interpolée entre les centres de
 * secteurs.
 *
 * INTERPOLÉE ET NON EN MARCHES, pour la cambrure et l'épaisseur : deux secteurs voisins en
 * C et en D ne produisent pas, sur un œil, une frontière nette au millimètre près — la
 * transition se fait sur quelques cils. Une marche donnerait un dessin en escalier, qui
 * n'existe pas en cabine.
 *
 * La DENSITÉ, elle, ne passe pas par ici : c'est un nombre de cils, il se décide secteur
 * par secteur avant de placer quoi que ce soit.
 *
 * @param {number} t position le long de la ligne ciliaire, 0–1
 * @param {number[]} anchors centres de secteurs, croissants
 * @param {number[]} values valeur numérique par secteur
 */
export function interpolateAt(t, anchors, values) {
  if (!anchors?.length || !values?.length) return 0;
  if (t <= anchors[0]) return values[0];
  const last = anchors.length - 1;
  if (t >= anchors[last]) return values[Math.min(last, values.length - 1)];
  for (let i = 0; i < last; i += 1) {
    if (t <= anchors[i + 1]) {
      const span = anchors[i + 1] - anchors[i];
      const k = span === 0 ? 0 : (t - anchors[i]) / span;
      const a = values[i] ?? 0;
      const b = values[i + 1] ?? a;
      return a + (b - a) * k;
    }
  }
  return values[last] ?? 0;
}

/**
 * Traduit les secteurs résolus en nombres directement utilisables par la géométrie.
 *
 * @param {Array<{curl:string, diameter:string, density:string, style:string}>} zones
 * @returns {{bends:number[], curveRatios:number[], widths:number[], densities:number[],
 *   profiles:object[]}}
 */
export function renderProfile(zones) {
  const list = zones ?? [];
  return {
    bends: list.map((z) => curlShape(z?.curl).bend),
    curveRatios: list.map((z) => curlShape(z?.curl).curveRatio),
    widths: list.map((z) => diameterWidth(z?.diameter)),
    densities: list.map((z) => densityFactor(z?.density)),
    profiles: list.map((z) => techniqueProfile(z?.style)),
  };
}
