/* global __APP_VERSION__, __APP_BUILT_AT__ */

/** Version chargée par cette page, figée à la construction (voir `define` dans vite.config). */
export const APP_VERSION = typeof __APP_VERSION__ === 'string' ? __APP_VERSION__ : 'dev';
export const APP_BUILT_AT = typeof __APP_BUILT_AT__ === 'string' ? __APP_BUILT_AT__ : '';

/** Version de développement : le fichier n'est pas reconstruit à chaque enregistrement,
 *  proposer une « mise à jour » en local n'aurait aucun sens. */
const LOCAL = 'dev';

/** Faut-il proposer de recharger ?
 *
 *  Volontairement méfiant. Une réponse absente, vide ou illisible signifie « je ne sais
 *  pas », jamais « une mise à jour existe » : sur un réseau mobile, une requête qui échoue
 *  ne doit pas faire clignoter un bandeau invitant à recharger — ce serait la proposer
 *  précisément au moment où elle ne peut pas aboutir.
 */
export function shouldOfferUpdate(current, latest) {
  if (typeof current !== 'string' || typeof latest !== 'string') return false;
  const from = current.trim();
  const to = latest.trim();
  if (!from || !to) return false;
  if (from === LOCAL || to === LOCAL) return false;
  return from !== to;
}

/** Extrait la version d'une réponse `/version.json`, sans faire confiance à sa forme :
 *  avec la réécriture catch-all vers index.html, une erreur de configuration renverrait du
 *  HTML sur cette adresse. On veut alors « je ne sais pas », pas une fausse version. */
export function readVersionPayload(payload) {
  const version = payload?.version;
  return typeof version === 'string' && version.trim() ? version.trim() : null;
}

/** Libellé affiché dans les réglages : « 2ebae5a · 30 juil. 09:12 ». */
export function formatVersionLabel(version = APP_VERSION, builtAt = APP_BUILT_AT) {
  const date = new Date(builtAt);
  if (Number.isNaN(date.getTime())) return version;
  const stamp = date.toLocaleString('fr-FR', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
  return `${version} · ${stamp}`;
}
