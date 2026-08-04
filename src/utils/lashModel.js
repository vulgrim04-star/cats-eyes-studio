/** Modèle de données d'une Lash Map.
 *
 * SEUL module qui connaît la forme stockée. Les composants ne lisent jamais
 * `map.leftEye.zones[3].curl` à la main : ils passent par `effectiveZone`, qui applique
 * la règle de surcharge (une propriété nulle sur un secteur hérite du réglage global de
 * l'œil). Si le stockage change un jour — table dédiée, autre schéma — c'est ici, et
 * seulement ici, qu'il faudra intervenir.
 *
 * Forme :
 *   {
 *     leftEye:  { global: {curl, diameter, style, color, density}, zones: [ {...}, … ] },
 *     rightEye: { … },
 *     …champs de séance (date, poseType, notes, colle, durées…)
 *   }
 */

import { SECTOR_DEFAULT, SECTOR_MAX, SECTOR_MIN } from './lashGeometry';
import { MM_DEFAULT, averageMm, clampMm, formatMm, parseMm, roundMm } from './lashCalculations';
import { todayISO } from './date';

// --- Référentiels ----------------------------------------------------------------

export const CURLS = ['J', 'B', 'C', 'CC', 'D', 'DD', 'L', 'M'];
export const DIAMETERS = ['0.03', '0.05', '0.07', '0.10', '0.12', '0.15'];
export const DENSITIES = ['Classic', '2D', '3D', '4D', '5D', '6D', 'Mega Volume'];
export const TECHNIQUES = ['Classique', 'Hybride', 'Volume Russe', 'Mega Volume', 'Wispy', 'Kim K', 'Wet Look', 'Anime'];
export const COLORS = ['Noir', 'Brun', 'Mix', 'Coloré'];
export const QUICK_LENGTHS = [8, 9, 10, 11, 12, 13, 14, 15];

/** Propriétés qu'un secteur peut surcharger. La longueur et la note n'y sont pas :
 *  elles n'existent QUE par secteur. */
export const OVERRIDABLE = ['curl', 'diameter', 'style', 'color', 'density'];

export const SIDES = ['left', 'right'];
export const SIDE_KEY = { left: 'leftEye', right: 'rightEye' };
export const SIDE_LABEL = { left: 'Œil gauche', right: 'Œil droit' };

const DEFAULT_GLOBAL = {
  curl: 'C',
  diameter: '0.07',
  style: 'Classique',
  color: 'Noir',
  density: 'Classic',
};

// --- Construction ----------------------------------------------------------------

function createZone(id, length = MM_DEFAULT) {
  return {
    id,
    length,
    curl: null,
    diameter: null,
    style: null,
    color: null,
    density: null,
    notes: '',
  };
}

/** Œil vierge à `count` secteurs. */
export function createEye(count = SECTOR_DEFAULT, global = {}) {
  const n = clampCount(count);
  return {
    global: { ...DEFAULT_GLOBAL, ...global },
    zones: Array.from({ length: n }, (_, i) => createZone(i + 1)),
  };
}

function clampCount(count) {
  const n = Math.floor(Number(count)) || SECTOR_DEFAULT;
  return Math.min(SECTOR_MAX, Math.max(SECTOR_MIN, n));
}

export const EMPTY_LASH_MAP = {
  date: todayISO(),
  appointmentId: null,
  poseType: 'Pose complète',
  fillCycle: '',
  eyeShape: '',
  setShape: '',
  lashHealth: '',
  templateId: null,
  leftEye: createEye(),
  rightEye: createEye(),
  // Notes structurées (cahier des charges : observations, conseils, produits…)
  notes: '',
  advice: '',
  products: '',
  adhesive: '',
  poseDuration: '',
  fillDuration: '',
  sensitivities: '',
};

// --- Normalisation et reprise de l'ancienne forme --------------------------------

function normalizeZone(zone, id) {
  if (!zone || typeof zone !== 'object') return createZone(id, parseMm(zone));
  const merged = createZone(id, clampMm(parseMm(zone.length)));
  OVERRIDABLE.forEach((field) => {
    const value = zone[field];
    merged[field] = value === undefined || value === '' ? null : value;
  });
  merged.notes = String(zone.notes ?? '');
  return merged;
}

