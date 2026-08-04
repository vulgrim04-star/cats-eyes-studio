import { MM_MAX, parseMm } from './lashCalculations';

/** Le garde-fou du Lash Studio : une extension trop longue casse le cil qui la porte.
 *
 *  C'est la règle métier la plus importante du module, et la seule qu'un simple outil de
 *  dessin ne peut pas rendre : elle demande de connaître la cliente. Elle s'appuie donc
 *  sur les champs STRUCTURÉS de sa fiche — type de cils, état, longueur naturelle — et
 *  non sur du texte libre.
 *
 *  DEUX PRINCIPES, qui expliquent tout le reste du fichier :
 *
 *  1. **Permissif par défaut.** Ces listes sont modifiables dans les Réglages : un salon
 *     peut écrire « soyeux » ou « post-chimio ». Un mot inconnu ne doit JAMAIS déclencher
 *     d'alerte — une alerte qu'on ne comprend pas est une alerte qu'on apprend à ignorer,
 *     et le jour où elle compte vraiment, elle ne sera plus lue.
 *  2. **Jamais bloquant.** La praticienne décide ; l'outil informe. Le dépassement est
 *     enregistré, il n'est pas interdit.
 */

/** Plafonds en millimètres, du plus restrictif au plus permissif.
 *
 *  Les mots-clés sont cherchés dans les trois champs réunis, en minuscules et sans
 *  accents : « Fragilisé », « fragilise » et « FRAGILISÉ » doivent conduire à la même
 *  limite. Le plafond le PLUS BAS trouvé l'emporte — des cils à la fois fins et abîmés
 *  relèvent de la contrainte la plus stricte, pas de la moyenne des deux. */
const RULES = [
  {
    max: 9,
    keywords: ['abime', 'casse', 'chute', 'post-chimio', 'tres fragile'],
    reason: 'cils abîmés',
  },
  {
    max: 10,
    keywords: ['tres fin', 'fragilise', 'clairseme', 'fragile'],
    reason: 'cils fragilisés',
  },
  {
    max: 11,
    keywords: ['fin', 'court', 'sensible'],
    reason: 'cils fins',
  },
  {
    max: 15,
    keywords: ['normal', 'moyen', 'bon'],
    reason: 'cils en bon état',
  },
  {
    max: MM_MAX,
    keywords: ['epais', 'dense', 'resistant', 'fort', 'long'],
    reason: 'cils épais et résistants',
  },
];

/** Minuscules sans accents : la comparaison doit survivre à « Fragilisé » comme à
 *  « fragilise ». */
function fold(text) {
  return String(text ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();
}

/**
 * Longueur maximale conseillée pour cette cliente.
 *
 * @param {{lashType?:string, lashCondition?:string, naturalLength?:string}} [client]
 * @returns {{maxMm:number, reason:string|null}} `reason` vaut `null` quand aucun mot n'a
 *   été reconnu : il n'y a alors pas de limite à annoncer, seulement le plafond métier.
 */
export function safeLimitFor(client) {
  const haystack = fold([client?.lashType, client?.lashCondition, client?.naturalLength].filter(Boolean).join(' '));
  if (!haystack.trim()) return { maxMm: MM_MAX, reason: null };

  // « très fin » contient « fin » : on retient le plafond le plus bas parmi TOUTES les
  // règles qui s'appliquent, sans quoi l'ordre de lecture déciderait de la sécurité.
  const matched = RULES.filter((rule) => rule.keywords.some((word) => haystack.includes(word)));
  if (matched.length === 0) return { maxMm: MM_MAX, reason: null };
  const strictest = matched.reduce((best, rule) => (rule.max < best.max ? rule : best), matched[0]);
  return { maxMm: strictest.max, reason: strictest.reason };
}

/**
 * Un secteur dépasse-t-il la limite, et de combien ?
 * @returns {{over:boolean, mm:number, maxMm:number, excess:number, reason:string|null}}
 */
export function checkLength(mm, client) {
  const value = parseMm(mm);
  const { maxMm, reason } = safeLimitFor(client);
  return {
    over: value > maxMm,
    mm: value,
    maxMm,
    excess: Math.round((value - maxMm) * 10) / 10,
    reason: reason ?? null,
  };
}

/**
 * Secteurs d'un œil qui dépassent la limite.
 * @param {number[]} lengths longueurs en mm, du coin interne au coin externe
 * @returns {Array<{index:number, mm:number, maxMm:number, excess:number}>}
 */
export function unsafeSectors(lengths, client) {
  const { maxMm } = safeLimitFor(client);
  return (lengths ?? []).flatMap((mm, index) => {
    const value = parseMm(mm);
    if (value <= maxMm) return [];
    return [{ index, mm: value, maxMm, excess: Math.round((value - maxMm) * 10) / 10 }];
  });
}

/**
 * Phrase d'alerte, prête à afficher. `null` quand il n'y a rien à dire.
 *
 * Formulée comme un conseil et non comme un refus : elle nomme le risque, rappelle la
 * limite, et laisse la décision.
 */
export function safetyMessage(lengths, client) {
  const unsafe = unsafeSectors(lengths, client);
  if (unsafe.length === 0) return null;
  const { maxMm, reason } = safeLimitFor(client);
  const worst = unsafe.reduce((a, b) => (b.mm > a.mm ? b : a));
  const combien = unsafe.length === 1 ? 'Un secteur dépasse' : `${unsafe.length} secteurs dépassent`;
  const cause = reason ? ` sur ${reason}` : '';
  return `${combien} ${maxMm} mm${cause} — jusqu'à ${worst.mm} mm. Risque de casse du cil naturel.`;
}
