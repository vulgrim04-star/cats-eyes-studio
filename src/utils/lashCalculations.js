/** Règles métier de la Lash Map : longueurs, bornes, validation, comparaison.
 *
 * Ce module ne connaît RIEN du dessin (voir `lashGeometry.js`) ni de la forme de
 * stockage (voir `lashModel.js`). Il ne contient que des fonctions pures, pour que le
 * rendu, les tests et l'export partagent exactement les mêmes règles.
 */

// --- Bornes métier (millimètres) -------------------------------------------------

/** En dessous, ce n'est plus une extension mais un cil naturel nu. */
export const MM_MIN = 6;
/** Au-delà, l'extension devient trop lourde pour un cil naturel, quel qu'il soit. */
export const MM_MAX = 18;
/** Longueur « neutre » utilisée pour dessiner un secteur laissé vide. */
export const MM_DEFAULT = 11;
/** Pas de saisie : les fournisseurs vendent au demi-millimètre. */
export const MM_STEP = 0.5;

// --- Lecture et normalisation ----------------------------------------------------

/** Convertit une saisie utilisateur (« 11 », « 11,5 », 11, '', null) en millimètres.
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

/** Représentation d'affichage : « 11 » et non « 11.0 ». */
export function formatMm(mm) {
  const rounded = Math.round(mm * 10) / 10;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
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
  if (n < MM_MIN) return { valid: false, empty: false, mm: MM_MIN, warning: `Minimum ${MM_MIN} mm` };
  if (n > MM_MAX) return { valid: false, empty: false, mm: MM_MAX, warning: `Maximum ${MM_MAX} mm` };
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

// --- Interpolation ---------------------------------------------------------------

/** Longueur (mm) à la position `t` d'une courbe, interpolée linéairement entre les
 *  deux points d'ancrage voisins — c'est ce qui donne un dégradé continu de cils
 *  alors que les valeurs, elles, sont saisies secteur par secteur.
 * @param {number} t
 * @param {number[]} anchors positions (croissantes) des valeurs sur la courbe
 * @param {Array<string|number>} values
 * @returns {number} millimètres
 */
export function interpolateLength(t, anchors, values) {
  if (!anchors || anchors.length === 0) return MM_DEFAULT;
  const at = (i) => parseMm(values?.[i]);
  const last = anchors.length - 1;
  if (anchors.length === 1 || t <= anchors[0]) return at(0);
  if (t >= anchors[last]) return at(last);
  for (let i = 0; i < last; i += 1) {
    if (t >= anchors[i] && t <= anchors[i + 1]) {
      const span = anchors[i + 1] - anchors[i];
      const local = span === 0 ? 0 : (t - anchors[i]) / span;
      return at(i) * (1 - local) + at(i + 1) * local;
    }
  }
  return MM_DEFAULT;
}

/** Moyenne des longueurs renseignées (null si tout est vide). */
export function averageMm(values) {
  const filled = (values ?? []).filter((v) => String(v ?? '').trim() !== '');
  if (filled.length === 0) return null;
  return filled.reduce((sum, v) => sum + parseMm(v), 0) / filled.length;
}

// --- Ajustement au doigt ---------------------------------------------------------

/** Sensibilité du glissé : 40 px de déplacement du doigt = 3 mm de longueur.
 *  Assez lent pour viser le demi-millimètre, assez rapide pour parcourir 6→18 mm
 *  sans lever le doigt (160 px de course totale). */
export const DRAG_PX_PER_MM = 40 / 3;

/** Convertit un déplacement du doigt en écart de longueur.
 *  Le signe est celui du dessin : vers le HAUT = cil plus long. L'appelant passe donc
 *  `startY - currentY`, jamais l'inverse.
 * @param {number} pxDelta pixels écran parcourus vers le haut
 * @returns {number} millimètres
 */
export function pixelsToDelta(pxDelta) {
  return pxDelta / DRAG_PX_PER_MM;
}

/** Réciproque de `pixelsToDelta`. */
export function mmToPixels(mm) {
  return mm * DRAG_PX_PER_MM;
}

/** Nouvelle valeur d'un secteur pendant un glissé.
 * @param {string|number} startValue valeur au moment de l'appui
 * @param {number} pxDelta pixels parcourus vers le haut depuis l'appui
 * @returns {{mm:number, value:string}} valeur bornée, arrondie au pas de saisie
 */
export function applyDrag(startValue, pxDelta) {
  const mm = clampMm(roundMm(parseMm(startValue) + pixelsToDelta(pxDelta), MM_STEP));
  return { mm, value: formatMm(mm) };
}

/** Incrément clavier (flèches) d'un secteur.
 * @param {string|number} currentValue
 * @param {number} steps nombre de pas (positif = plus long)
 * @param {number} [step] taille du pas en mm
 */
export function stepZoneValue(currentValue, steps, step = MM_STEP) {
  const mm = clampMm(roundMm(parseMm(currentValue) + steps * step, step));
  return { mm, value: formatMm(mm) };
}

// --- Coût de revient (préparation branchement stock) -----------------------------

/** Estimation du coût de revient d'une pose.
 *
 * Volontairement non branchée sur le stock pour l'instant : la fonction reste pure et
 * retourne `null` tant qu'aucun coût unitaire n'est fourni, ce qui permet d'appeler
 * l'affichage sans attendre l'intégration produits.
 * @param {object} map
 * @param {{costPerLash?:number, lashesPerEye?:number}} [pricing]
 * @returns {{lashes:number, cost:number}|null}
 */
export function estimateProductCost(map, pricing = {}) {
  const { costPerLash, lashesPerEye = 90 } = pricing;
  if (!Number.isFinite(costPerLash)) return null;
  const lashes = lashesPerEye * 2;
  return { lashes, cost: Math.round(lashes * costPerLash * 100) / 100 };
}