function normalizeEye(eye, fallbackGlobal = {}) {
  const zones = Array.isArray(eye?.zones) && eye.zones.length > 0 ? eye.zones : null;
  if (!zones) return createEye(SECTOR_DEFAULT, fallbackGlobal);
  const count = clampCount(zones.length);
  return {
    global: { ...DEFAULT_GLOBAL, ...fallbackGlobal, ...(eye.global ?? {}) },
    zones: Array.from({ length: count }, (_, i) => normalizeZone(zones[i], i + 1)),
  };
}

/** Convertit une fiche enregistrée avant la refonte (longueurs en tableau de chaînes,
 *  courbure et épaisseur uniques pour les deux yeux) vers le modèle par secteur.
 *
 *  L'ancien module descendait à trois cases ; le nouveau en exige six. Quand le compte
 *  ne tombe pas juste, on RÉÉCHANTILLONNE le dégradé au lieu de recopier la dernière
 *  valeur : une lash map de quatre cases doit garder sa forme, pas finir avec un coin
 *  externe artificiellement plat. */
function eyeFromLegacy(zones, global) {
  const list = Array.isArray(zones) && zones.length > 0 ? zones : null;
  if (!list) return createEye(SECTOR_DEFAULT, global);
  const lengths = list.map((value) => clampMm(parseMm(value)));
  const count = clampCount(lengths.length);
  const lengthAt = (index) =>
    count === lengths.length ? lengths[index] : clampMm(sampleProfileAt(lengths, index, count));
  return {
    global: { ...DEFAULT_GLOBAL, ...global },
    zones: Array.from({ length: count }, (_, i) => createZone(i + 1, lengthAt(i))),
  };
}

/** Met une fiche — ancienne ou nouvelle — dans sa forme canonique.
 *  Point de compatibilité unique : tout le reste du module suppose cette forme.
 */
export function normalizeLashMap(map) {
  if (!map) return { ...EMPTY_LASH_MAP, leftEye: createEye(), rightEye: createEye(), date: todayISO() };

  const legacyGlobal = {
    ...(map.curl ? { curl: map.curl } : {}),
    ...(map.thickness ? { diameter: String(map.thickness) } : {}),
    ...(Array.isArray(map.styles) && map.styles[0] ? { style: map.styles[0] } : {}),
  };

  const hasNewShape = Boolean(map.leftEye?.zones || map.rightEye?.zones);
  const leftEye = hasNewShape ? normalizeEye(map.leftEye, legacyGlobal) : eyeFromLegacy(map.zonesLeft, legacyGlobal);
  const rightEye = hasNewShape ? normalizeEye(map.rightEye, legacyGlobal) : eyeFromLegacy(map.zonesRight, legacyGlobal);

  // Les deux yeux gardent le même nombre de secteurs : le schéma se lit en vis-à-vis.
  const count = Math.max(leftEye.zones.length, rightEye.zones.length);

  const normalized = { ...EMPTY_LASH_MAP, ...map, leftEye, rightEye };
  // Champs de l'ancien modèle désormais portés par `global` : on ne les recopie pas.
  delete normalized.zonesLeft;
  delete normalized.zonesRight;
  delete normalized.curl;
  delete normalized.thickness;
  delete normalized.length;
  delete normalized.styles;
  delete normalized.effects;
  delete normalized.layers;
  delete normalized.innerCornerLength;
  delete normalized.outerCornerLength;
  return resizeSectors(normalized, count);
}

// --- Lecture ---------------------------------------------------------------------

/** Œil d'une fiche. */
export function getEye(map, side) {
  return map[SIDE_KEY[side]];
}

/** Un secteur, propriétés globales appliquées. C'est CE que doit afficher l'interface.
 * @returns {{id:number, length:number, curl:string, diameter:string, style:string,
 *   color:string, density:string, notes:string, overrides:string[]}}
 */
export function effectiveZone(eye, index) {
  const zone = eye.zones[index];
  if (!zone) return null;
  const result = { ...zone, overrides: [] };
  OVERRIDABLE.forEach((field) => {
    if (zone[field] === null || zone[field] === undefined) {
      result[field] = eye.global[field];
    } else {
      result.overrides.push(field);
    }
  });
  return result;
}

/** Un secteur porte-t-il au moins une surcharge ? */
export function hasOverride(zone) {
  return OVERRIDABLE.some((field) => zone?.[field] !== null && zone?.[field] !== undefined);
}

/** Longueurs d'un œil, dans l'ordre coin interne → coin externe. */
export function eyeLengths(eye) {
  return eye.zones.map((zone) => zone.length);
}

