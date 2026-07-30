/** Moyens de paiement.
 *
 *  Sortis de `PaymentModal.jsx` : ils sont lus par la caisse, la page Finances et la
 *  facture PDF, et un fichier de composant qui exporte aussi des constantes casse le
 *  rafraîchissement à chaud (c'est ce que signalait oxlint sur ce fichier).
 */

/** Ce qui est proposé à la saisie aujourd'hui. */
export const PAYMENT_METHODS = [
  { id: 'cb', label: 'CB', icon: 'clipboard' },
  { id: 'especes', label: 'Espèces', icon: 'euro' },
  { id: 'twint', label: 'Twint', icon: 'phone' },
];

/** Ce que l'application sait LIRE — plus large que ce qu'elle propose.
 *
 *  `virement` n'est plus offert à la saisie mais reste ici : les encaissements déjà
 *  enregistrés sous ce mode afficheraient sinon leur code brut dans l'historique, la caisse
 *  et les exports. Retirer une option de saisie ne doit jamais rendre le passé illisible. */
export const PAYMENT_LABELS = {
  cb: 'CB',
  especes: 'Espèces',
  twint: 'Twint',
  virement: 'Virement',
};

/** Libellé long, pour la facture. */
export const PAYMENT_LABELS_LONG = {
  cb: 'Carte bancaire',
  especes: 'Espèces',
  twint: 'Twint',
  virement: 'Virement',
};

export function paymentLabel(id) {
  return PAYMENT_LABELS[id] ?? id ?? '';
}
