/** Ce qu'un rendez-vous rapporte, en trois notions qu'il ne faut jamais confondre.
 *
 *  Jusqu'ici tout reposait sur `price` : le chiffre d'affaires, la caisse, la TVA de la
 *  facture lisaient le même nombre. Dès qu'un pourboire entre en jeu, ce raccourci devient
 *  faux — un pourboire n'est pas une prestation vendue, il ne doit ni gonfler le chiffre
 *  d'affaires ni être taxé. Un supplément, lui, en est une : il compte des deux côtés.
 *
 *  `price` reste le TARIF PRÉVU et n'est jamais réécrit : c'est ce qui permet de retrouver
 *  l'écart entre ce qui était annoncé et ce qui a été encaissé.
 */

/** Montant exploitable, ou 0. Un champ laissé vide, un texte, un négatif saisi par erreur
 *  ne doivent jamais se propager dans une somme d'argent. */
function amountOf(value) {
  const n = typeof value === 'number' ? value : Number.parseFloat(value);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

/** Nettoie les suppléments saisis : on garde ceux qui portent un montant réel, et on leur
 *  donne un libellé de repli plutôt que de les afficher anonymes sur une facture. */
export function normalizeExtras(extras) {
  if (!Array.isArray(extras)) return [];
  return extras
    .map((extra) => ({ label: String(extra?.label ?? '').trim(), amount: amountOf(extra?.amount) }))
    .filter((extra) => extra.amount > 0)
    .map((extra) => ({ ...extra, label: extra.label || 'Supplément' }));
}

export function extrasOf(appointment) {
  return normalizeExtras(appointment?.extras);
}

export function extrasTotal(appointment) {
  return extrasOf(appointment).reduce((sum, extra) => sum + extra.amount, 0);
}

export function tipOf(appointment) {
  return amountOf(appointment?.tip);
}

/** Ce qui constitue le chiffre d'affaires : la prestation et ses suppléments.
 *  C'est aussi l'assiette de la TVA. Le pourboire en est exclu. */
export function serviceRevenue(appointment) {
  return amountOf(appointment?.price) + extrasTotal(appointment);
}

/** Ce qui entre réellement en caisse, pourboire compris. */
export function collectedTotal(appointment) {
  return serviceRevenue(appointment) + tipOf(appointment);
}

/** Le montant encaissé s'écarte-t-il du tarif prévu ? Sert à le signaler à l'écran au
 *  moment de valider, pour qu'un supplément saisi par erreur se voie avant d'être enregistré. */
export function hasExtras(appointment) {
  return extrasOf(appointment).length > 0;
}