/** Étendue des longueurs d'un œil, pour les cartes de synthèse (« 8 – 13 mm »). */
export function lengthRange(eye) {
  const lengths = eyeLengths(eye);
  if (lengths.length === 0) return '—';
  const min = Math.min(...lengths);
  const max = Math.max(...lengths);
  return min === max ? `${formatMm(min)} mm` : `${formatMm(min)} – ${formatMm(max)} mm`;
}

/** Nom lisible d'un secteur, pour les libellés d'accessibilité et les infobulles. */
export function sectorLabel(index, count) {
  if (index === 0) return 'Coin interne';
  if (index === count - 1) return 'Coin externe';
  if (count % 2 === 0 && (index === count / 2 - 1 || index === count / 2)) return `Centre (${index + 1})`;
  return `Secteur ${index + 1}`;
}

// --- Écriture (toujours immuable) ------------------------------------------------

function withEye(map, side, eye) {
  return { ...map, [SIDE_KEY[side]]: eye };
}

function withZones(map, side, zones) {
  return withEye(map, side, { ...getEye(map, side), zones });
}

/** Modifie une propriété d'un secteur. `null` retire la surcharge (retour au global). */
export function setZoneField(map, side, index, field, value) {
  const eye = getEye(map, side);
  const zones = eye.zones.map((zone, i) => (i === index ? { ...zone, [field]: value } : zone));
  return withZones(map, side, zones);
}

/** Modifie la longueur d'un secteur (bornée, arrondie au pas de saisie). */
export function setZoneLength(map, side, index, mm) {
  return setZoneField(map, side, index, 'length', clampMm(roundMm(parseMm(mm))));
}

/** Modifie un réglage global d'un œil. */
export function setGlobalField(map, side, field, value) {
  const eye = getEye(map, side);
  return withEye(map, side, { ...eye, global: { ...eye.global, [field]: value } });
}

/** Remplace toutes les propriétés d'un secteur (copier/coller). */
export function pasteZone(map, side, index, source) {
  const eye = getEye(map, side);
  const zones = eye.zones.map((zone, i) =>
    i === index ? { ...normalizeZone(source, zone.id) } : zone
  );
  return withZones(map, side, zones);
}

/** Change le nombre de secteurs des DEUX yeux. En ajout, les nouveaux secteurs
 *  prolongent le dernier ; en retrait, on tronque par le coin externe. */
export function resizeSectors(map, count) {
  const target = clampCount(count);
  const resizeEye = (eye) => {
    if (eye.zones.length === target) return eye;
    const zones = [];
    for (let i = 0; i < target; i += 1) {
      const source = eye.zones[i] ?? eye.zones[eye.zones.length - 1];
      zones.push({ ...normalizeZone(source, i + 1), id: i + 1 });
    }
    return { ...eye, zones };
  };
  return { ...map, leftEye: resizeEye(map.leftEye), rightEye: resizeEye(map.rightEye) };
}

/** Inverse le dégradé d'un œil (utile quand on s'aperçoit qu'on a lu la fiche à l'envers). */
export function mirrorEye(map, side) {
  const eye = getEye(map, side);
  const zones = [...eye.zones].reverse().map((zone, i) => ({ ...zone, id: i + 1 }));
  return withZones(map, side, zones);
}

/** Recopie un œil sur l'autre. Les secteurs allant toujours du coin interne au coin
 *  externe, la copie est directe : c'est le DESSIN qui est en miroir, pas la donnée. */
export function copyEye(map, fromSide) {
  const toSide = fromSide === 'left' ? 'right' : 'left';
  const source = getEye(map, fromSide);
  return withEye(map, toSide, {
    global: { ...source.global },
    zones: source.zones.map((zone) => ({ ...zone })),
  });
}

/** Applique un profil de longueurs (modèle) à un œil, rééchantillonné au nombre de
 *  secteurs courant.
 * @param {number[]} profile longueurs en mm, du coin interne vers le coin externe
 */
export function applyProfile(map, side, profile, global = {}) {
  const eye = getEye(map, side);
  const zones = eye.zones.map((zone, i) => ({
    ...zone,
    length: clampMm(sampleProfileAt(profile, i, eye.zones.length)),
  }));
  return withEye(map, side, { global: { ...eye.global, ...global }, zones });
}

/** Valeur d'un profil au secteur `index` sur `count`, par interpolation linéaire :
 *  un modèle décrit à 6 points reste juste sur 12 secteurs. */
