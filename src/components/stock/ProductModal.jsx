import { useEffect, useState } from 'react';
import Modal from '../common/Modal';
import { useProducts } from '../../hooks/useProducts';
import { PRODUCT_CATEGORIES } from '../../data/products';

const EMPTY = { name: '', category: 'colle', unit: 'flacon', stock: 0, stockMin: 3, costPerUnit: 0, supplier: '' };

export default function ProductModal({ open, onClose, product }) {
  const { addProduct, updateProduct } = useProducts();
  const [form, setForm] = useState(EMPTY);

  useEffect(() => {
    setForm(
      product
        ? {
            name: product.name,
            category: product.category,
            unit: product.unit,
            stock: product.stock,
            stockMin: product.stockMin,
            costPerUnit: product.costPerUnit,
            supplier: product.supplier ?? '',
          }
        : EMPTY
    );
  }, [product, open]);

  const update = (patch) => setForm((f) => ({ ...f, ...patch }));

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    const payload = {
      ...form,
      stock: Number(form.stock),
      stockMin: Number(form.stockMin),
      costPerUnit: Number(form.costPerUnit),
    };
    if (product) {
      updateProduct(product.id, payload);
    } else {
      addProduct(payload);
    }
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={product ? 'Modifier le produit' : 'Nouveau produit'}
      footer={
        <>
          <button type="button" className="btn btn-ghost" onClick={onClose}>Annuler</button>
          <button type="submit" form="product-form" className="btn btn-primary">{product ? 'Enregistrer' : 'Ajouter'}</button>
        </>
      }
    >
      <form id="product-form" onSubmit={handleSubmit}>
        <div className="field-group">
          <label className="field-label" htmlFor="prd-name">Nom du produit</label>
          <input id="prd-name" className="input-field" value={form.name} onChange={(e) => update({ name: e.target.value })} required autoFocus />
        </div>

        <div className="field-group">
          <label className="field-label" htmlFor="prd-category">Catégorie</label>
          <select id="prd-category" className="input-field" value={form.category} onChange={(e) => update({ category: e.target.value })}>
            {PRODUCT_CATEGORIES.map((c) => (
              <option key={c.id} value={c.id}>{c.label}</option>
            ))}
          </select>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div className="field-group">
            <label className="field-label" htmlFor="prd-stock">Stock actuel</label>
            <input id="prd-stock" type="number" min={0} step={1} className="input-field" value={form.stock} onChange={(e) => update({ stock: e.target.value })} required />
          </div>
          <div className="field-group">
            <label className="field-label" htmlFor="prd-unit">Unité</label>
            <input id="prd-unit" className="input-field" placeholder="flacon, boîte…" value={form.unit} onChange={(e) => update({ unit: e.target.value })} required />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div className="field-group">
            <label className="field-label" htmlFor="prd-min">Seuil minimum</label>
            <input id="prd-min" type="number" min={0} step={1} className="input-field" value={form.stockMin} onChange={(e) => update({ stockMin: e.target.value })} required />
          </div>
          <div className="field-group">
            <label className="field-label" htmlFor="prd-cost">Coût unitaire (€)</label>
            <input id="prd-cost" type="number" min={0} step={0.5} className="input-field" value={form.costPerUnit} onChange={(e) => update({ costPerUnit: e.target.value })} required />
          </div>
        </div>

        <div className="field-group" style={{ marginBottom: 0 }}>
          <label className="field-label" htmlFor="prd-supplier">Fournisseur (optionnel)</label>
          <input id="prd-supplier" className="input-field" value={form.supplier} onChange={(e) => update({ supplier: e.target.value })} />
        </div>
      </form>
    </Modal>
  );
}
