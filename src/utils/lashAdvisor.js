import { MAP_TEMPLATES } from './lashPresets';

/** Le conseiller du Lash Studio : quelle pose va à quelle forme d'œil.
 *
 *  Les six formes d'œil étaient saisissables depuis le début et ne pilotaient rien — un
 *  champ qu'on remplit sans que rien n'en découle finit par ne plus être rempli. Ce module
 *  leur donne un effet : il propose un modèle EXISTANT (aucun profil n'est inventé ici),
 *  dit pourquoi, et dit surtout ce qu'il vaut mieux éviter.
 *
 *  Le « pourquoi » compte autant que la recommandation : c'est ce qui permet de l'expliquer
 *  à la cliente, et de désobéir en connaissance de cause. Rien n'est jamais appliqué
 *  d'office.
 */

/** Règles par forme d'œil. `avoid` nomme le piège classique de la forme — c'est souvent
 *  l'information la plus utile, celle qu'on n'a pas apprise en formation. */
const RULES = {
  amande: {
    label: 'Amande',
    recommend: 'classic-cat-eye',
    alternatives: ['open-eye', 'wispy'],
    why: "La forme la plus polyvalente : elle supporte à peu près tout. Le cat eye souligne l'étirement naturel du regard sans le déformer.",
    avoid: null,
  },
  rond: {
    label: 'Rond',
    recommend: 'classic-cat-eye',
    alternatives: ['fox-eyes', 'squirrel'],
    why: "Allonger vers le coin externe étire un œil rond et casse son aspect trop ouvert.",
    avoidId: 'doll-eye',
    avoid: "le doll eye, qui pose le maximum de longueur au centre et arrondit encore le regard.",
  },
  monolid: {
    label: 'Monolid',
    recommend: 'doll-eye',
    alternatives: ['open-eye', 'mega-volume'],
    why: "Sans pli visible, la longueur doit se voir de face : on la concentre au centre, avec une courbure marquée qui décolle la frange de la paupière.",
    avoidId: 'natural',
    avoid: "les courbures douces (J, B) et les poses discrètes, qui disparaissent entièrement derrière la paupière.",
  },
  tombant: {
    label: 'Tombant',
    recommend: 'open-eye',
    alternatives: ['squirrel', 'doll-eye'],
    why: "Le sommet est avancé aux deux tiers, avant la retombée de la paupière : il relève le regard au lieu d'en suivre la chute.",
    avoidId: 'classic-cat-eye',
    avoid: "le cat eye, dont la longueur maximale au coin externe accentue la chute au lieu de la corriger.",
  },
  rapproche: {
    label: 'Rapproché',
    recommend: 'fox-eyes',
    alternatives: ['classic-cat-eye', 'squirrel'],
    why: "Court à l'intérieur, long à l'extérieur : le regard s'écarte et les deux yeux paraissent plus espacés.",
    avoidId: 'doll-eye',
    avoid: "toute longueur marquée au coin interne, qui rapproche encore les deux yeux.",
  },
  ecarte: {
    label: 'Écarté',
    recommend: 'doll-eye',
    alternatives: ['natural', 'wet-look'],
    why: "De la longueur dès le coin interne : elle comble l'espace et ramène visuellement les deux yeux l'un vers l'autre.",
    avoidId: 'fox-eyes',
    avoid: "le fox eye, qui tire vers l'extérieur et écarte davantage.",
  },
};

/** Clé de règle à partir du libellé saisi : insensible aux accents et à la casse, car la
 *  liste des formes est un référentiel que le salon peut faire évoluer. */
function keyOf(eyeShape) {
  return String(eyeShape ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();
}

function templateById(id) {
  return MAP_TEMPLATES.find((t) => t.id === id) ?? null;
}

/**
 * Conseil pour une forme d'œil.
 *
 * @param {string} eyeShape libellé de la forme, tel qu'il est enregistré sur la fiche
 * @returns {{label:string, template:object, alternatives:object[], why:string,
 *   avoid:string|null, avoidTemplate:object|null}|null} `null` si la forme est absente ou
 *   inconnue — on ne conseille pas au hasard.
 */
export function adviseForEyeShape(eyeShape) {
  const rule = RULES[keyOf(eyeShape)];
  if (!rule) return null;
  const template = templateById(rule.recommend);
  if (!template) return null;
  return {
    label: rule.label,
    template,
    alternatives: rule.alternatives.map(templateById).filter(Boolean),
    why: rule.why,
    avoid: rule.avoid,
    avoidTemplate: rule.avoidId ? templateById(rule.avoidId) : null,
  };
}

/**
 * Le modèle actuellement posé est-il celui qu'il vaudrait mieux éviter sur cette forme ?
 * Sert à ne montrer la mise en garde QUE lorsqu'elle est d'actualité — un avertissement
 * permanent devient un décor.
 */
export function isRiskyChoice(eyeShape, templateId) {
  const rule = RULES[keyOf(eyeShape)];
  return Boolean(rule?.avoidId && templateId && rule.avoidId === templateId);
}

/** Formes reconnues par le conseiller, pour l'écran de réglages et les tests. */
export const ADVISED_SHAPES = Object.values(RULES).map((r) => r.label);
