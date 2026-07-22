import Icon from '../common/Icon';
import EmptyState from '../common/EmptyState';
import { getProductById } from '../../data/products';
import { formatDateShort } from '../../utils/date';
import styles from './MovementsHistory.module.css';

export default function MovementsHistory({ movements, limit = 10 }) {
  const sorted = [...movements].sort((a, b) => (a.date < b.date ? 1 : -1)).slice(0, limit);

  return (
    <div className="card">
      <h3 className="card-title" style={{ marginBottom: 'var(--space-2)' }}>Mouvements récents</h3>
      {sorted.length === 0 ? (
        <EmptyState icon="package" title="Aucun mouvement" subtitle="Les entrées et sorties de stock apparaîtront ici." />
      ) : (
        sorted.map((m) => {
          const product = getProductById(m.productId);
          return (
            <div key={m.id} className={styles.row}>
              <span className={`${styles.iconWrap} ${m.type === 'in' ? styles.in : styles.out}`}>
                <Icon name={m.type === 'in' ? 'plus' : 'x'} size={14} />
              </span>
              <div className={styles.text}>
                <div className={styles.reason}>{product?.name ?? 'Produit'}</div>
                <div className={styles.meta}>{m.reason} · {formatDateShort(m.date)} · {m.user}</div>
              </div>
              <span className={styles.qty} style={{ color: m.type === 'in' ? 'var(--color-success)' : 'var(--color-danger)' }}>
                {m.type === 'in' ? '+' : '-'}{m.quantity}
              </span>
            </div>
          );
        })
      )}
    </div>
  );
}
