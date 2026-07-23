import ProgressBar from '../common/ProgressBar';
import Icon from '../common/Icon';
import { stockRatio } from '../../hooks/useProducts';
import { PRODUCT_CATEGORIES } from '../../data/products';
import styles from './ProductCard.module.css';

function categoryLabel(id) {
  return PRODUCT_CATEGORIES.find((c) => c.id === id)?.label ?? id;
}

export default function ProductCard({ product, onOrder, onDelete }) {
  const low = product.stock < product.stockMin;
  const ratio = stockRatio(product);
  const color = low ? 'var(--color-danger)' : ratio < 0.6 ? 'var(--color-warning)' : 'var(--color-success)';

  return (
    <div className={styles.card}>
      <div className={styles.top}>
        <div>
          <div className={styles.name}>{product.name}</div>
          <div className={styles.category}>{categoryLabel(product.category)}</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {low && (
            <span className="badge" style={{ background: 'var(--color-danger-bg)', color: 'var(--color-danger)' }}>
              <Icon name="alert-triangle" size={11} /> Stock faible
            </span>
          )}
          <button
            type="button"
            className={styles.deleteBtn}
            onClick={() => onDelete(product)}
            title="Supprimer ce produit"
            aria-label="Supprimer ce produit"
          >
            <Icon name="trash" size={14} />
          </button>
        </div>
      </div>

      <ProgressBar value={ratio} color={color} />

      <div className={styles.stockRow}>
        <span><span className={styles.stockValue}>{product.stock}</span> {product.unit}</span>
        <span>seuil min. {product.stockMin}</span>
      </div>

      <div className={styles.footer}>
        <span className={styles.supplier}>{product.supplier}</span>
        <button type="button" className="btn btn-secondary btn-sm" onClick={() => onOrder(product)}>
          <Icon name="plus" size={13} /> Commander
        </button>
      </div>
    </div>
  );
}
