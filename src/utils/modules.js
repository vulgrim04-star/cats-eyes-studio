/** Modules optionnels du studio.
 *
 *  Tous les salons ne font pas tout : certains ne posent que des cils, d'autres ne font que
 *  le sourcil. Afficher trois onglets à qui n'en utilise qu'un, c'est lui faire payer en
 *  encombrement une fonction dont il n'a que faire.
 *
 *  DEUX RÈGLES DE SÛRETÉ, qui expliquent le reste du fichier :
 *
 *  1. **Désactiver n'efface rien.** Un module masqué garde ses données ; les réafficher les
 *     retrouve intactes. C'est un réglage d'affichage, jamais une suppression.
 *  2. **On ne peut pas tout éteindre.** Une page sans le moindre onglet serait un cul-de-sac
 *     dont on ne saurait pas sortir : le dernier module actif ne se désactive pas.
 */

export const MODULES = [
  {
    id: 'lash',
    label: 'Lash Studio',
    hint: 'Schéma de pose des cils, longueurs par secteur, modèles et exports.',
    icon: 'eye',
  },
  {
    id: 'brow',
    label: 'Brow Lift',
    hint: 'Formes de sourcils, nuancier, effets et suivi des séances.',
    icon: 'sparkles',
  },
  {
    id: 'simulation',
    label: 'Simulation',
    hint: 'Aperçu avant / après sur la photo de la cliente.',
    icon: 'camera',
  },
];

export const MODULE_IDS = MODULES.map((m) => m.id);

/** Tous actifs à l'installation : on découvre ce qu'on peut faire, puis on retire. */
export const DEFAULT_MODULES = Object.fromEntries(MODULE_IDS.map((id) => [id, true]));

/**
 * Met un réglage — absent, partiel ou portant des clés d'une version antérieure — dans sa
 * forme canonique.
 *
 * Un module inconnu du réglage enregistré est considéré ACTIF : une mise à jour qui ajoute
 * un module ne doit pas le livrer invisible, sans quoi personne ne saurait qu'il existe.
 */
export function normalizeModules(value) {
  const source = value ?? {};
  const result = Object.fromEntries(MODULE_IDS.map((id) => [id, source[id] !== false]));
  // Garde-fou : si le réglage enregistré éteint tout — fiche corrompue, import maladroit —
  // on rallume plutôt que de laisser une page vide.
  return MODULE_IDS.some((id) => result[id]) ? result : { ...DEFAULT_MODULES };
}

/** Modules actifs, dans l'ordre d'affichage. */
export function enabledModules(value) {
  const clean = normalizeModules(value);
  return MODULES.filter((m) => clean[m.id]);
}

/** Peut-on désactiver ce module ? Non s'il est le dernier debout. */
export function canDisable(value, id) {
  const clean = normalizeModules(value);
  if (!clean[id]) return true;
  return MODULE_IDS.filter((other) => clean[other]).length > 1;
}

/** Bascule un module, en refusant d'éteindre le dernier. */
export function toggleModule(value, id) {
  const clean = normalizeModules(value);
  if (!MODULE_IDS.includes(id)) return clean;
  if (clean[id] && !canDisable(clean, id)) return clean;
  return { ...clean, [id]: !clean[id] };
}

/** Premier module actif : c'est l'onglet ouvert par défaut, et le repli quand celui qu'on
 *  regardait vient d'être désactivé. */
export function firstEnabled(value) {
  return enabledModules(value)[0]?.id ?? MODULE_IDS[0];
}
