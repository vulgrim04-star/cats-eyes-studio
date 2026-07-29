/** Logique d'interaction du diagramme : découpage en zones, détection de la zone
 *  visée, conversion d'un déplacement du doigt en millimètres, opérations sur la
 *  liste de valeurs.
 *
 *  Comme `utils/lashCalculations.js`, ce fichier est volontairement sans React ni DOM :
 *  la manipulation tactile est du calcul, et du calcul se teste.
 */

import {
  MM_STEP,
  VIEWBOX,
  clampMm,
  formatMm,
  lashLinePoint,
  parseMm,
  roundMm,
} from '../../utils/lashCalculations';

/** Une lash map en dessous de 4 zones ne décrit plus une courbe, au-dessus de 10 elle
 *  devient illisible sur un écran de téléphone. */
export const MIN_ZONES = 4;
export const MAX_ZONES = 10;

/** Sensibilité du drag : 40 px de déplacement du doigt = 3 mm de longueur.
 *  Assez lent pour viser le demi-millimètre, assez rapide pour parcourir 6→18 mm
 *  sans lever le doigt (160 px de course totale). */
export const DRAG_PX_PER_MM = 40 / 3;

/** Rayon de tolérance (unités viewBox) pour rattacher un appui « à côté » à une zone. */
const HIT_RADIUS_X = 26;

/** Répartit `count` zones le long du bord ciliaire, entre 10 % et 90 % de la courbe.
 *  Les extrémités sont écartées des coins : personne ne pose d'extension sur le tout
 *  dernier millimètre de la paupière.
 * @param {number} count
 * @returns {Array<{id:string, index:number, t:number, x:number, y:number, left:number, top:number}>}
 */
export function buildZones(count) {
  const n = Math.max(1, Math.floor(count) || 1);
  return Array.from({ length: n }, (_, index) => {
    const t = n === 1 ? 0.5 : 0.1 + 0.8 * (index / (n - 1));
    const { x, y } = lashLinePoint(t);
    return {
      id: `zone-${index}`,
      index,
      t,
      x,
      y,
      left: (x / VIEWBOX.width) * 100,
      top: (y / VIEWBOX.height) * 100,
    };
  });
}

/** Zone visée par un appui aux coordonnées (x, y) exprimées dans le repère du viewBox.
 *  On raisonne principalement sur l'axe horizontal : verticalement, tout le dessin
 *  au-dessus du bord ciliaire appartient à la zone la plus proche en x.
 * @param {Array<{x:number, index:number}>} zonePositions
 * @param {number} x
 * @param {number} y
 * @returns {object|null}
 */
export function getZoneAtPosition(zonePositions, x, y) {
  if (!zonePositions || zonePositions.length === 0) return null;
  if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
  if (y < 0 || y > VIEWBOX.height) return null;

  let best = null;
  let bestDistance = Infinity;
  zonePositions.forEach((zone) => {
    const distance = Math.abs(zone.x - x);
    if (distance < bestDistance) {
      best = zone;
      bestDistance = distance;
    }
  });
  return bestDistance <= HIT_RADIUS_X ? best : null;
}

/** Convertit un déplacement du doigt en écart de longueur.
 *  Le signe est celui du dessin : vers le HAUT = cil plus long. L'appelant passe donc
 *  `startY - currentY`, jamais l'inverse — un drag vers le bas qui allonge le cil
 *  donnerait l'impression de tirer sur un élastique dans le mauvais sens.
 * @param {number} pxDelta pixels écran parcourus vers le haut (positif = vers le haut)
 * @returns {number} millimètres
 */
export function pixelsToDelta(pxDelta) {
  return pxDelta / DRAG_PX_PER_MM;
}

/** Réciproque de `pixelsToDelta`. */
export function mmToPixels(mm) {
  return mm * DRAG_PX_PER_MM;
}

/** Nouvelle valeur d'une zone pendant un drag.
 * @param {string|number} startValue valeur au moment de l'appui
 * @param {number} pxDelta pixels parcourus vers le haut depuis l'appui
 * @returns {{mm:number, value:string}} valeur bornée, arrondie au pas de saisie
 */
export function applyDrag(startValue, pxDelta) {
  const start = parseMm(startValue);
  const mm = clampMm(roundMm(start + pixelsToDelta(pxDelta), MM_STEP));
  return { mm, value: formatMm(mm) };
}

/** Incrément clavier (flèches) d'une zone.
 * @param {string|number} currentValue
 * @param {number} steps nombre de pas (positif = plus long)
 * @param {number} [step] taille du pas en mm
 */
export function stepZoneValue(currentValue, steps, step = MM_STEP) {
  const mm = clampMm(roundMm(parseMm(currentValue) + steps * step, step));
  return { mm, value: formatMm(mm) };
}

// --- Opérations sur la liste des zones -------------------------------------------

/** Remplace la valeur d'une zone (retourne une nouvelle liste). */
export function setZoneValue(values, index, value) {
  const next = [...values];
  next[index] = value;
  return next;
}

/** Ajoute une zone en fin de liste, dans la limite de MAX_ZONES.
 *  La nouvelle zone hérite de la valeur de la précédente : ajouter une case ne doit
 *  pas creuser un trou au milieu d'un dégradé déjà réglé. */
export function addZone(values) {
  if (values.length >= MAX_ZONES) return values;
  return [...values, values[values.length - 1] ?? ''];
}

/** Retire la dernière zone, dans la limite de MIN_ZONES. */
export function removeZone(values) {
  if (values.length <= MIN_ZONES) return values;
  return values.slice(0, -1);
}

/** Ajuste une liste de valeurs à `count` zones (troncature ou prolongation). */
export function resizeZones(values, count) {
  const target = Math.min(MAX_ZONES, Math.max(MIN_ZONES, count));
  if (values.length === target) return values;
  if (values.length > target) return values.slice(0, target);
  const next = [...values];
  while (next.length < target) next.push(next[next.length - 1] ?? '');
  return next;
}

/** Symétrique d'un œil vers l'autre : les deux diagrammes sont dessinés en miroir
 *  (coins internes face à face), donc copier une lash map d'un œil à l'autre suppose
 *  d'inverser l'ordre des zones. */
export function mirrorZones(values) {
  return [...values].reverse();
}

/** Nom lisible d'une zone, pour les libellés d'accessibilité et les infobulles.
 * @param {number} index
 * @param {number} count
 * @param {'left'|'right'} innerCorner côté du coin interne dans le dessin
 */
export function zoneLabel(index, count, innerCorner = 'left') {
  const isFirst = index === 0;
  const isLast = index === count - 1;
  if (isFirst) return innerCorner === 'left' ? 'Coin interne' : 'Coin externe';
  if (isLast) return innerCorner === 'left' ? 'Coin externe' : 'Coin interne';
  return `Zone ${index + 1}`;
}
