/** Modèle de données d'une séance sourcils (Brow Studio).
 *
 *  SEUL module qui connaît la forme stockée, comme `lashModel` pour les cils. Les
 *  composants ne lisent jamais un champ à la main : ils passent par les fonctions d'ici.
 *
 *  Forme :
 *    {
 *      date, service, shape,
 *      colorId, intensity, saturation, processingMinutes,
 *      products, notes
 *    }
 */

import { todayISO } from './date';

/** Nuancier professionnel, numéroté comme les cartes de teinture du métier.
 *
 *  `hex` porte la VRAIE couleur : une pastille qui ne montrerait pas la teinte ne servirait
 *  à rien, et une praticienne choisit d'abord à l'œil. Les numéros, eux, sont ce qu'on lit
 *  sur le tube — c'est par eux qu'on commande.
 *
 *  Ce nuancier est un point de départ, modifiable dans les Réglages : il dépend de la
 *  marque de teinture du salon, le figer serait une erreur.
 */
export const BROW_COLORS = [
  { id: 'c1', number: 1, label: 'Clair', hex: '#D9BC96' },
  { id: 'c2', number: 2, label: 'Naturel', hex: '#C39A69' },
  { id: 'c3', number: 3, label: 'Moyen', hex: '#9A6F4A' },
  { id: 'c4', number: 4, label: 'Foncé', hex: '#6E4A2F' },
  { id: 'c5', number: 5, label: 'Brun froid', hex: '#5C4436' },
  { id: 'c6', number: 6, label: 'Cendré', hex: '#6B6154' },
  { id: 'c7', number: 7, label: 'Graphite', hex: '#4A4642' },
  { id: 'c8', number: 8, label: 'Noir', hex: '#241F1C' },
  { id: 'c9', number: 9, label: 'Blond', hex: '#E0C79E' },
  { id: 'c10', number: 10, label: 'Cuivré', hex: '#A9633A' },
  { id: 'c11', number: 11, label: 'Châtain', hex: '#7C5A3E' },
  { id: 'c12', number: 12, label: 'Marron', hex: '#5A3B26' },
];

/** Prestations sourcils. `minutes` pré-remplit le temps de pose : c'est le réglage qu'on
 *  oublie le plus souvent, et celui qui décide du résultat. */
export const BROW_SERVICES = [
  { value: 'Teinture', minutes: 10 },
  { value: 'Brow Lift', minutes: 12 },
  { value: 'Brow Lift + teinture', minutes: 15 },
  { value: 'Restructuration', minutes: 0 },
  { value: 'Henné', minutes: 25 },
];

export const BROW_SHAPES = ['Naturelle', 'Arquée', 'Droite', 'Ascendante', 'Ronde', 'Relevée'];

export const INTENSITY_DEFAULT = 70;
export const SATURATION_DEFAULT = 60;

export const EMPTY_BROW_SESSION = {
  date: todayISO(),
  service: 'Teinture',
  shape: 'Naturelle',
  colorId: 'c2',
  intensity: INTENSITY_DEFAULT,
  saturation: SATURATION_DEFAULT,
  processingMinutes: 10,
  products: '',
  notes: '',
  /** Le look complet du Brow Lift, enregistré AVEC la séance : c'est ce qui permet de
   *  rouvrir une prestation d'il y a six mois et de la rejouer à l'identique. */
  look: null,
  summary: '',
  /** Prestation du jour — 'lash', 'brow' ou 'both'. Décidée par la page, pas ici : ce
   *  modèle ne connaît pas les modules actifs du salon et n'a donc pas de quoi la valider.
   *  Elle est déclarée pour que le champ existe et survive aux copies d'objet ; sa
   *  validation revient à `normalizePrestation` au moment de la relecture. */
  prestation: null,
  /** Chemins de stockage de la photo importée et du rendu composé montré à la cliente.
   *  Déclarés ici pour que `normalizeBrowSession` les conserve d'une copie à l'autre :
   *  sans ça, rouvrir puis réenregistrer une séance perdrait ses vignettes. */
  photoBeforePath: null,
  photoAfterPath: null,
};

