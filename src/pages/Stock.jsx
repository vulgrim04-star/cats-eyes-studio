import { useMemo, useState } from 'react';
import PageHeader from '../components/common/PageHeader';
import Icon from '../components/common/Icon';
import ProductCard from '../components/stock/ProductCard';
import OrderModal from '../components/stock/OrderModal';
import ProductModal from '../components/stock/ProductModal';
import MovementsHistory from '../components/stock/MovementsHistory';
import MarginTable from '../components/stock/MarginTable';
import EmptyState from '../components/common/EmptyState';
import { useProducts, lowStockProducts } from '../hooks/useProducts';
import { useServices } from '../hooks/useServices';
import { PRODUCT_CATEGORIES } from '../data/products';
import styles from './Stock.module.css';

export default function Stock() {
  const { products, movements, removeProduct } = useProducts();
  const { services } = useServices();
  const [category, setCategory] = useState('all');
  const [orderingProduct, setOrderingProduct] = useState(null);
  const [productModalOpen, setProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);

  const openNewProduct = () => {
    setEditingProduct(null);
    setProductModalOpen(true);
  };

  const openEditProduct = (product) => {
    setEditingProduct(product);
    setProductModalOpen(true);
  };

  const handleDelete = (product) => {
    if (window.confirm(`Supprimer "${product.name}" du stock ? Cette action est irréversible.`)) {
      removeProduct(product.id);
    }
  };

  const lowStock = useMemo(() => lowStockProducts(products), [products]);

  const filtered = useMemo(
    () => (category === 'all' ? products : products.filter((p) => p.category === category)),
    [products, category]
  );

  return (
    <>
      <PageHeader
        title="Stock"
        subtitle={`${products.length} produits référencés`}
        actions={
          <button type="button" className="btn btn-primary" onClick={openNewProduct}>
            <Icon name="plus" size={16} /> Nouveau produit
          </button>
        }
      />

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

      {filtered.length === 0 ? (
        <EmptyState
          icon="package"
          title="Aucun produit référencé"
          subtitle="Ajoute un premier produit pour commencer à suivre ton stock."
        />
      ) : (
        <div className={styles.grid}>
          {filtered.map((product) => (
            <ProductCard key={product.id} product={product} onOrder={setOrderingProduct} onEdit={openEditProduct} onDelete={handleDelete} />
          ))}
        </div>
      )}

      <div className={styles.bottomGrid}>
        <MovementsHistory movements={movements} />
        <MarginTable services={services} />
      </div>

      <OrderModal product={orderingProduct} onClose={() => setOrderingProduct(null)} />
      <ProductModal open={productModalOpen} onClose={() => setProductModalOpen(false)} product={editingProduct} />
    </>
  );
}
