import { useMemo, useState } from 'react';
import PageHeader from '../components/common/PageHeader';
import Icon from '../components/common/Icon';
import ProductCard from '../components/stock/ProductCard';
import OrderModal from '../components/stock/OrderModal';
import MovementsHistory from '../components/stock/MovementsHistory';
import MarginTable from '../components/stock/MarginTable';
import { useProducts, lowStockProducts } from '../hooks/useProducts';
import { useServices } from '../hooks/useServices';
import { PRODUCT_CATEGORIES } from '../data/products';
import styles from './Stock.module.css';

export default function Stock() {
  const { products, movements } = useProducts();
  const { services } = useServices();
  const [category, setCategory] = useState('all');
  const [orderingProduct, setOrderingProduct] = useState(null);

  const lowStock = useMemo(() => lowStockProducts(products), [products]);

  const filtered = useMemo(
    () => (category === 'all' ? products : products.filter((p) => p.category === category)),
    [products, category]
  );

  return (
    <>
      <PageHeader title="Stock" subtitle={`${products.length} produits référencés`} />

      {lowStock.length > 0 && (
        <div className={styles.banner}>
          <Icon name="alert-triangle" size={18} />
          {lowStock.length} produit{lowStock.length > 1 ? 's' : ''} sous le seuil minimum — pensez à commander.
        </div>
      )}

      <div className={`${styles.filters} scrollbar-hidden`}>
        <button type="button" className={`${styles.pill} ${category === 'all' ? styles.pillActive : ''}`} onClick={() => setCategory('all')}>
          Tous
        </button>
        {PRODUCT_CATEGORIES.map((c) => (
          <button
            key={c.id}
            type="button"
            className={`${styles.pill} ${category === c.id ? styles.pillActive : ''}`}
            onClick={() => setCategory(c.id)}
          >
            {c.label}
          </button>
        ))}
      </div>

      <div className={styles.grid}>
        {filtered.map((product) => (
          <ProductCard key={product.id} product={product} onOrder={setOrderingProduct} />
        ))}
      </div>

      <div className={styles.bottomGrid}>
        <MovementsHistory movements={movements} />
        <MarginTable services={services} />
      </div>

      <OrderModal product={orderingProduct} onClose={() => setOrderingProduct(null)} />
    </>
  );
}
