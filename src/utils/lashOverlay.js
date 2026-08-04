/** Calage du tracé vectoriel sur la photo de la cliente, pour la simulation avant/après.
 *
 *  CE QUE FAIT CETTE SIMULATION, ET CE QU'ELLE NE FAIT PAS. Elle superpose le schéma —
 *  celui-là même qui sera posé — sur la photo, ajustable à l'œil, avec un volet
 *  avant/après. Elle ne fabrique pas une image photoréaliste : cela relèverait d'un modèle
 *  génératif, que cette application, hors-ligne et sans serveur, n'a pas. Mieux vaut un
 *  aperçu honnête qu'une promesse qu'on ne tient pas devant la cliente.
 *
 *  Tout est ici en POURCENTAGES de la photo, jamais en pixels : le réglage est enregistré
 *  sur la fiche et doit valoir aussi bien sur le téléphone en cabine que sur l'écran du
 *  bureau, où la photo n'a pas la même taille affichée.
 */

export const OVERLAY_DEFAULT = {
  /** Centre du tracé, en % de la largeur et de la hauteur de la photo. */
  x: 50,
  y: 55,
  /** Largeur du tracé, en % de la largeur de la photo. */
  scale: 60,
  /** Opacité du tracé, en %. */
  opacity: 85,
  /** Position du volet avant/après, en % depuis la gauche. */
  wipe: 50,
};

const BOUNDS = {
  x: [0, 100],
  y: [0, 100],
  // En deçà de 10 % le tracé n'est plus lisible ; au-delà de 200 % il ne sert plus à rien
  // de l'agrandir, on ne voit plus que le coin d'un œil.
  scale: [10, 200],
  opacity: [10, 100],
  wipe: [0, 100],
};

function clamp(value, [min, max], fallback) {
  const n = typeof value === 'number' ? value : Number.parseFloat(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, Math.round(n * 10) / 10));
}

/** Met un réglage — absent, partiel ou venu d'une ancienne fiche — dans sa forme
 *  canonique. Aucune valeur ne peut sortir de ses bornes : le tracé doit rester
 *  récupérable à l'écran, même après une saisie malheureuse. */
export function normalizeOverlay(overlay) {
  const source = overlay ?? {};
  return {
    x: clamp(source.x, BOUNDS.x, OVERLAY_DEFAULT.x),
    y: clamp(source.y, BOUNDS.y, OVERLAY_DEFAULT.y),
    scale: clamp(source.scale, BOUNDS.scale, OVERLAY_DEFAULT.scale),
    opacity: clamp(source.opacity, BOUNDS.opacity, OVERLAY_DEFAULT.opacity),
    wipe: clamp(source.wipe, BOUNDS.wipe, OVERLAY_DEFAULT.wipe),
  };
}

/**
 * Style CSS du calque, à poser sur un conteneur en `position: relative`.
 *
 * Le tracé est centré sur (x, y) — d'où la translation de moitié : sans elle, déplacer le
 * calque le ferait pivoter autour de son coin, ce qui est impossible à viser au doigt.
 *
 * @param {object} overlay réglage
 * @param {number} ratio hauteur / largeur du tracé, pour que l'échelle porte sur la largeur
 */
export function overlayStyle(overlay, ratio) {
  const { x, y, scale, opacity } = normalizeOverlay(overlay);
  const safeRatio = Number.isFinite(ratio) && ratio > 0 ? ratio : 0.8;
  return {
    position: 'absolute',
    left: `${x}%`,
    top: `${y}%`,
    width: `${scale}%`,
    // La hauteur suit la largeur : le tracé ne doit jamais se déformer.
    aspectRatio: `1 / ${safeRatio}`,
    transform: 'translate(-50%, -50%)',
    opacity: opacity / 100,
    pointerEvents: 'none',
  };
}

/**
 * Découpe du volet « après ».
 *
 * `inset` masque tout ce qui se trouve à GAUCHE du volet : la partie droite de l'image
 * montre donc le résultat simulé, la gauche la photo nue. C'est le sens de lecture
 * habituel de ces comparateurs, et celui de la poignée qu'on fait glisser.
 */
export function wipeClip(overlay) {
  const { wipe } = normalizeOverlay(overlay);
  return `inset(0 0 0 ${wipe}%)`;
}

/** Position du volet à partir d'un clic ou d'un glissé sur la photo.
 * @param {number} clientX abscisse du pointeur, en pixels écran
 * @param {{left:number, width:number}} rect cadre de la photo
 */
export function wipeFromPointer(clientX, rect) {
  if (!rect || !rect.width) return OVERLAY_DEFAULT.wipe;
  return clamp(((clientX - rect.left) / rect.width) * 100, BOUNDS.wipe, OVERLAY_DEFAULT.wipe);
}

/** Une photo est-elle exploitable pour la simulation ?
 *
 *  Une URL distante ne l'est PAS : la rastérisation charge le SVG comme une image, et une
 *  `<image>` pointant hors du document n'y serait jamais chargée — la photo disparaîtrait
 *  des exports sans le moindre message. Il faut une data URL. */
export function isEmbeddable(src) {
  return typeof src === 'string' && src.startsWith('data:image/');
}