export function sampleProfileAt(profile, index, count) {
  if (!profile || profile.length === 0) return MM_DEFAULT;
  if (profile.length === 1) return profile[0];
  const position = count <= 1 ? 0 : (index / (count - 1)) * (profile.length - 1);
  const low = Math.floor(position);
  const high = Math.min(profile.length - 1, low + 1);
  const local = position - low;
  return roundMm(profile[low] * (1 - local) + profile[high] * local);
}

// --- Reprise d'une séance à l'autre ----------------------------------------------

/** Ce qui SE REPORTE d'une séance à la suivante : la technique et l'anatomie.
 *
 *  Une retouche à trois semaines reprend la pose précédente ; la ressaisir en entier est
 *  du temps perdu en cabine. Mais tout ne se reporte pas : la date, les notes, les durées
 *  et le rendez-vous lié racontent UNE séance et n'ont aucun sens sur la suivante.
 *
 *  `poseType` en est délibérément absent : une pose complète est suivie d'une retouche,
 *  reconduire « Pose complète » ferait entrer une erreur dans le dossier à chaque fois.
 */
export const CARRIED_FIELDS = [
  'eyeShape',
  'setShape',
  'lashHealth',
  'sensitivities',
  'adhesive',
  'products',
  'templateId',
];

/**
 * Fiche neuve pré-remplie à partir de la séance précédente.
 * @param {object} previous fiche de la dernière séance
 * @param {string} today date du jour, au format ISO
 * @returns {object} fiche normalisée, datée du jour
 */
export function carryOverMap(previous, today) {
  const source = normalizeLashMap(previous);
  const carried = {};
  CARRIED_FIELDS.forEach((field) => {
    if (source[field]) carried[field] = source[field];
  });
  return {
    ...EMPTY_LASH_MAP,
    ...carried,
    date: today,
    // Le découpage suit celui de la séance reprise : les deux fiches se comparent alors
    // secteur à secteur, ce qui est tout l'intérêt de la reprise.
    leftEye: { global: { ...source.leftEye.global }, zones: source.leftEye.zones.map((z) => ({ ...z })) },
    rightEye: { global: { ...source.rightEye.global }, zones: source.rightEye.zones.map((z) => ({ ...z })) },
  };
}

// --- Comparaison entre séances ---------------------------------------------------

const GLOBAL_LABELS = {
  curl: 'Courbure',
  diameter: 'Épaisseur',
  style: 'Technique',
  color: 'Couleur',
  density: 'Densité',
};

/** Écarts entre deux fiches, pour la comparaison A/B et la frise.
 * @returns {{globals: Array<{side:string, field:string, label:string, from:string, to:string}>,
 *   sectors: {left: Array<{index:number, from:number, to:number, delta:number}>, right: Array},
 *   averages: {left: number|null, right: number|null}}}
 */
export function diffLashMaps(currentMap, previousMap) {
  const empty = { globals: [], sectors: { left: [], right: [] }, averages: { left: null, right: null } };
  if (!currentMap || !previousMap) return empty;

  const current = normalizeLashMap(currentMap);
  const previous = normalizeLashMap(previousMap);
  const globals = [];
  const sectors = { left: [], right: [] };
  const averages = { left: null, right: null };

  SIDES.forEach((side) => {
    const now = getEye(current, side);
    const before = getEye(previous, side);

    Object.keys(GLOBAL_LABELS).forEach((field) => {
      if (now.global[field] !== before.global[field]) {
        globals.push({
          side,
          field,
          label: GLOBAL_LABELS[field],
          from: before.global[field] ?? '—',
          to: now.global[field] ?? '—',
        });
      }
    });

    now.zones.forEach((zone, index) => {
      const was = before.zones[index];
      if (!was || was.length === zone.length) return;
      sectors[side].push({
        index,
        from: was.length,
        to: zone.length,
        delta: Math.round((zone.length - was.length) * 10) / 10,
      });
    });

    const nowAvg = averageMm(eyeLengths(now));
    const beforeAvg = averageMm(eyeLengths(before));
    averages[side] = nowAvg !== null && beforeAvg !== null ? Math.round((nowAvg - beforeAvg) * 10) / 10 : null;
  });

  return { globals, sectors, averages };
}

/** Index des secteurs modifiés d'un œil, pour le surlignage doré de la comparaison. */
export function changedSectorIndexes(diff, side) {
  return new Set((diff?.sectors?.[side] ?? []).map((change) => change.index));
}
