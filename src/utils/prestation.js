import { MODULE_IDS, normalizeModules } from './modules';

/** La prestation du jour : cils, sourcils, ou les deux.
 *
 *  À NE PAS CONFONDRE AVEC LES MODULES DES RÉGLAGES, même si les deux parlent de cils et de
 *  sourcils. Le réglage salon dit ce que l'institut PRATIQUE — un salon qui ne fait que le
 *  cil n'a que faire d'un onglet sourcils, et ce choix-là vaut pour toutes ses clientes.
 *  La prestation, elle, dit ce qu'on fait AUJOURD'HUI, chez CETTE cliente : un salon qui
 *  fait les deux reçoit tout de même des séances qui n'en font qu'une.
 *
 *  D'où la règle qui structure ce fichier : **le réglage salon est le plafond**. La
 *  prestation choisit dans ce que les Réglages autorisent, jamais au-delà. Sans cette
 *  règle, désactiver un module dans les Réglages ne garantirait plus rien, puisque
 *  n'importe quelle séance pourrait le rallumer.
 */

/** Les studios de travail, hors simulation — celle-ci n'est pas une prestation mais le
 *  résultat qu'on montre à la cliente, quelle que soit la prestation. */
const WORK_STUDIOS = ['lash', 'brow'];

export const PRESTATIONS = [
  { id: 'lash', label: 'Cils', hint: 'Pose ou dépose de cils seule.', studios: ['lash'] },
  { id: 'brow', label: 'Sourcils', hint: 'Brow lift, teinture ou restructuration seule.', studios: ['brow'] },
  { id: 'both', label: 'Les deux', hint: 'Cils et sourcils dans la même séance.', studios: ['lash', 'brow'] },
];

export const PRESTATION_IDS = PRESTATIONS.map((p) => p.id);

export function prestationById(id) {
  return PRESTATIONS.find((p) => p.id === id) ?? PRESTATIONS[0];
}

/**
 * Prestations réellement proposables, compte tenu des modules actifs du salon.
 *
 * Une prestation n'est proposée que si TOUS ses studios sont actifs : « les deux » n'a
 * aucun sens dans un salon qui a éteint le sourcil, et le proposer serait promettre un
 * onglet qui n'apparaîtrait pas.
 *
 * @param {object} modules réglage salon (Paramètres → Modules)
 * @returns {object[]} sous-ensemble de PRESTATIONS, dans l'ordre d'affichage
 */
export function availablePrestations(modules) {
  const clean = normalizeModules(modules);
  return PRESTATIONS.filter((p) => p.studios.every((s) => clean[s]));
}

/**
 * Faut-il montrer le sélecteur ?
 *
 * Non quand il ne reste qu'une possibilité : un choix qui n'en est pas un n'est pas un
 * réglage, c'est de l'encombrement. Le cas est courant — un salon qui ne fait que le cil
 * n'a jamais à choisir.
 */
export function shouldOfferChoice(modules) {
  return availablePrestations(modules).length > 1;
}

/**
 * Met une prestation — absente, inconnue, ou devenue impossible depuis que les Réglages ont
 * changé — dans une forme utilisable.
 *
 * Le repli suit l'ordre de `PRESTATIONS`, donc « les deux » en dernier : mieux vaut ouvrir
 * sur un seul studio que sur deux dont l'un serait vide. Et si les Réglages n'autorisaient
 * plus rien du tout — fiche corrompue —, `normalizeModules` a déjà tout rallumé en amont,
 * donc la liste n'est jamais vide.
 */
export function normalizePrestation(value, modules) {
  const available = availablePrestations(modules);
  const found = available.find((p) => p.id === value);
  return (found ?? available[0] ?? PRESTATIONS[0]).id;
}

/**
 * Les studios à afficher pour cette prestation.
 *
 * La simulation s'ajoute toujours en dernier si le module est actif : elle n'appartient à
 * aucune prestation en particulier, c'est là qu'on montre le résultat de celle qu'on a
 * choisie.
 *
 * @returns {string[]} identifiants de studio, dans l'ordre des onglets
 */
export function studiosFor(value, modules) {
  const clean = normalizeModules(modules);
  const prestation = prestationById(normalizePrestation(value, modules));
  const studios = prestation.studios.filter((s) => clean[s]);
  return clean.simulation ? [...studios, 'simulation'] : studios;
}

/**
 * Ce que la simulation doit composer sur la photo, pour cette prestation.
 *
 * C'est l'usage qui justifie tout le reste : sans lui, la simulation calquerait la même
 * chose qu'on soit venu pour les cils ou pour les sourcils.
 *
 * @returns {{lash:boolean, brow:boolean}}
 */
export function simulationLayers(value, modules) {
  const studios = studiosFor(value, modules);
  return { lash: studios.includes('lash'), brow: studios.includes('brow') };
}

/**
 * Prestation à proposer pour une nouvelle séance, d'après ce qu'on a fait la dernière fois.
 *
 * Une cliente qui vient pour les deux depuis un an revient le plus souvent pour les deux :
 * repartir chaque fois du premier choix de la liste ferait recommencer le même geste à
 * chaque séance. Rien n'est deviné au-delà de ça — s'il n'y a pas d'historique, on retombe
 * sur le repli de `normalizePrestation`.
 *
 * @param {object[]} records séances passées, portant chacune éventuellement `prestation`
 * @param {object} modules réglage salon
 */
export function lastPrestation(records, modules) {
  const dated = (records ?? [])
    .filter((r) => PRESTATION_IDS.includes(r?.prestation))
    .sort((a, b) => String(b.date).localeCompare(String(a.date)));
  return normalizePrestation(dated[0]?.prestation, modules);
}

/** Garde-fou de relecture : les studios de travail connus d'ici doivent rester ceux des
 *  modules. Si un module de travail était ajouté sans passer par ce fichier, la simulation
 *  ne saurait pas quoi en composer. */
export const KNOWN_WORK_STUDIOS = WORK_STUDIOS.filter((s) => MODULE_IDS.includes(s));
