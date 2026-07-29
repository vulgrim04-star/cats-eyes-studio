/** Référentiels métier de la Lash Map : listes de choix, modèles de pose et
 *  suggestions. Séparé des composants pour qu'un ajout de style ou de courbure ne
 *  demande jamais de toucher au rendu.
 */

import { formatMm } from './lashCalculations';

/** Types de séance. `cycle` pré-remplit le cycle de retouche (texte libre lu par
 *  `utils/lashCycle.js`) : choisir « Retouche 3 sem » suffit à dater la suivante.
 *  Les libellés historiques (« Pose complète », « Retouche », « Dépose ») sont
 *  conservés : des fiches enregistrées les utilisent déjà. */
export const POSE_TYPES = [
  { value: 'Pose complète', cycle: '3 semaines' },
  { value: 'Retouche 2 sem', cycle: '2 semaines' },
  { value: 'Retouche 3 sem', cycle: '3 semaines' },
  { value: 'Retouche 4 sem', cycle: '4 semaines' },
  { value: 'Dépose + repose', cycle: '3 semaines' },
  { value: 'Dépose', cycle: '' },
];

export const STYLES = ['Classique', 'Volume', 'Mega volume', 'Hybride', 'Wispy'];
export const EFFECTS = ['Cat Eye', 'Open Eye', 'Doll Eye', 'Squirrel', 'Rounded', 'Wispy'];
export const CURLS = ['J', 'B', 'C', 'CC', 'D', 'DD', 'L', 'M'];
export const EYE_SHAPES = ['Amande', 'Rond', 'Monolid', 'Tombant', 'Rapproché', 'Écarté'];
export const SET_SHAPES = ['Naturel', 'Cat Eye', 'Doll Eye', 'Open Eye', 'Squirrel', 'Wispy'];
export const BASE_TYPES = ['Isolation (cil à cil)', 'Pré-fanné', 'Handmade', 'Mixte'];
export const LENGTHS = [8, 9, 10, 11, 12, 13, 14, 15];
export const THICKNESSES = [0.03, 0.05, 0.07, 0.1, 0.12, 0.15];

/** Modèles de pose. `profile` décrit les longueurs du coin INTERNE (index 0) vers le
 *  coin EXTERNE, indépendamment du nombre de cases affiché : `sampleProfile` le
 *  rééchantillonne sur le nombre de zones courant. */
export const MAP_PRESETS = [
  {
    id: 'naturel-fin',
    label: 'Naturel fin',
    hint: 'Cils fragiles, effet discret',
    curl: 'C',
    styles: ['Classique'],
    effects: [],
    setShape: 'Naturel',
    profile: [8, 9, 10, 10, 9, 8],
  },
  {
    id: 'doll-eye',
    label: 'Doll Eye',
    hint: 'Longueurs maximales au centre, regard arrondi',
    curl: 'D',
    styles: ['Volume'],
    effects: ['Doll Eye'],
    setShape: 'Doll Eye',
    profile: [9, 11, 13, 13, 11, 9],
  },
  {
    id: 'cat-eye',
    label: 'Cat Eye',
    hint: 'Dégradé croissant vers le coin externe',
    curl: 'CC',
    styles: ['Volume'],
    effects: ['Cat Eye'],
    setShape: 'Cat Eye',
    profile: [8, 9, 10, 11, 12, 13],
  },
  {
    id: 'squirrel',
    label: 'Squirrel',
    hint: 'Sommet aux deux tiers puis léger retrait',
    curl: 'D',
    styles: ['Hybride'],
    effects: ['Squirrel'],
    setShape: 'Squirrel',
    profile: [8, 10, 11, 13, 12, 11],
  },
  {
    id: 'open-eye',
    label: 'Open Eye',
    hint: 'Ouvre le regard, centre légèrement relevé',
    curl: 'D',
    styles: ['Hybride'],
    effects: ['Open Eye'],
    setShape: 'Open Eye',
    profile: [9, 10, 12, 12, 11, 10],
  },
  {
    id: 'wispy',
    label: 'Wispy',
    hint: 'Alternance de spikes, effet plumeux',
    curl: 'CC',
    styles: ['Volume', 'Wispy'],
    effects: ['Wispy'],
    setShape: 'Wispy',
    profile: [9, 11, 10, 12, 11, 13],
  },
];

/** Rééchantillonne un profil de longueurs sur `count` zones.
 *  Interpolation linéaire : un profil à 6 points reste correct sur 4 comme sur 10 cases.
 * @param {number[]} profile longueurs en mm, du coin interne vers le coin externe
 * @param {number} count nombre de zones cible
 * @returns {string[]} valeurs prêtes pour le formulaire
 */
export function sampleProfile(profile, count) {
  const n = Math.max(1, Math.floor(count) || 1);
  if (!profile || profile.length === 0) return Array.from({ length: n }, () => '');
  if (profile.length === 1) return Array.from({ length: n }, () => formatMm(profile[0]));

  return Array.from({ length: n }, (_, i) => {
    const position = n === 1 ? 0 : (i / (n - 1)) * (profile.length - 1);
    const low = Math.floor(position);
    const high = Math.min(profile.length - 1, low + 1);
    const local = position - low;
    return formatMm(profile[low] * (1 - local) + profile[high] * local);
  });
}

/** Champs de formulaire produits par l'application d'un modèle.
 * @param {object} preset entrée de MAP_PRESETS
 * @param {number} zoneCount nombre de zones courant
 * @returns {object} patch à fusionner dans le formulaire
 */
export function applyPreset(preset, zoneCount) {
  const zones = sampleProfile(preset.profile, zoneCount);
  return {
    curl: preset.curl,
    styles: [...preset.styles],
    effects: [...preset.effects],
    setShape: preset.setShape,
    zonesLeft: zones,
    zonesRight: [...zones],
  };
}

/** Cycle de retouche associé à un type de séance (chaîne vide si non pertinent). */
export function cycleForPoseType(poseType) {
  return POSE_TYPES.find((p) => p.value === poseType)?.cycle ?? '';
}

/** Suggestion de forme de pose à partir de la courbure et des styles choisis.
 *  Purement indicative : affichée comme un conseil, jamais appliquée d'office.
 * @returns {string|null} phrase courte à afficher, ou null
 */
export function suggestSetShape(curl, styles = []) {
  const hasVolume = styles.some((s) => s === 'Volume' || s === 'Mega volume');
  if ((curl === 'CC' || curl === 'D') && hasVolume) return 'Cat Eye recommandé pour cette courbure';
  if (curl === 'DD') return 'Courbure très marquée : réservez-la aux paupières tombantes';
  if (curl === 'L' || curl === 'M') return 'Courbure à base droite : idéale sur monolid';
  if (curl === 'J' || curl === 'B') return 'Courbure douce : effet naturel, peu ouvrant';
  return null;
}
