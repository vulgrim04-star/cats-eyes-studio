/** Modèle du Brow Lift : formes, zones, réglages, effets et nuancier.
 *
 *  SEUL module qui connaît la forme stockée d'une séance sourcils. Comme `lashModel` pour
 *  les cils, il est PUR — aucune dépendance à React ni au DOM — donc testable en
 *  environnement node, et c'est lui qu'on corrige quand une règle métier change.
 *
 *  Un sourcil est décrit par QUATRE ZONES, dans le vocabulaire du métier et dans l'ordre
 *  où on les travaille : tête (près du nez), milieu, arche (le point haut), queue (vers la
 *  tempe). Chaque zone porte une hauteur et une épaisseur relatives, ce qui permet de la
 *  retoucher seule sans défaire le reste de la forme.
 */

// --- Zones ------------------------------------------------------------------------

export const BROW_ZONES = [
  { id: 'head', label: 'Tête', hint: 'Départ, près du nez' },
  { id: 'body', label: 'Milieu', hint: 'Corps du sourcil' },
  { id: 'arch', label: 'Arche', hint: 'Le point le plus haut' },
  { id: 'tail', label: 'Queue', hint: 'Pointe, vers la tempe' },
];

export const ZONE_IDS = BROW_ZONES.map((z) => z.id);

// --- Formes -----------------------------------------------------------------------

/** Les dix formes du métier.
 *
 *  `zones` donne, par zone, la hauteur (`lift`, 0–100) et l'épaisseur (`weight`, 0–100).
 *  C'est ce couple qui fait la silhouette : une arche haute et une queue fine donnent un
 *  Fox Brow, une arche basse et un corps épais un Straight Brow.
 */
export const BROW_SHAPES = [
  {
    id: 'natural',
    label: 'Natural Brow',
    hint: 'Suit la ligne naturelle, sans dessin marqué',
    zones: { head: { lift: 48, weight: 62 }, body: { lift: 52, weight: 60 }, arch: { lift: 62, weight: 52 }, tail: { lift: 42, weight: 36 } },
  },
  {
    id: 'soft-arch',
    label: 'Soft Arch',
    hint: 'Arche douce, le plus polyvalent',
    zones: { head: { lift: 52, weight: 60 }, body: { lift: 55, weight: 58 }, arch: { lift: 72, weight: 50 }, tail: { lift: 40, weight: 32 } },
  },
  {
    id: 'high-arch',
    label: 'High Arch',
    hint: 'Arche marquée, regard ouvert',
    zones: { head: { lift: 44, weight: 56 }, body: { lift: 58, weight: 54 }, arch: { lift: 90, weight: 44 }, tail: { lift: 38, weight: 28 } },
  },
  {
    id: 'straight',
    label: 'Straight Brow',
    hint: 'Ligne droite, effet jeune et coréen',
    zones: { head: { lift: 48, weight: 64 }, body: { lift: 50, weight: 64 }, arch: { lift: 52, weight: 60 }, tail: { lift: 46, weight: 44 } },
  },
  {
    id: 'fox',
    label: 'Fox Brow',
    hint: 'Queue relevée, regard étiré',
    zones: { head: { lift: 44, weight: 58 }, body: { lift: 48, weight: 54 }, arch: { lift: 68, weight: 46 }, tail: { lift: 66, weight: 30 } },
  },
  {
    id: 'lifted',
    label: 'Lifted Brow',
    hint: 'Ensemble remonté, effet lifting',
    zones: { head: { lift: 46, weight: 60 }, body: { lift: 64, weight: 58 }, arch: { lift: 82, weight: 50 }, tail: { lift: 58, weight: 34 } },
  },
  {
    id: 'feathered',
    label: 'Feathered Brow',
    hint: 'Poils peignés vers le haut, effet plume',
    zones: { head: { lift: 50, weight: 52 }, body: { lift: 56, weight: 50 }, arch: { lift: 70, weight: 44 }, tail: { lift: 44, weight: 30 } },
  },
  {
    id: 'fluffy',
    label: 'Fluffy Brow',
    hint: 'Volumineux et aéré',
    zones: { head: { lift: 48, weight: 76 }, body: { lift: 56, weight: 74 }, arch: { lift: 70, weight: 64 }, tail: { lift: 44, weight: 44 } },
  },
  {
    id: 'rounded',
    label: 'Rounded Brow',
    hint: 'Courbe régulière, adoucit les traits',
    zones: { head: { lift: 50, weight: 60 }, body: { lift: 60, weight: 60 }, arch: { lift: 66, weight: 56 }, tail: { lift: 48, weight: 40 } },
  },
  {
    id: 's-brow',
    label: 'S Brow',
    hint: 'Double courbe, très graphique',
    zones: { head: { lift: 54, weight: 58 }, body: { lift: 44, weight: 56 }, arch: { lift: 78, weight: 48 }, tail: { lift: 52, weight: 30 } },
  },
];

