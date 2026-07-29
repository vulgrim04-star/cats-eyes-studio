/** Géométrie et validation de la Lash Map.
 *
 * Ce module ne contient que des fonctions pures : aucune dépendance à React ni au DOM,
 * pour que le rendu SVG, les tests et un futur export image partagent exactement les
 * mêmes calculs. Les composants ne doivent jamais recalculer une position « à la main ».
 */

// --- Bornes métier (millimètres) -------------------------------------------------

/** En dessous, ce n'est plus une extension mais un cil naturel nu. */
export const MM_MIN = 6;
/** Au-delà, l'extension devient trop lourde pour un cil naturel, quel qu'il soit. */
export const MM_MAX = 18;
/** Longueur « neutre » utilisée pour dessiner une zone laissée vide. */
export const MM_DEFAULT = 13;
/** Pas de saisie : les fournisseurs vendent au demi-millimètre. */
export const MM_STEP = 0.5;

// --- Bornes de rendu (unités du viewBox SVG) -------------------------------------

export const VIEWBOX = { width: 280, height: 150 };

/** Longueur dessinée d'un cil de MM_MIN / MM_MAX. Volontairement non proportionnelle :
 *  un cil de 6 mm resterait invisible s'il était à l'échelle réelle du dessin. */
export const PX_MIN = 13;
export const PX_MAX = 34;

/** Bézier quadratique du bord ciliaire, dans le repère du viewBox. */
export const LASH_LINE = {
  p0: { x: 20, y: 92 },
  p1: { x: 140, y: 48 },
  p2: { x: 260, y: 92 },
};

/** Nombre de cils dessinés. Assez pour lire une courbe, assez peu pour rester fluide
 *  pendant un drag (chaque déplacement redessine la totalité). */
export const LASH_COUNT = 23;

/** Écart vertical entre la pointe du cil et la pastille de saisie, en unités viewBox. */
export const HANDLE_GAP = 15;

// --- Lecture et normalisation des valeurs ----------------------------------------

/** Convertit une saisie utilisateur (« 11 », « 11,5 », « », null) en millimètres.
 * @param {string|number|null|undefined} value
 * @param {number} [fallback] valeur retournée si la saisie est vide ou illisible
 * @returns {number}
 */
