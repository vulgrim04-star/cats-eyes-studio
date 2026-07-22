import { useState } from 'react';
import Modal from '../common/Modal';
import { useProducts } from '../../hooks/useProducts';
import { formatPriceFull } from '../../utils/format';

export default function OrderModal({ product, onClose }) {
  const { addStock } = useProducts();
  const [quantity, setQuantity] = useState(product ? Math.max(product.stockMin * 2 - product.stock, 1) : 1);

  if (!product) return null;

  const cost = quantity * product.costPerUnit;
  const projected = product.stock + Number(quantity || 0);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!quantity || quantity <= 0) return;
    addStock({ productId: product.id, quantity: Number(quantity), reason: `Commande fournisseur — ${product.supplier}` });
    onClose();
  };

  return (
    <Modal
      open={!!product}
      onClose={onClose}
      title={`Commander — ${product.name}`}
      footer={
        <>
          <button type="button" className="btn btn-ghost" onClick={onClose}>Annuler</button>
          <button type="submit" form="order-form" className="btn btn-primary">Valider la commande</button>
        </>
      }
    >
      <form id="order-form" onSubmit={handleSubmit}>
        <div className="field-group">
          <label className="field-label" htmlFor="order-qty">Quantité ({product.unit})</label>
          <input
            id="order-qty"
            type="number"
            min={1}
            className="input-field"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            autoFocus
          />
        </div>

        <div className="card" style={{ background: 'var(--color-cream)', boxShadow: 'none', display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.86rem' }}>
            <span>Coût estimé</span>
            <strong>{formatPriceFull(cost)}</strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.86rem' }}>
            <span>Stock actuel</span>
            <span>{product.stock} {product.unit}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.86rem' }}>
            <span>Stock projeté</span>
            <strong style={{ color: 'var(--color-success)' }}>{projected} {product.unit}</strong>
          </div>
        </div>
      </form>
    </Modal>
  );
}
