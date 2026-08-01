import { describe, expect, it } from 'vitest';
import { buildFinanceExport, exportTotals } from './financeExport';

const apt = (over = {}) => ({
  date: '2026-07-28',
  time: '10:00',
  price: 130,
  paymentMethod: 'twint',
  service: { name: 'Pose complète' },
  client: { firstName: 'Élise', lastName: 'Rousseau' },
  ...over,
});

const charge = (over = {}) => ({ id: 'exp_1', label: 'Loyer du salon', category: 'loyer', amount: 950, date: '2026-07-01', ...over });

/** Colonne 9 (0-indexée) : la seule que l'on somme. */
const MONTANT = 9;
const TYPE = 0;

describe('buildFinanceExport', () => {
  it('détaille une prestation avec ses suppléments et son pourboire', () => {
    const { rows } = buildFinanceExport([apt({ extras: [{ label: 'Pose de 4 cils', amount: 15 }], tip: 7 })], [], 'CHF');
    expect(rows[0]).toEqual([
      'Prestation', '2026-07-28', '10:00', 'Pose complète', 'Élise Rousseau',
      '130.00', '15.00', '145.00', '7.00', '152.00', 'Twint',
    ]);
  });

  it('porte la devise dans les en-têtes de colonnes', () => {
    expect(buildFinanceExport([], [], 'CHF').header).toContain('Montant (CHF)');
    expect(buildFinanceExport([], [], '€').header).toContain("Chiffre d'affaires (€)");
  });

  // Le signe est tout l'intérêt du tableau unique : sans lui, sommer la colonne additionnerait
  // les charges au chiffre d'affaires au lieu de les en retrancher.
  it('inscrit les charges en négatif, avec leur catégorie en clair', () => {
    const { rows } = buildFinanceExport([], [charge()], 'CHF');
    expect(rows[0]).toEqual(['Charge', '2026-07-01', '', 'Loyer du salon', 'Loyer', '', '', '', '', '-950.00', '']);
  });

  it('laisse vides les colonnes qui n’ont pas de sens pour une charge', () => {
    const { rows } = buildFinanceExport([], [charge()], 'CHF');
    // Tarif, suppléments, CA, pourboire, paiement : une case vide, jamais « 0.00 », qui se
    // lirait comme un pourboire nul plutôt que comme une notion absente.
    expect([rows[0][5], rows[0][6], rows[0][7], rows[0][8], rows[0][10]]).toEqual(['', '', '', '', '']);
  });

  it('trie prestations et charges ensemble, par date puis par heure', () => {
    const { rows } = buildFinanceExport(
      [apt({ date: '2026-07-28', time: '14:00' }), apt({ date: '2026-07-28', time: '09:00' })],
      [charge({ date: '2026-07-28' }), charge({ id: 'exp_2', date: '2026-07-01' })],
      'CHF'
    );
    expect(rows.slice(0, 4).map((r) => [r[TYPE], r[1], r[2]])).toEqual([
      ['Charge', '2026-07-01', ''],
      ['Charge', '2026-07-28', ''],
      ['Prestation', '2026-07-28', '09:00'],
      ['Prestation', '2026-07-28', '14:00'],
    ]);
  });

  it('termine par les quatre lignes de synthèse, dans la colonne sommable', () => {
    const { rows } = buildFinanceExport([apt({ tip: 7 })], [charge()], 'CHF');
    expect(rows.slice(-4).map((r) => [r[3], r[MONTANT]])).toEqual([
      ["Chiffre d'affaires", '130.00'],
      ['Pourboires', '7.00'],
      ['Charges', '-950.00'],
      ['Résultat net (CA - charges)', '-820.00'],
    ]);
  });

  // Le fichier doit se vérifier tout seul : additionner la colonne Montant des lignes de
  // détail doit redonner CA + pourboires - charges, sans quoi la synthèse serait invérifiable.
  it('fait correspondre la somme des lignes de détail et la synthèse', () => {
    const { rows } = buildFinanceExport([apt({ extras: [{ label: 'Supp.', amount: 15 }], tip: 7 })], [charge()], 'CHF');
    const detail = rows.filter((r) => r[TYPE] !== 'Total').reduce((sum, r) => sum + Number(r[MONTANT]), 0);
    const { revenue, tips, charges } = exportTotals([apt({ extras: [{ label: 'Supp.', amount: 15 }], tip: 7 })], [charge()]);
    expect(detail).toBeCloseTo(revenue + tips - charges, 2);
  });

  // Un mois sans rendez-vous mais avec un loyer doit produire un fichier exploitable.
  it('exporte une période sans aucune prestation', () => {
    const { rows } = buildFinanceExport([], [charge()], 'CHF');
    expect(rows).toHaveLength(5);
    expect(rows.at(-1)).toContain('-950.00');
  });
});

describe('exportTotals', () => {
  it('tient le pourboire hors du résultat net', () => {
    // 130 de prestation, 20 de pourboire, 50 de charges : le résultat net vaut 80, pas 100.
    // Un pourboire encaissé n'est pas du chiffre d'affaires, il ne peut pas compenser une charge.
    const totals = exportTotals([apt({ tip: 20 })], [charge({ amount: 50 })]);
    expect(totals).toEqual({ revenue: 130, tips: 20, charges: 50, net: 80 });
  });

  it('ne compte que la prestation et ses suppléments comme chiffre d’affaires', () => {
    const totals = exportTotals([apt({ extras: [{ label: 'Supp.', amount: 15 }], tip: 7 })], []);
    expect(totals.revenue).toBe(145);
  });
});
