import { BROW_TONES, shapeById, toneById } from './browShapes';

/** L'assistant beauté du Brow Lift : quelle forme de sourcil pour quel visage.
 *
 *  UNE CHOSE À SAVOIR AVANT DE LIRE LE RESTE. Cet assistant ne devine rien. Il applique des
 *  règles de morphologie que toute brow artist connaît, et il DIT laquelle il applique.
 *  C'est la différence entre un outil qu'on peut contredire en connaissance de cause et un
 *  oracle qu'on suit ou qu'on ignore.
 *
 *  Rien n'est jamais appliqué d'office : la recommandation s'affiche, la praticienne
 *  décide. Elle voit le visage ; le programme ne voit que des nombres.
 */

/** Les six morphologies du métier. */
export const FACE_SHAPES = [
  { id: 'oval', label: 'Ovale' },
  { id: 'round', label: 'Rond' },
  { id: 'square', label: 'Carré' },
  { id: 'heart', label: 'Cœur' },
  { id: 'long', label: 'Allongé' },
  { id: 'diamond', label: 'Diamant' },
];

/** Règle par morphologie : la forme conseillée, celle à éviter, et le pourquoi.
 *
 *  Le « pourquoi » n'est pas décoratif — c'est ce qui permet de l'expliquer à la cliente,
 *  et ce qui rend la recommandation discutable plutôt qu'arbitraire. */
const RULES = {
  oval: {
    shapeId: 'soft-arch',
    alternatives: ['natural', 'feathered'],
    why: "Le visage ovale est équilibré par nature : une arche douce le souligne sans le corriger.",
    avoidId: null,
    avoid: null,
  },
  round: {
    shapeId: 'high-arch',
    alternatives: ['fox', 'lifted'],
    why: "Une arche haute et une queue nette étirent le visage en hauteur et cassent la rondeur.",
    avoidId: 'rounded',
    avoid: "les formes arrondies, qui répètent la courbe du visage et l'élargissent encore.",
  },
  square: {
    shapeId: 'rounded',
    alternatives: ['soft-arch', 'fluffy'],
    why: "Une courbe régulière adoucit une mâchoire marquée : le sourcil apporte la rondeur que le visage n'a pas.",
    avoidId: 'straight',
    avoid: "le sourcil droit, qui ajoute une ligne horizontale de plus à un visage déjà anguleux.",
  },
  heart: {
    shapeId: 'rounded',
    alternatives: ['natural', 'soft-arch'],
    why: "Un front large se rééquilibre avec un sourcil arrondi et pas trop long, qui n'accentue pas sa largeur.",
    avoidId: 'high-arch',
    avoid: "l'arche très haute, qui allonge le front au lieu de le contenir.",
  },
  long: {
    shapeId: 'straight',
    alternatives: ['fluffy', 'feathered'],
    why: "La ligne droite coupe la verticale et raccourcit visuellement un visage allongé.",
    avoidId: 'high-arch',
    avoid: "l'arche haute, qui tire le regard vers le haut et allonge davantage.",
  },
  diamond: {
    shapeId: 'rounded',
    alternatives: ['soft-arch', 'natural'],
    why: "Des pommettes saillantes s'adoucissent avec une courbe régulière plutôt qu'avec un angle.",
    avoidId: 'fox',
    avoid: "le fox brow, dont la queue relevée accentue la largeur des pommettes.",
  },
};

function keyOf(value) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();
}

const LABEL_TO_ID = Object.fromEntries(FACE_SHAPES.map((f) => [keyOf(f.label), f.id]));

/** Accepte l'identifiant comme le libellé, avec ou sans accents : la forme du visage peut
 *  venir d'un menu, d'une détection ou d'une fiche ancienne. */
export function faceShapeId(value) {
  const key = keyOf(value);
  if (RULES[key]) return key;
  return LABEL_TO_ID[key] ?? null;
}

/**
 * Teinte conseillée à partir de la couleur de cheveux.
 *
 * Règle du métier : le sourcil se pose un à deux tons SOUS les cheveux clairs et un à deux
 * tons AU-DESSUS des cheveux très foncés. Un sourcil assorti au cheveu exactement paraît
 * toujours postiche.
 *
 * @param {string} hairTone identifiant de teinte, ou libellé
 * @returns {{tone:object, why:string}|null}
 */