/** Borne un pourcentage. Une valeur venue d'un curseur, d'une ancienne fiche ou d'une
 *  saisie au clavier ne doit jamais sortir de 0–100. */
export function clampPercent(value, fallback = 0) {
  const n = typeof value === 'number' ? value : Number.parseFloat(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(100, Math.max(0, Math.round(n)));
}

/** Teinte du nuancier, ou celle par défaut. Jamais `undefined` : l'appelant dessine avec. */
export function colorById(id, palette = BROW_COLORS) {
  const list = palette?.length ? palette : BROW_COLORS;
  return list.find((c) => c.id === id) ?? list[0];
}

/** Temps de pose conseillé pour une prestation (0 quand la notion ne s'applique pas). */
export function minutesForService(service) {
  return BROW_SERVICES.find((s) => s.value === service)?.minutes ?? 0;
}

/** Met une séance — ancienne ou neuve — dans sa forme canonique. */
export function normalizeBrowSession(session, palette = BROW_COLORS) {
  const base = { ...EMPTY_BROW_SESSION, ...(session ?? {}) };
  return {
    ...base,
    date: base.date || todayISO(),
    colorId: colorById(base.colorId, palette).id,
    intensity: clampPercent(base.intensity, INTENSITY_DEFAULT),
    saturation: clampPercent(base.saturation, SATURATION_DEFAULT),
    processingMinutes: Math.max(0, Math.round(Number(base.processingMinutes) || 0)),
    products: String(base.products ?? ''),
    notes: String(base.notes ?? ''),
    look: base.look ?? null,
    summary: String(base.summary ?? ''),
  };
}

/**
 * Couleur RÉELLEMENT rendue par le dessin, une fois l'intensité et la saturation
 * appliquées à la teinte choisie.
 *
 * L'intensité pilote l'opacité — une teinture posée moins longtemps couvre moins — et la
 * saturation ramène la teinte vers son gris de même clarté. Deux réglages qui, sur le
 * schéma, doivent SE VOIR : des curseurs qui ne changent rien à l'image ne servent à rien.
 *
 * @returns {{hex:string, opacity:number}}
 */
export function renderedColor(session, palette = BROW_COLORS) {
  const clean = normalizeBrowSession(session, palette);
  const { hex } = colorById(clean.colorId, palette);
  const rgb = hexToRgb(hex);
  const grey = Math.round(0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b);
  const k = clean.saturation / 100;
  const mix = (channel) => Math.round(grey + (channel - grey) * k);
  return {
    hex: rgbToHex({ r: mix(rgb.r), g: mix(rgb.g), b: mix(rgb.b) }),
    // Plancher à 0,2 : à intensité nulle le sourcil doit pâlir, jamais disparaître —
    // un schéma vide ne se lit pas comme « teinture légère », mais comme une panne.
    opacity: Math.round((0.2 + (clean.intensity / 100) * 0.8) * 100) / 100,
  };
}

function hexToRgb(hex) {
  const clean = String(hex ?? '').replace('#', '');
  const full = clean.length === 3 ? clean.split('').map((c) => c + c).join('') : clean;
  const num = Number.parseInt(full, 16);
  if (!Number.isFinite(num) || full.length !== 6) return { r: 90, g: 59, b: 38 };
  return { r: (num >> 16) & 255, g: (num >> 8) & 255, b: num & 255 };
}

function rgbToHex({ r, g, b }) {
  const part = (n) => Math.min(255, Math.max(0, n)).toString(16).padStart(2, '0');
  return `#${part(r)}${part(g)}${part(b)}`.toUpperCase();
}

/** Résumé d'une séance, pour l'historique et les listes. */
export function browSummary(session, palette = BROW_COLORS) {
  const clean = normalizeBrowSession(session, palette);
  const color = colorById(clean.colorId, palette);
  return [
    clean.service,
    `n°${color.number} ${color.label}`,
    `${clean.intensity} %`,
    clean.processingMinutes > 0 ? `${clean.processingMinutes} min` : '',
  ]
    .filter(Boolean)
    .join(' · ');
}