export const SHAPE_IDS = BROW_SHAPES.map((s) => s.id);

export function shapeById(id) {
  return BROW_SHAPES.find((s) => s.id === id) ?? BROW_SHAPES[0];
}

// --- Effets -----------------------------------------------------------------------

/** Rendu de la prestation. `fan` écarte les poils, `gloss` ajoute la brillance du laminé,
 *  `density` multiplie le nombre de poils dessinés. */
export const BROW_EFFECTS = [
  { id: 'natural', label: 'Naturel', hint: 'Aucun traitement', fan: 0.35, gloss: 0, density: 1 },
  { id: 'fluffy', label: 'Fluffy', hint: 'Poils écartés, volume aéré', fan: 0.75, gloss: 0.1, density: 1.15 },
  { id: 'lam-light', label: 'Laminé léger', hint: 'Poils redressés, tenue souple', fan: 0.5, gloss: 0.28, density: 1.05 },
  { id: 'lam-strong', label: 'Laminé intense', hint: 'Poils très redressés et alignés', fan: 0.2, gloss: 0.45, density: 1.2 },
  { id: 'wet', label: 'Effet wet', hint: 'Aspect mouillé, poils groupés', fan: 0.15, gloss: 0.7, density: 1.1 },
];

export const EFFECT_IDS = BROW_EFFECTS.map((e) => e.id);

export function effectById(id) {
  return BROW_EFFECTS.find((e) => e.id === id) ?? BROW_EFFECTS[0];
}

// --- Nuancier ---------------------------------------------------------------------

/** Douze teintes professionnelles, du plus foncé au plus clair au sein de chaque famille.
 *  `hex` porte la couleur réelle : une pastille qui ne la montrerait pas ne servirait à
 *  rien, on choisit une teinture à l'œil. `warmth` dit si la teinte tire vers le chaud
 *  (positif) ou le froid (négatif) — c'est ce que corrige le réglage de chaleur. */
export const BROW_TONES = [
  { id: 't1', number: 1, label: 'Noir', hex: '#1C1917', warmth: 0 },
  { id: 't2', number: 2, label: 'Graphite', hex: '#3E3B38', warmth: -1 },
  { id: 't3', number: 3, label: 'Brun froid', hex: '#4E3F35', warmth: -1 },
  { id: 't4', number: 4, label: 'Brun naturel', hex: '#5C4433', warmth: 0 },
  { id: 't5', number: 5, label: 'Brun chaud', hex: '#6B4526', warmth: 1 },
  { id: 't6', number: 6, label: 'Chocolat', hex: '#4A3122', warmth: 1 },
  { id: 't7', number: 7, label: 'Châtain clair', hex: '#8A6647', warmth: 0 },
  { id: 't8', number: 8, label: 'Caramel', hex: '#A87445', warmth: 1 },
  { id: 't9', number: 9, label: 'Cuivré', hex: '#A85B32', warmth: 1 },
  { id: 't10', number: 10, label: 'Acajou', hex: '#6E3227', warmth: 1 },
  { id: 't11', number: 11, label: 'Taupe', hex: '#7A6A5C', warmth: -1 },
  { id: 't12', number: 12, label: 'Blond', hex: '#C4A176', warmth: 0 },
];

export const TONE_IDS = BROW_TONES.map((t) => t.id);

export function toneById(id) {
  return BROW_TONES.find((t) => t.id === id) ?? BROW_TONES[3];
}

// --- Séance -----------------------------------------------------------------------

