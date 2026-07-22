import { useEffect, useState } from 'react';
import Modal from '../common/Modal';
import { useServices } from '../../hooks/useServices';
import { SERVICE_CATEGORIES } from '../../data/services';

const EMPTY = { name: '', category: 'cils', duration: 60, price: 40 };

export default function ServiceModal({ open, onClose, service }) {
  const { addService, updateService } = useServices();
  const [form, setForm] = useState(EMPTY);

  useEffect(() => {
    setForm(service ? { name: service.name, category: service.category, duration: service.duration, price: service.price } : EMPTY);
  }, [service, open]);

  const update = (patch) => setForm((f) => ({ ...f, ...patch }));

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    const payload = { ...form, duration: Number(form.duration), price: Number(form.price) };
    if (service) {
      updateService(service.id, payload);
    } else {
      addService(payload);
    }
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={service ? 'Modifier la prestation' : 'Nouvelle prestation'}
      footer={
        <>
          <button type="button" className="btn btn-ghost" onClick={onClose}>Annuler</button>
          <button type="submit" form="service-form" className="btn btn-primary">{service ? 'Enregistrer' : 'Ajouter'}</button>
        </>
      }
    >
      <form id="service-form" onSubmit={handleSubmit}>
        <div className="field-group">
          <label className="field-label" htmlFor="svc-name">Nom de la prestation</label>
          <input id="svc-name" className="input-field" value={form.name} onChange={(e) => update({ name: e.target.value })} required autoFocus />
        </div>

        <div className="field-group">
          <label className="field-label" htmlFor="svc-category">Catégorie</label>
          <select id="svc-category" className="input-field" value={form.category} onChange={(e) => update({ category: e.target.value })}>
            {SERVICE_CATEGORIES.map((c) => (
              <option key={c.id} value={c.id}>{c.label}</option>
            ))}
          </select>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div className="field-group">
            <label className="field-label" htmlFor="svc-duration">Durée (minutes)</label>
            <input id="svc-duration" type="number" min={5} step={5} className="input-field" value={form.duration} onChange={(e) => update({ duration: e.target.value })} required />
          </div>
          <div className="field-group">
            <label className="field-label" htmlFor="svc-price">Prix (€)</label>
            <input id="svc-price" type="number" min={0} step={1} className="input-field" value={form.price} onChange={(e) => update({ price: e.target.value })} required />
          </div>
        </div>
      </form>
    </Modal>
  );
}
