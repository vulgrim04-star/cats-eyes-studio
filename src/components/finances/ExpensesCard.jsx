import { Link } from 'react-router-dom';
import Icon from '../common/Icon';
import { formatPriceFull } from '../../utils/format';
import styles from './ExpensesCard.module.css';

/** Résumé seulement : le total des charges et le résultat net sont des chiffres de pilotage,
 *  ils ont leur place ici. La liste, la saisie et la modification vivent sur `/charges` —
 *  deux endroits pour faire la même chose finissent toujours par diverger. */
export default function ExpensesCard({ expenses, total, revenueTotal }) {
  const net = revenueTotal - total;

  return (
    <div className="card">
      <div className={styles.header}>
        <h3 className="card-title">Charges &amp; résultat net</h3>
        <Link to="/charges" className="btn btn-secondary btn-sm">
          Gérer les charges <Icon name="chevron-right" size={13} />
        </Link>
      </div>

      <div className={styles.total}>
        {/* Pas de signe devant un zéro : « -0.00 CHF » se lit comme une anomalie de calcul
            là où il n'y a simplement aucune charge sur la période. */}
        <span className={styles.totalValue}>{total > 0 ? '-' : ''}{formatPriceFull(total)}</span>
        <span style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>
          {expenses.length} charge{expenses.length > 1 ? 's' : ''} sur la période
        </span>
      </div>

      <div className={styles.netRow} style={{ marginBottom: 0 }}>
        <span style={{ fontSize: '0.86rem', fontWeight: 600 }}>Résultat net (CA - charges)</span>
        <span className={styles.netValue} style={{ color: net >= 0 ? 'var(--color-success)' : 'var(--color-danger)' }}>
          {formatPriceFull(net)}
        </span>
      </div>
    </div>
  );
}
