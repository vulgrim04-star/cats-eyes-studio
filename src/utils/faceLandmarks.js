/** Lecture des repères faciaux : ce qu'on en déduit, et ce qu'on refuse d'en déduire.
 *
 *  Le modèle rend 478 points normalisés (0–1) sur l'image. Ce module les traduit en
 *  informations utiles au Brow Lift — où sont les sourcils, quelle est la morphologie, quel
 *  est l'écart de symétrie — et rien d'autre.
 *
 *  IL EST PUR. Aucune dépendance à MediaPipe, à React ni au DOM : il reçoit un tableau de
 *  points et rend des nombres. C'est ce qui le rend testable sans charger 6 Mo de modèle,
 *  et c'est là qu'on corrige une règle qui se révélerait fausse sur un vrai visage.
 *
 *  UNE PRUDENCE DE FOND : une morphologie déduite de quatre distances reste une
 *  ESTIMATION. Elle est proposée, jamais imposée, et la praticienne peut la corriger — elle
 *  voit le visage, le programme ne voit que des coordonnées.
 */

/** Indices du maillage facial de MediaPipe (modèle à 478 points).
 *  Nommés plutôt que semés dans le code : un index nu ne se relit pas. */
export const LM = {
  faceTop: 10,
  chin: 152,
  cheekLeft: 234,
  cheekRight: 454,
  jawLeft: 172,
  jawRight: 397,
  foreheadLeft: 21,
  foreheadRight: 251,
  /** Arête supérieure de chaque sourcil, de la tête vers la queue. */
  browLeft: [70, 63, 105, 66, 107],
  browRight: [300, 293, 334, 296, 336],
  eyeLeftOuter: 33,
  eyeLeftInner: 133,
  eyeRightInner: 362,
  eyeRightOuter: 263,
};

const at = (points, index) => points?.[index] ?? null;
const distance = (a, b) => (a && b ? Math.hypot(a.x - b.x, a.y - b.y) : null);
const mean = (values) => (values.length ? values.reduce((s, v) => s + v, 0) / values.length : null);

/** Les repères sont-ils exploitables ? Un tableau trop court ou sans coordonnées
 *  utilisables doit être refusé net plutôt que produire des mesures inventées. */
export function isUsable(points) {
  if (!Array.isArray(points) || points.length < 400) return false;
  const needed = [LM.faceTop, LM.chin, LM.cheekLeft, LM.cheekRight, ...LM.browLeft, ...LM.browRight];
  return needed.every((i) => {
    const p = at(points, i);
    return p && Number.isFinite(p.x) && Number.isFinite(p.y);
  });
}

/**
 * Cadre de chaque sourcil, en fractions de l'image (0–1).
 *
 * C'est ce qui permet de POSER le tracé au bon endroit et à la bonne échelle, sans que la
 * praticienne ait à le caler à la main.
 *
 * @returns {{left:object, right:object, span:number}|null}
 */
export function browBoxes(points) {
  if (!isUsable(points)) return null;
  const boxOf = (indices) => {
    const xs = indices.map((i) => at(points, i).x);
    const ys = indices.map((i) => at(points, i).y);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    return {
      x: (minX + maxX) / 2,
      y: mean(ys),
      width: maxX - minX,
      // Les points ne décrivent que l'arête SUPÉRIEURE : l'épaisseur s'estime à partir de
      // la largeur, un sourcil faisant grossièrement le cinquième de sa longueur.
      height: (maxX - minX) * 0.22,
    };
  };
  return {
    left: boxOf(LM.browLeft),
    right: boxOf(LM.browRight),
    span: distance(at(points, LM.cheekLeft), at(points, LM.cheekRight)),
  };
}

/**
 * Morphologie estimée.
 *
 * Trois rapports suffisent à séparer les six familles : la hauteur sur la largeur, la
 * mâchoire sur les pommettes, et le front sur les pommettes. On teste du plus discriminant
 * au moins discriminant, et on retourne aussi la CONFIANCE — un visage à mi-chemin entre
 * deux familles ne doit pas être annoncé avec l'aplomb d'un cas d'école.
 *
 * @returns {{id:string, label:string, confidence:number, ratios:object}|null}
 */
