import { useEffect, useState } from 'react';
import Modal from '../common/Modal';
import { useServices } from '../../hooks/useServices';

const EMPTY = { code: '', label: '', discountPercent: 10, active: true };

export default function PromoModal({ open, onClose, promo }) {
  const { addPromo, updatePromo } = useServices();
  const [form, setForm] = useState(EMPTY);

  useEffect(() => {
    setForm(promo ? { code: promo.code, label: promo.label, discountPercent: promo.discountPercent, active: promo.active } : EMPTY);
  }, [promo, open]);

  const update = (patch) => setForm((f) => ({ ...f, ...patch }));

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.code.trim() || !form.label.trim()) return;
    const payload = { ...form, code: form.code.trim().toUpperCase(), discountPercent: Number(form.discountPercent) };
    if (promo) {
      updatePromo(promo.id, payload);
    } else {
      addPromo(payload);
    }
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={promo ? 'Modifier le code promo' : 'Nouveau code promo'}
      footer={
        <>
          <button type="button" className="btn btn-ghost" onClick={onClose}>Annuler</button>
          <button type="submit" form="promo-form" className="btn btn-primary">{promo ? 'Enregistrer' : 'Créer'}</button>
        </>
      }
    >
      <form id="promo-form" onSubmit={handleSubmit}>
        <div className="field-group">
          <label className="field-label" htmlFor="promo-code">Code</label>
          <input
            id="promo-code"
            className="input-field"
            value={form.code}
            onChange={(e) => update({ code: e.target.value })}
            placeholder="BIENVENUE10"
            required
            autoFocus
          />
        </div>

        <div className="field-group">
          <label className="field-label" htmlFor="promo-label">Description</label>
          <input
            id="promo-label"
            className="input-field"
            value={form.label}
            onChange={(e) => update({ label: e.target.value })}
            placeholder="10% de réduction — première visite"
            required
          />
        </div>

        <div className="field-group" style={{ marginBottom: 0 }}>
          <label className="field-label" htmlFor="promo-discount">Remise (%)</label>
          <input
            id="promo-discount"
            type="number"
            min={1}
            max={100}
            className="input-field"
            value={form.discountPercent}
            onChange={(e) => update({ discountPercent: e.target.value })}
            required
          />
        </div>
      </form>
    </Modal>
  );
}
