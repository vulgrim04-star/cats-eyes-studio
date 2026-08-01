/** Origine publique de l'application — celle qui sert les fonctions serveur et sous laquelle
 *  les clientes ouvrent les liens.
 *
 *  Sur le web, c'est l'adresse de la page : `window.location.origin` suffit et cette notion
 *  n'a jamais eu besoin d'exister. Dans une application empaquetée (Capacitor), non : les
 *  fichiers sont servis depuis le téléphone, `window.location.origin` vaut alors quelque
 *  chose comme `http://localhost`, et tout ce qui s'y raccroche casse en silence —
 *
 *    • les appels `/api/…` visent l'appareil, où aucun serveur ne tourne ;
 *    • le lien de réservation remis aux clientes devient `http://localhost/r/…`, une adresse
 *      morte pour tout le monde sauf le téléphone qui l'a produite ;
 *    • les redirections d'authentification (mot de passe oublié, confirmation de suppression)
 *      renvoient vers une page introuvable.
 *
 *  D'où cette origine unique, réglable à la construction par `VITE_PUBLIC_ORIGIN`. Sur le web
 *  la variable reste vide et le comportement est strictement inchangé ; pour l'application
 *  empaquetée elle porte l'adresse du déploiement Vercel.
 *
 *  Rappel : les variables `VITE_` sont figées au moment du build. Changer celle-ci impose de
 *  reconstruire, puis `npx cap sync`. */

/** Séparée de `appOrigin` pour rester testable hors navigateur : c'est la règle de choix,
 *  sans dépendance à `import.meta.env` ni à `window`. */
export function resolveOrigin(configured, fallback) {
  const chosen = typeof configured === 'string' && configured.trim() ? configured : fallback;
  if (typeof chosen !== 'string') return '';
  return chosen.trim().replace(/\/+$/, '');
}

export function appOrigin() {
  const fallback = typeof window !== 'undefined' && window.location ? window.location.origin : '';
  return resolveOrigin(import.meta.env.VITE_PUBLIC_ORIGIN, fallback);
}

/** Adresse d'une fonction serveur. Sur le web elle devient absolue mais de même origine, ce
 *  qui est équivalent à l'appel relatif d'avant — aucun changement de comportement. */
export function apiUrl(path) {
  return `${appOrigin()}${path}`;
}
