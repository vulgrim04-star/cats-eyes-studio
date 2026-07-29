/** Référentiels de séance et modèles de pose (« templates »).
 *
 * Un modèle décrit un profil de longueurs du coin INTERNE vers le coin EXTERNE, plus
 * les réglages globaux de l'œil. Le profil est indépendant du nombre de secteurs
 * affiché : `sampleProfileAt` (lashModel) le rééchantillonne.
 */

/** Types de séance. `cycle` pré-remplit le cycle de retouche (texte libre lu par
 *  `utils/lashCycle.js`) : choisir « Retouche 3 sem » suffit à dater la suivante.
 *  Les libellés historiques restent présents : des fiches les utilisent déjà. */
export const POSE_TYPES = [
  { value: 'Pose complète', cycle: '3 semaines' },
  { value: 'Retouche 2 sem', cycle: '2 semaines' },
  { value: 'Retouche 3 sem', cycle: '3 semaines' },
  { value: 'Retouche 4 sem', cycle: '4 semaines' },
  { value: 'Dépose + repose', cycle: '3 semaines' },
  { value: 'Dépose', cycle: '' },
];

export const EYE_SHAPES = ['Amande', 'Rond', 'Monolid', 'Tombant', 'Rapproché', 'Écarté'];
export const SET_SHAPES = ['Naturel', 'Cat Eye', 'Doll Eye', 'Open Eye', 'Squirrel', 'Fox Eyes', 'Wispy'];

/** Les treize modèles du cahier des charges. `profile` = longueurs en mm, du coin
 *  interne au coin externe. */
export const MAP_TEMPLATES = [
  {
    id: 'natural',
    label: 'Natural',
    hint: 'Effet discret, suit la ligne naturelle',
    profile: [8, 9, 10, 10, 9, 8],
    global: { curl: 'C', diameter: '0.15', style: 'Classique', density: 'Classic', color: 'Noir' },
  },
  {
    id: 'classic-cat-eye',
    label: 'Cat Eye',
    hint: 'Dégradé croissant vers le coin externe',
    profile: [8, 9, 10, 11, 12, 13],
    global: { curl: 'CC', diameter: '0.07', style: 'Volume Russe', density: '3D', color: 'Noir' },
  },
  {
    id: 'doll-eye',
    label: 'Doll Eye',
    hint: 'Longueurs maximales au centre, regard arrondi',
    profile: [9, 11, 13, 13, 11, 9],
    global: { curl: 'D', diameter: '0.07', style: 'Volume Russe', density: '4D', color: 'Noir' },
  },
  {
    id: 'open-eye',
    label: 'Open Eye',
    hint: 'Ouvre le regard, sommet légèrement avancé',
    profile: [9, 11, 12, 12, 11, 10],
    global: { curl: 'D', diameter: '0.07', style: 'Hybride', density: '3D', color: 'Noir' },
  },
  {
    id: 'squirrel',
    label: 'Squirrel',
    hint: 'Sommet aux deux tiers puis léger retrait',
    profile: [8, 10, 11, 13, 12, 11],
    global: { curl: 'D', diameter: '0.07', style: 'Hybride', density: '3D', color: 'Noir' },
  },
  {
    id: 'fox-eyes',
    label: 'Fox Eyes',
    hint: 'Regard étiré, base droite à l’intérieur',
    profile: [7, 8, 9, 11, 13, 14],
    global: { curl: 'L', diameter: '0.07', style: 'Volume Russe', density: '4D', color: 'Noir' },
  },
  {
    id: 'wispy',
    label: 'Wispy',
    hint: 'Alternance de spikes, effet plumeux',
    profile: [9, 11, 10, 12, 11, 13],
    global: { curl: 'CC', diameter: '0.05', style: 'Wispy', density: '4D', color: 'Noir' },
  },
  {
    id: 'kim-k',
    label: 'Kim K',
    hint: 'Spikes marqués très réguliers',
    profile: [9, 12, 10, 13, 11, 13],
    global: { curl: 'CC', diameter: '0.05', style: 'Kim K', density: '5D', color: 'Noir' },
  },
  {
    id: 'anime',
    label: 'Anime',
    hint: 'Spikes contrastés, très graphique',
    profile: [8, 12, 9, 13, 9, 12],
    global: { curl: 'D', diameter: '0.03', style: 'Anime', density: '6D', color: 'Noir' },
  },
  {
    id: 'wet-look',
    label: 'Wet Look',
    hint: 'Pointes groupées, effet mouillé',
    profile: [9, 10, 12, 12, 11, 10],
    global: { curl: 'CC', diameter: '0.05', style: 'Wet Look', density: '3D', color: 'Noir' },
  },
  {
    id: 'hybrid',
    label: 'Hybrid',
    hint: 'Mélange cil à cil et bouquets',
    profile: [8, 10, 11, 12, 11, 10],
    global: { curl: 'C', diameter: '0.07', style: 'Hybride', density: '3D', color: 'Noir' },
  },
  {
    id: 'volume-russe',
    label: 'Volume Russe',
    hint: 'Bouquets fins, densité homogène',
    profile: [9, 10, 11, 12, 11, 10],
    global: { curl: 'C', diameter: '0.05', style: 'Volume Russe', density: '4D', color: 'Noir' },
  },
  {
    id: 'mega-volume',
    label: 'Mega Volume',
    hint: 'Densité maximale, fibres très fines',
    profile: [9, 10, 12, 12, 11, 10],
    global: { curl: 'D', diameter: '0.03', style: 'Mega Volume', density: '6D', color: 'Noir' },
  },
];

/** Cycle de retouche associé à un type de séance (chaîne vide si non pertinent). */
export function cycleForPoseType(poseType) {
  return POSE_TYPES.find((p) => p.value === poseType)?.cycle ?? '';
}

/** Suggestion de forme de pose à partir de la courbure et de la technique.
 *  Purement indicative : affichée comme un conseil, jamais appliquée d'office.
 * @returns {string|null} phrase courte à afficher, ou null
 */
export function suggestSetShape(curl, style) {
  const isVolume = style === 'Volume Russe' || style === 'Mega Volume';
  if ((curl === 'CC' || curl === 'D') && isVolume) return 'Cat Eye recommandé pour cette courbure';
  if (curl === 'DD') return 'Courbure très marquée : réservez-la aux paupières tombantes';
  if (curl === 'L' || curl === 'M') return 'Courbure à base droite : idéale sur monolid et Fox Eyes';
  if (curl === 'J' || curl === 'B') return 'Courbure douce : effet naturel, peu ouvrant';
  return null;
}