export const EMPTY_BROW_LOOK = {
  shapeId: 'soft-arch',
  effectId: 'natural',
  toneId: 't4',
  /** Réglages de forme, en pourcentages. 50 = valeur du modèle, sans correction. */
  archHeight: 50,
  length: 50,
  thickness: 50,
  angle: 50,
  /** Symétrie : 50 = les deux sourcils identiques. En dessous, le gauche est plus bas ;
   *  au-dessus, le droit. Aucun visage n'est symétrique, et c'est ce réglage qui permet de
   *  compenser plutôt que de dessiner deux sourcils faux à l'identique. */
  symmetry: 50,
  density: 60,
  /** Réglages de coloration. */
  intensity: 70,
  transparency: 20,
  warmth: 50,
  saturation: 60,
  /** Retouches par zone, en écart au modèle (−50 à +50). */
  zones: { head: { lift: 0, weight: 0 }, body: { lift: 0, weight: 0 }, arch: { lift: 0, weight: 0 }, tail: { lift: 0, weight: 0 } },
};

const PERCENT_FIELDS = ['archHeight', 'length', 'thickness', 'angle', 'symmetry', 'density', 'intensity', 'transparency', 'warmth', 'saturation'];

export function clampPercent(value, fallback = 50) {
  const n = typeof value === 'number' ? value : Number.parseFloat(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(100, Math.max(0, Math.round(n)));
}

/** Écart de zone, borné à ±50. Au-delà, la zone quitte le sourcil au lieu de l'ajuster. */
export function clampOffset(value) {
  const n = typeof value === 'number' ? value : Number.parseFloat(value);
  if (!Number.isFinite(n)) return 0;
  return Math.min(50, Math.max(-50, Math.round(n)));
}

/** Met un look — absent, partiel ou venu d'une version antérieure — dans sa forme
 *  canonique. Tout le reste du module suppose cette forme. */
export function normalizeLook(look) {
  const source = look ?? {};
  const clean = { ...EMPTY_BROW_LOOK, ...source };
  PERCENT_FIELDS.forEach((field) => {
    clean[field] = clampPercent(source[field], EMPTY_BROW_LOOK[field]);
  });
  // Lus sur `clean` et non sur `source` : un champ absent doit retomber sur le DÉFAUT du
  // look, pas sur le premier élément de la liste. Sans quoi une séance neuve démarrerait
  // en « Natural Brow » alors que le défaut annoncé est « Soft Arch ».
  clean.shapeId = shapeById(clean.shapeId).id;
  clean.effectId = effectById(clean.effectId).id;
  clean.toneId = toneById(clean.toneId).id;
  clean.zones = Object.fromEntries(
    ZONE_IDS.map((id) => [
      id,
      {
        lift: clampOffset(source.zones?.[id]?.lift),
        weight: clampOffset(source.zones?.[id]?.weight),
      },
    ])
  );
  return clean;
}

/**
 * Valeurs EFFECTIVES d'une zone : le modèle, corrigé par les réglages globaux puis par la
 * retouche propre à la zone.
 *
 * C'est cette fonction que l'interface doit lire — jamais `shape.zones[id]` directement,
 * qui ignorerait les réglages. Même principe que `effectiveZone` du Lash Studio.
 *
 * @param {object} look séance normalisée
 * @param {string} zoneId
 * @param {'left'|'right'} [side] pour appliquer la symétrie
 * @returns {{lift:number, weight:number}} deux pourcentages bornés à 0–100
 */
export function effectiveZone(look, zoneId, side = 'right') {
  const clean = normalizeLook(look);
  const base = shapeById(clean.shapeId).zones[zoneId] ?? { lift: 50, weight: 50 };
  const offset = clean.zones[zoneId] ?? { lift: 0, weight: 0 };

  // La hauteur d'arche ne pèse que sur l'arche et, à moitié, sur le corps qui y mène :
  // relever l'arche en soulevant aussi la tête ne relèverait rien du tout.
  const archPull = zoneId === 'arch' ? 1 : zoneId === 'body' ? 0.5 : 0;
  const lift = base.lift + (clean.archHeight - 50) * 0.8 * archPull + offset.lift;

  // L'angle bascule le sourcil autour de son milieu : il abaisse la tête et relève la
  // queue, ou l'inverse. C'est le geste qui « ouvre » ou « ferme » un regard.
  const anglePull = zoneId === 'tail' ? 1 : zoneId === 'head' ? -1 : 0;
  const angled = lift + (clean.angle - 50) * 0.6 * anglePull;

  // La symétrie décale un côté par rapport à l'autre, jamais les deux ensemble.
  const asym = (clean.symmetry - 50) * 0.3 * (side === 'left' ? -1 : 1);

  const weight = base.weight + (clean.thickness - 50) * 0.7 + offset.weight;

  return {
    lift: Math.min(100, Math.max(0, Math.round(angled + asym))),
    weight: Math.min(100, Math.max(0, Math.round(weight))),
  };
}

/** Toutes les zones d'un côté, dans l'ordre tête → queue. */
export function effectiveZones(look, side = 'right') {
  return ZONE_IDS.map((id) => ({ id, ...effectiveZone(look, id, side) }));
}

/** Le look s'écarte-t-il du modèle choisi ? Sert à proposer « Réinitialiser la forme ». */
export function isCustomized(look) {
  const clean = normalizeLook(look);
  const touchedZone = ZONE_IDS.some((id) => clean.zones[id].lift !== 0 || clean.zones[id].weight !== 0);
  const touchedGlobal = ['archHeight', 'length', 'thickness', 'angle', 'symmetry'].some(
    (field) => clean[field] !== EMPTY_BROW_LOOK[field]
  );
  return touchedZone || touchedGlobal;
}

/** Remet la forme à celle du modèle, en gardant coloration et effet — on change souvent
 *  d'avis sur le dessin sans remettre en cause la teinte. */
export function resetShape(look) {
  const clean = normalizeLook(look);
  return normalizeLook({
    ...clean,
    archHeight: 50,
    length: 50,
    thickness: 50,
    angle: 50,
    symmetry: 50,
    zones: EMPTY_BROW_LOOK.zones,
  });
}

// --- Couleur rendue ---------------------------------------------------------------

function hexToRgb(hex) {
  const clean = String(hex ?? '').replace('#', '');
  const full = clean.length === 3 ? clean.split('').map((c) => c + c).join('') : clean;
  const num = Number.parseInt(full, 16);
  if (!Number.isFinite(num) || full.length !== 6) return { r: 92, g: 68, b: 51 };
  return { r: (num >> 16) & 255, g: (num >> 8) & 255, b: num & 255 };
}

function rgbToHex({ r, g, b }) {
  const part = (n) => Math.min(255, Math.max(0, Math.round(n))).toString(16).padStart(2, '0');
  return `#${part(r)}${part(g)}${part(b)}`.toUpperCase();
}

/**
 * Couleur RÉELLEMENT rendue, une fois les quatre réglages appliqués à la teinte choisie.
 *
 * Chacun doit se voir sur le dessin — des curseurs qui ne changeraient rien seraient du
 * décor :
 *   • saturation : ramène la teinte vers son gris de même clarté ;
 *   • chaleur    : déplace le rouge et le bleu en sens inverse, comme une balance des blancs ;
 *   • intensité  : assombrit, comme une pose plus longue ;
 *   • transparence : laisse voir la peau au travers.
 *
 * @returns {{hex:string, opacity:number}}
 */
export function renderedTone(look) {
  const clean = normalizeLook(look);
  const rgb = hexToRgb(toneById(clean.toneId).hex);

  const grey = 0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b;
  const s = clean.saturation / 100;
  let { r, g, b } = {
    r: grey + (rgb.r - grey) * s,
    g: grey + (rgb.g - grey) * s,
    b: grey + (rgb.b - grey) * s,
  };

  const warm = (clean.warmth - 50) / 50;
  r += warm * 26;
  b -= warm * 26;

  // L'intensité assombrit sans jamais noircir complètement : à 100 % on garde 55 % de la
  // clarté, sinon toutes les teintes se rejoindraient en un même noir.
  const darken = 1 - (clean.intensity / 100) * 0.45;
  r *= darken;
  g *= darken;
  b *= darken;

  return {
    hex: rgbToHex({ r, g, b }),
    // Plancher à 0,15 : un sourcil totalement transparent se lit comme une panne, pas
    // comme une teinture légère.
    opacity: Math.round((0.15 + (1 - clean.transparency / 100) * 0.85) * 100) / 100,
  };
}

/** Résumé d'un look, pour l'historique et les listes. */
export function lookSummary(look) {
  const clean = normalizeLook(look);
  const tone = toneById(clean.toneId);
  return [
    shapeById(clean.shapeId).label,
    effectById(clean.effectId).label,
    `n°${tone.number} ${tone.label}`,
    `${clean.intensity} %`,
  ].join(' · ');
}