export function adviseTone(hairTone) {
  const key = keyOf(hairTone);
  const hair = BROW_TONES.find((t) => t.id === key || keyOf(t.label) === key);
  if (!hair) return null;
  const index = BROW_TONES.indexOf(hair);
  // Le nuancier va du plus foncé au plus clair : avancer d'un cran éclaircit.
  const veryDark = index <= 1;
  const target = veryDark ? index + 2 : Math.max(0, index - 1);
  return {
    tone: BROW_TONES[Math.min(BROW_TONES.length - 1, target)],
    why: veryDark
      ? "Sur des cheveux très foncés, on remonte d'un ou deux tons : un sourcil aussi noir que le cheveu durcit le regard."
      : "Un à deux tons sous la couleur des cheveux : assorti exactement, le sourcil paraît postiche.",
  };
}

/**
 * Écart de symétrie entre les deux sourcils, converti en réglage.
 *
 * @param {number} leftY hauteur du sourcil gauche (repère quelconque, unités cohérentes)
 * @param {number} rightY hauteur du sourcil droit
 * @param {number} span largeur de référence du visage, pour rendre l'écart relatif
 * @returns {{asymmetric:boolean, symmetry:number, note:string|null}}
 */
export function analyseSymmetry(leftY, rightY, span) {
  if (![leftY, rightY, span].every(Number.isFinite) || span <= 0) {
    return { asymmetric: false, symmetry: 50, note: null };
  }
  const ratio = (rightY - leftY) / span;
  // Sous 1,5 % de la largeur du visage, l'écart n'est pas visible à l'œil nu : le
  // signaler ferait douter d'une symétrie parfaitement acceptable.
  if (Math.abs(ratio) < 0.015) return { asymmetric: false, symmetry: 50, note: null };
  const symmetry = Math.min(100, Math.max(0, Math.round(50 + ratio * 260)));
  const higher = ratio > 0 ? 'gauche' : 'droit';
  return {
    asymmetric: true,
    symmetry,
    note: `Le sourcil ${higher} est naturellement plus haut. Le réglage de symétrie compense l'écart plutôt que de dessiner deux sourcils identiques sur un visage qui ne l'est pas.`,
  };
}

/**
 * Conseil complet pour une cliente.
 *
 * @param {{faceShape?:string, hairTone?:string, symmetry?:object}} input
 * @returns {{shape:object, alternatives:object[], why:string, avoid:string|null,
 *   avoidShape:object|null, tone:object|null, toneWhy:string|null, intensity:number,
 *   symmetry:number, symmetryNote:string|null, sentence:string}|null}
 */
export function adviseBrow({ faceShape, hairTone, symmetry } = {}) {
  const id = faceShapeId(faceShape);
  if (!id) return null;
  const rule = RULES[id];
  const shape = shapeById(rule.shapeId);
  const toneAdvice = adviseTone(hairTone);
  const sym = symmetry ?? { symmetry: 50, note: null };

  // Une teinte claire demande plus d'intensité pour se voir ; une teinte foncée moins,
  // sous peine de durcir le regard.
  const toneIndex = toneAdvice ? BROW_TONES.indexOf(toneAdvice.tone) : 5;
  const intensity = Math.min(90, Math.max(50, 52 + toneIndex * 3));

  const sentence = toneAdvice
    ? `Cette cliente conviendrait à un ${shape.label} avec une teinte ${toneAdvice.tone.label}, à ${intensity} % d'intensité.`
    : `Cette cliente conviendrait à un ${shape.label}, à ${intensity} % d'intensité.`;

  return {
    shape,
    alternatives: rule.alternatives.map(shapeById),
    why: rule.why,
    avoid: rule.avoid,
    avoidShape: rule.avoidId ? shapeById(rule.avoidId) : null,
    tone: toneAdvice?.tone ?? null,
    toneWhy: toneAdvice?.why ?? null,
    intensity,
    symmetry: sym.symmetry ?? 50,
    symmetryNote: sym.note ?? null,
    sentence,
  };
}

/** Réglages à appliquer si la praticienne accepte le conseil. Rien d'autre n'est touché :
 *  ni les effets, ni les retouches de zone qu'elle aurait déjà faites. */
export function adviceToLook(advice) {
  if (!advice) return {};
  const patch = { shapeId: advice.shape.id, intensity: advice.intensity, symmetry: advice.symmetry };
  if (advice.tone) patch.toneId = toneById(advice.tone.id).id;
  return patch;
}
