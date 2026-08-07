/** Le VOCABULAIRE du métier des cils : ce qu'on peut choisir, et rien d'autre.
 *
 *  POURQUOI CES LISTES VIVENT SEULES. Elles étaient dans `lashModel`, et c'était logique
 *  jusqu'au jour où `lashRender` — qui traduit une fiche en dessin — a eu besoin de les
 *  lire pour vérifier qu'il couvrait bien chaque valeur. Il s'est alors formé un cercle :
 *  `lashModel` → `lashGeometry` → `lashRender` → `lashModel`. Selon le fichier par lequel
 *  on entrait, un module recevait de son voisin un `undefined` au lieu d'un tableau, et
 *  l'application tombait au chargement — sans que rien, ni au build ni au lint, ne le
 *  signale.
 *
 *  D'où ce fichier, qui NE DÉPEND DE RIEN. Toute la chaîne peut le lire sans que personne
 *  n'attende personne. `lashModel` les réexporte, de sorte que les vingt appelants
 *  existants continuent de les lire là où ils les ont toujours lues.
 */

export const CURLS = ['J', 'B', 'C', 'CC', 'D', 'DD', 'L', 'M'];
export const DIAMETERS = ['0.03', '0.05', '0.07', '0.10', '0.12', '0.15'];
export const DENSITIES = ['Classic', '2D', '3D', '4D', '5D', '6D', 'Mega Volume'];
export const TECHNIQUES = [
  'Classique',
  'Hybride',
  'Volume Russe',
  'Mega Volume',
  'Wispy',
  'Kim K',
  'Wet Look',
  'Anime',
];
export const COLORS = ['Noir', 'Brun', 'Mix', 'Coloré'];
export const QUICK_LENGTHS = [8, 9, 10, 11, 12, 13, 14, 15];
