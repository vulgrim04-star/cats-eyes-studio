import { extrasTotal, serviceRevenue, tipOf, collectedTotal } from './billing';
import { paymentLabel } from './payments';
import { EXPENSE_CATEGORIES } from '../data/expenses';

/** Type de ligne, en clair dans le fichier : c'est la colonne sur laquelle on filtre. */
export const ROW_TYPES = { service: 'Prestation', expense: 'Charge', total: 'Total' };

/** Deux décimales, séparateur point. Le tableur doit recevoir un nombre, pas « 130 CHF » :
 *  la devise est déjà annoncée dans les en-têtes de colonnes. */
function amount(value) {
  return Number(value ?? 0).toFixed(2);
}

/** Une case vide plutôt qu'un zéro : sur une ligne de charge, « 0.00 » en face de
 *  « Pourboire » laisserait croire à un pourboire nul, alors que la notion n'existe pas. */
const NONE = '';

function categoryLabel(id) {
  return EXPENSE_CATEGORIES.find((c) => c.id === id)?.label ?? id ?? '';
}

export function exportHeader(symbol) {
  return [
    'Type',
    'Date',
    'Heure',
    'Libellé',
    'Cliente / Catégorie',
    `Tarif (${symbol})`,
    `Suppléments (${symbol})`,
    `Chiffre d'affaires (${symbol})`,
    `Pourboire (${symbol})`,
    `Montant (${symbol})`,
    'Paiement',
  ];
}

/** Totaux de la période. Le pourboire est compté à part et RESTE hors du résultat net :
 *  il transite par la caisse sans être du chiffre d'affaires — c'est la même règle que la
 *  carte « Charges & résultat net » de la page Finances. */
export function exportTotals(appointments, expenses) {
  const revenue = appointments.reduce((sum, a) => sum + serviceRevenue(a), 0);
  const tips = appointments.reduce((sum, a) => sum + tipOf(a), 0);
  const charges = expenses.reduce((sum, e) => sum + Number(e.amount ?? 0), 0);
  return { revenue, tips, charges, net: revenue - charges };
}

/**
 * Construit le tableau unique de l'export : prestations et charges dans les mêmes colonnes,
 * triées ensemble par date.
 *
 * Une seule colonne se somme, `Montant`, et elle est signée — l'encaissement réel pour une
 * prestation, le montant en négatif pour une charge. C'est ce qui rend le fichier
 * exploitable d'un seul tableau croisé, et toute la raison d'être du tableau unique.
 *
 * Fonction pure : elle reçoit des rendez-vous DÉJÀ enrichis (`enrich()` lit les magasins et
 * ne peut pas être appelée depuis un test en environnement node), et le symbole de devise
 * plutôt que d'aller le chercher dans les réglages.
 */
export function buildFinanceExport(appointments, expenses, symbol) {
  const serviceRows = appointments.map((apt) => ({
    sortKey: `${apt.date} ${apt.time ?? ''}`,
    cells: [
      ROW_TYPES.service,
      apt.date,
      apt.time ?? '',
      apt.service?.name ?? 'Prestation',
      // Nom recomposé ici plutôt qu'avec `fullName` : ce module-là importe les réglages,
      // donc le magasin, donc `localStorage` — ce qui rendrait ce fichier intestable en node.
      apt.client ? `${apt.client.firstName ?? ''} ${apt.client.lastName ?? ''}`.trim() : '',
      amount(apt.price),
      extrasTotal(apt) ? amount(extrasTotal(apt)) : NONE,
      amount(serviceRevenue(apt)),
      tipOf(apt) ? amount(tipOf(apt)) : NONE,
      amount(collectedTotal(apt)),
      paymentLabel(apt.paymentMethod),
    ],
  }));

  const expenseRows = expenses.map((exp) => ({
    // Sans heure, une charge se range avant les rendez-vous du même jour.
    sortKey: `${exp.date} `,
    cells: [
      ROW_TYPES.expense,
      exp.date,
      NONE,
      exp.label ?? '',
      categoryLabel(exp.category),
      NONE,
      NONE,
      NONE,
      NONE,
      amount(-Number(exp.amount ?? 0)),
      NONE,
    ],
  }));

  const rows = [...serviceRows, ...expenseRows]
    .sort((a, b) => (a.sortKey > b.sortKey ? 1 : a.sortKey < b.sortKey ? -1 : 0))
    .map((r) => r.cells);

  const { revenue, tips, charges, net } = exportTotals(appointments, expenses);
  const summary = (label, value) => [ROW_TYPES.total, NONE, NONE, label, NONE, NONE, NONE, NONE, NONE, amount(value), NONE];
  rows.push(
    summary("Chiffre d'affaires", revenue),
    summary('Pourboires', tips),
    summary('Charges', -charges),
    summary('Résultat net (CA - charges)', net)
  );

  return { header: exportHeader(symbol), rows };
}