export function parseMm(value, fallback = MM_DEFAULT) {
  if (typeof value === 'number') return Number.isFinite(value) && value > 0 ? value : fallback;
  if (typeof value !== 'string') return fallback;
  const n = parseFloat(value.replace(',', '.'));
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

/** Ramène une longueur dans les bornes métier. */
export function clampMm(mm) {
  if (!Number.isFinite(mm)) return MM_DEFAULT;
  return Math.min(MM_MAX, Math.max(MM_MIN, mm));
}

/** Arrondit au pas de saisie (0,5 mm par défaut). */
export function roundMm(mm, step = MM_STEP) {
  return Math.round(mm / step) * step;
}

/** Représentation textuelle stockée dans le formulaire : « 11 » et non « 11.0 ». */
export function formatMm(mm) {
  const rounded = Math.round(mm * 10) / 10;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
}

/** Longueur dessinée (unités viewBox) pour une longueur en millimètres. */
export function mmToRenderPx(mm) {
  const clamped = clampMm(mm);
  return PX_MIN + ((clamped - MM_MIN) / (MM_MAX - MM_MIN)) * (PX_MAX - PX_MIN);
}

// --- Validation ------------------------------------------------------------------

/** Valide une longueur saisie.
 * @param {string|number} value
 * @returns {{valid: boolean, empty: boolean, mm: number, warning: string|null}}
 *   `mm` est toujours exploitable pour le dessin (repli sur MM_DEFAULT).
 */
export function validateLashLength(value) {
  const raw = typeof value === 'string' ? value.trim() : value;
  if (raw === '' || raw === null || raw === undefined) {
    return { valid: true, empty: true, mm: MM_DEFAULT, warning: null };
  }
  const n = typeof raw === 'number' ? raw : parseFloat(String(raw).replace(',', '.'));
  if (!Number.isFinite(n)) {
    return { valid: false, empty: false, mm: MM_DEFAULT, warning: 'Valeur non numérique' };
  }
  if (n < MM_MIN) {
    return { valid: false, empty: false, mm: MM_MIN, warning: `Minimum ${MM_MIN} mm` };
  }
  if (n > MM_MAX) {
    return { valid: false, empty: false, mm: MM_MAX, warning: `Maximum ${MM_MAX} mm` };
  }
  return { valid: true, empty: false, mm: n, warning: null };
}

/** Longueur maximale raisonnable selon l'état du cil naturel, en millimètres.
 *  Le champ « santé des cils » est du texte libre : on cherche des mots-clés et on
 *  reste permissif (aucun mot reconnu ⇒ plafond métier standard). */
const HEALTH_LIMITS = [
  { keywords: ['très fin', 'tres fin', 'fragile', 'abîmé', 'abime', 'clairsemé', 'clairseme', 'cassant'], max: 11 },
  { keywords: ['fin', 'court', 'sensible'], max: 13 },
  { keywords: ['épais', 'epais', 'résistant', 'resistant', 'fort', 'dense'], max: 16 },
];

/** Une extension de `mm` est-elle supportable par ce type de cil naturel ?
 * @param {string|number} mm
 * @param {string} [lashType] texte libre décrivant les cils naturels
 * @returns {boolean}
 */
export function isSafeForNaturalLash(mm, lashType = '') {
  const value = parseMm(mm);
  if (value < MM_MIN || value > MM_MAX) return false;
  const text = String(lashType).toLowerCase();
  const rule = HEALTH_LIMITS.find((r) => r.keywords.some((k) => text.includes(k)));
  return value <= (rule ? rule.max : MM_MAX);
}

// --- Géométrie du dessin ---------------------------------------------------------

/** Point du bord ciliaire à la position `t` (0 = coin gauche, 1 = coin droit). */
export function lashLinePoint(t) {
  const { p0, p1, p2 } = LASH_LINE;
  const u = 1 - t;
  return {
    x: u * u * p0.x + 2 * u * t * p1.x + t * t * p2.x,
    y: u * u * p0.y + 2 * u * t * p1.y + t * t * p2.y,
  };
}

/** Inclinaison du cil à la position `t`, en unités viewBox d'écart horizontal :
 *  les cils s'éventent vers l'extérieur, verticaux au sommet de la courbure. */
export function lashSlantAt(t) {
  return (t - 0.5) * 26;
}

/** Longueur (mm) à la position `t`, interpolée linéairement entre les deux zones
 *  voisines — c'est ce qui donne une transition douce entre deux valeurs saisies.
 * @param {number} t
 * @param {Array<{t:number}>} zones
 * @param {Array<string|number>} values
 * @returns {number} millimètres, hors bornage
 */
export function interpolateLength(t, zones, values) {
  if (!zones || zones.length === 0) return MM_DEFAULT;
  const at = (i) => parseMm(values?.[i]);
  if (zones.length === 1 || t <= zones[0].t) return at(0);
  const last = zones.length - 1;
  if (t >= zones[last].t) return at(last);
  for (let i = 0; i < last; i += 1) {
    if (t >= zones[i].t && t <= zones[i + 1].t) {
      const span = zones[i + 1].t - zones[i].t;
      const local = span === 0 ? 0 : (t - zones[i].t) / span;
      return at(i) * (1 - local) + at(i + 1) * local;
    }
  }
  return MM_DEFAULT;
}

/** Segment d'un cil dessiné à la position `t`.
 * @returns {{x1:number, y1:number, x2:number, y2:number, mm:number, length:number}}
 */
export function calculateLashLine(t, zones, values) {
  const { x, y } = lashLinePoint(t);
  const mm = interpolateLength(t, zones, values);
  const length = mmToRenderPx(mm);
  const slant = lashSlantAt(t);
  return { x1: x, y1: y, x2: x + slant, y2: y - length, mm, length };
}

/** Tous les cils du diagramme, prêts à être rendus en `<line>`.
 * @param {Array<string|number>} values
 * @param {Array<{t:number}>} zones
 * @param {number} [count]
 * @returns {Array<{key:number, x1:number, y1:number, x2:number, y2:number, mm:number}>}
 */
export function buildLashLines(values, zones, count = LASH_COUNT) {
  const lines = [];
  for (let i = 0; i < count; i += 1) {
    const t = 0.04 + (i / (count - 1)) * 0.92;
    lines.push({ key: i, ...calculateLashLine(t, zones, values) });
  }
  return lines;
}

/** Point d'ancrage de la pastille de saisie d'une zone : juste au-dessus de la pointe
 *  du cil, pour que la pastille monte et descende avec la valeur. */
export function handleAnchor(zone, values) {
  const { x, y } = lashLinePoint(zone.t);
  const mm = parseMm(values?.[zone.index]);
  return { x: x + lashSlantAt(zone.t), y: y - mmToRenderPx(mm) - HANDLE_GAP, mm };
}

// --- Comparaison entre séances ---------------------------------------------------

/** Moyenne des longueurs saisies d'une série de zones (null si tout est vide). */
export function averageMm(values) {
  const filled = (values ?? []).filter((v) => String(v ?? '').trim() !== '');
  if (filled.length === 0) return null;
  return filled.reduce((sum, v) => sum + parseMm(v), 0) / filled.length;
}

function labelOf(value) {
  if (Array.isArray(value)) return value.join(', ');
  const text = String(value ?? '').trim();
  return text === '' ? '—' : text;
}

const COMPARED_FIELDS = [
  ['curl', 'Courbure'],
  ['length', 'Longueur'],
  ['thickness', 'Épaisseur'],
  ['baseType', 'Type de base'],
  ['adhesive', 'Colle'],
  ['setShape', 'Forme de pose'],
  ['styles', 'Style'],
  ['effects', 'Effet'],
];

/** Différences entre deux Lash Maps, pour la frise de comparaison.
 * @param {object} currentMap
 * @param {object} previousMap
 * @returns {{changes: Array<{key:string, label:string, from:string, to:string, delta:number|null}>}}
 */
export function diffMaps(currentMap, previousMap) {
  const changes = [];
  if (!currentMap || !previousMap) return { changes };

  COMPARED_FIELDS.forEach(([key, label]) => {
    const from = labelOf(previousMap[key]);
    const to = labelOf(currentMap[key]);
    if (from !== to) changes.push({ key, label, from, to, delta: null });
  });

  [['zonesLeft', 'Œil gauche (moy.)'], ['zonesRight', 'Œil droit (moy.)']].forEach(([key, label]) => {
    const before = averageMm(previousMap[key]);
    const after = averageMm(currentMap[key]);
    if (before === null || after === null) return;
    const delta = Math.round((after - before) * 10) / 10;
    if (delta === 0) return;
    changes.push({
      key,
      label,
      from: `${formatMm(before)} mm`,
      to: `${formatMm(after)} mm`,
      delta,
    });
  });

  return { changes };
}

// --- Coût de revient (préparation branchement stock) -----------------------------

/** Estimation du coût de revient d'une pose.
 *
 * Volontairement non branchée sur le stock pour l'instant : la fonction reste pure et
 * retourne `null` tant qu'aucun coût unitaire n'est fourni, ce qui permet d'appeler
 * l'affichage sans attendre l'intégration produits.
 * @param {{zonesLeft?:Array, zonesRight?:Array, thickness?:string}} map
 * @param {{costPerLash?:number, lashesPerEye?:number}} [pricing]
 * @returns {{lashes:number, cost:number}|null}
 */
export function estimateProductCost(map, pricing = {}) {
  const { costPerLash, lashesPerEye = 90 } = pricing;
  if (!Number.isFinite(costPerLash)) return null;
  const lashes = lashesPerEye * 2;
  return { lashes, cost: Math.round(lashes * costPerLash * 100) / 100 };
}
