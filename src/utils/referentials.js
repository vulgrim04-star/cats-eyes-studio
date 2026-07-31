/** Les listes de valeurs que la praticienne peut adapter à son vocabulaire.
 *
 *  Jusqu'ici « Type de cils » était figé dans le code (Fin / Normal / Épais) : impossible
 *  d'y ajouter une nuance sans toucher au programme. Ces listes deviennent des données.
 */

export const DEFAULT_REFERENTIALS = {
  lashTypes: ['Fin', 'Normal', 'Épais'],
  lashConditions: ['Bon', 'Normal', 'Fragilisé', 'Abîmé'],
  naturalLengths: ['Courts', 'Moyens', 'Longs'],
};

/** Libellés des listes, pour l'écran de réglages. */
export const REFERENTIAL_LABELS = {
  lashTypes: 'Type de cils',
  lashConditions: 'État des cils',
  naturalLengths: 'Longueur naturelle',
};

export const REFERENTIAL_HINTS = {
  lashTypes: "Sert aussi à l'alerte du Lash Map sur les longueurs trop lourdes pour le cil naturel.",
  lashConditions: 'Comment se portent les cils naturels de la cliente.',
  naturalLengths: 'La longueur des cils naturels, avant pose.',
};

export const REFERENTIAL_KEYS = Object.keys(DEFAULT_REFERENTIALS);

/** Nettoie une liste saisie à la main.
 *
 *  Une liste vidée par mégarde retombe sur les valeurs par défaut : un menu déroulant sans
 *  la moindre option ne rendrait pas le champ « libre », il le rendrait inutilisable. */
export function normalizeList(values, key) {
  const fallback = DEFAULT_REFERENTIALS[key] ?? [];
  if (!Array.isArray(values)) return [...fallback];

  const seen = new Set();
  const clean = [];
  for (const value of values) {
    const label = String(value ?? '').trim();
    if (!label) continue;
    // Comparaison insensible à la casse : « Abîmé » et « abîmé » sont la même chose pour
    // une praticienne, et deux entrées quasi identiques dans un menu ne font que semer le doute.
    const fingerprint = label.toLocaleLowerCase('fr');
    if (seen.has(fingerprint)) continue;
    seen.add(fingerprint);
    clean.push(label);
  }
  return clean.length > 0 ? clean : [...fallback];
}

/** Normalise l'ensemble des listes, en complétant celles qui manquent. */
export function normalizeReferentials(referentials) {
  const out = {};
  for (const key of REFERENTIAL_KEYS) {
    out[key] = normalizeList(referentials?.[key], key);
  }
  return out;
}

/** Options d'un menu, en y réintégrant la valeur déjà enregistrée sur la fiche.
 *
 *  C'est la garantie qui compte : si « Fragilisé » est retiré des réglages, les fiches qui
 *  le portaient doivent continuer de l'afficher. Sans cela, un changement de réglage
 *  effacerait à l'écran une information saisie sur une cliente — sans rien demander, et
 *  sans que personne s'en aperçoive avant de rouvrir la fiche. */
export function withCurrentValue(list, value) {
  const options = Array.isArray(list) ? [...list] : [];
  const current = String(value ?? '').trim();
  if (!current) return options;
  const known = options.some((option) => option.toLocaleLowerCase('fr') === current.toLocaleLowerCase('fr'));
  return known ? options : [...options, current];
}

/** Déplace une entrée d'un cran. Renvoie la liste inchangée si le mouvement sort des bornes,
 *  pour que l'appelant n'ait pas à tester lui-même les extrémités. */
export function moveValue(list, index, direction) {
  const values = Array.isArray(list) ? [...list] : [];
  const target = index + direction;
  if (index < 0 || index >= values.length || target < 0 || target >= values.length) return values;
  [values[index], values[target]] = [values[target], values[index]];
  return values;
}