export function estimateFaceShape(points) {
  if (!isUsable(points)) return null;
  const height = distance(at(points, LM.faceTop), at(points, LM.chin));
  const cheeks = distance(at(points, LM.cheekLeft), at(points, LM.cheekRight));
  const jaw = distance(at(points, LM.jawLeft), at(points, LM.jawRight)) ?? cheeks;
  const forehead = distance(at(points, LM.foreheadLeft), at(points, LM.foreheadRight)) ?? cheeks;
  if (!height || !cheeks) return null;

  const elongation = height / cheeks;
  const jawRatio = jaw / cheeks;
  const foreheadRatio = forehead / cheeks;

  const ratios = {
    elongation: Math.round(elongation * 100) / 100,
    jawRatio: Math.round(jawRatio * 100) / 100,
    foreheadRatio: Math.round(foreheadRatio * 100) / 100,
  };

  // La distance au cas type sert de confiance : plus on est près d'une frontière, moins on
  // affirme. `sûr` vaut 1, une frontière vaut ~0,5.
  const score = (value, target, tolerance) => Math.max(0, 1 - Math.abs(value - target) / tolerance);

  const candidates = [
    { id: 'long', label: 'Allongé', score: score(elongation, 1.6, 0.35) },
    { id: 'round', label: 'Rond', score: score(elongation, 1.15, 0.2) * score(jawRatio, 0.92, 0.3) },
    { id: 'square', label: 'Carré', score: score(elongation, 1.25, 0.25) * score(jawRatio, 1.0, 0.14) },
    { id: 'heart', label: 'Cœur', score: score(foreheadRatio, 1.02, 0.14) * score(jawRatio, 0.78, 0.2) },
    { id: 'diamond', label: 'Diamant', score: score(foreheadRatio, 0.84, 0.14) * score(jawRatio, 0.82, 0.18) },
    { id: 'oval', label: 'Ovale', score: score(elongation, 1.38, 0.22) * score(jawRatio, 0.88, 0.22) },
  ];

  const best = candidates.reduce((a, b) => (b.score > a.score ? b : a));
  return {
    id: best.id,
    label: best.label,
    confidence: Math.round(Math.min(1, best.score) * 100) / 100,
    ratios,
  };
}

/**
 * Écart de hauteur entre les deux sourcils, et largeur de référence.
 * Le résultat se passe tel quel à `analyseSymmetry` du conseiller.
 */
export function browHeights(points) {
  const boxes = browBoxes(points);
  if (!boxes) return null;
  return { leftY: boxes.left.y, rightY: boxes.right.y, span: boxes.span };
}

/**
 * Réglage de calage du tracé à partir des repères, en POURCENTAGES de l'image — la forme
 * qu'attend `lashOverlay`, pour que le résultat reste valable quelle que soit la taille
 * d'affichage.
 *
 * @param {Array} points repères
 * @param {number} [coverage] part de la largeur d'un sourcil que le tracé doit couvrir
 * @returns {{x:number, y:number, scale:number}|null}
 */
export function overlayFromLandmarks(points, coverage = 2.35) {
  const boxes = browBoxes(points);
  if (!boxes) return null;
  const centerX = (boxes.left.x + boxes.right.x) / 2;
  const centerY = (boxes.left.y + boxes.right.y) / 2;
  // Le tracé porte les DEUX sourcils : il doit couvrir l'écart entre eux, plus leur
  // largeur. D'où une échelle calculée sur l'entraxe et non sur un seul sourcil.
  const width = Math.abs(boxes.right.x - boxes.left.x) + (boxes.left.width + boxes.right.width) / 2;
  return {
    x: Math.round(centerX * 1000) / 10,
    y: Math.round(centerY * 1000) / 10,
    scale: Math.min(200, Math.max(10, Math.round(width * coverage * 1000) / 10)),
  };
}
