import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Modal from '../common/Modal';
import { useClients } from '../../hooks/useClients';

const EMPTY = {
  firstName: '',
  lastName: '',
  phone: '',
  email: '',
  lashType: 'normal',
  curl: 'C',
  length: '',
  allergies: '',
  contraindications: '',
};

export default function NewClientModal({ open, onClose }) {
  const { addClient } = useClients();
  const navigate = useNavigate();
  const [form, setForm] = useState(EMPTY);

  const update = (patch) => setForm((f) => ({ ...f, ...patch }));

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.firstName || !form.lastName || !form.phone) return;
    const client = addClient(form);
    setForm(EMPTY);
    onClose();
    navigate(`/clientes/${client.id}`);
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Nouvelle cliente"
      footer={
        <>
          <button type="button" className="btn btn-ghost" onClick={onClose}>Annuler</button>
          <button type="submit" form="new-client-form" className="btn btn-primary">Créer la fiche</button>
        </>
      }
    >
      <form id="new-client-form" onSubmit={handleSubmit}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div className="field-group">
            <label className="field-label" htmlFor="cl-first">Prénom</label>
            <input id="cl-first" className="input-field" value={form.firstName} onChange={(e) => update({ firstName: e.target.value })} required />
          </div>
          <div className="field-group">
            <label className="field-label" htmlFor="cl-last">Nom</label>
            <input id="cl-last" className="input-field" value={form.lastName} onChange={(e) => update({ lastName: e.target.value })} required />
          </div>
        </div>

        <div className="field-group">
          <label className="field-label" htmlFor="cl-phone">Téléphone</label>
          <input id="cl-phone" className="input-field" value={form.phone} onChange={(e) => update({ phone: e.target.value })} placeholder="06 00 00 00 00" required />
        </div>

        <div className="field-group">
          <label className="field-label" htmlFor="cl-email">Email</label>
          <input id="cl-email" type="email" className="input-field" value={form.email} onChange={(e) => update({ email: e.target.value })} />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
          <div className="field-group">
            <label className="field-label" htmlFor="cl-lash">Type de cils</label>
            <select id="cl-lash" className="input-field" value={form.lashType} onChange={(e) => update({ lashType: e.target.value })}>
              <option value="fin">Fin</option>
              <option value="normal">Normal</option>
              <option value="épais">Épais</option>
            </select>
          </div>
          <div className="field-group">
            <label className="field-label" htmlFor="cl-curl">Courbure</label>
            <input id="cl-curl" className="input-field" value={form.curl} onChange={(e) => update({ curl: e.target.value })} placeholder="C, CC, D…" />
          </div>
          <div className="field-group">
            <label className="field-label" htmlFor="cl-length">Longueur</label>
            <input id="cl-length" className="input-field" value={form.length} onChange={(e) => update({ length: e.target.value })} placeholder="10-12mm" />
          </div>
        </div>

        <div className="field-group">
          <label className="field-label" htmlFor="cl-allergies">Allergies</label>
          <input id="cl-allergies" className="input-field" value={form.allergies} onChange={(e) => update({ allergies: e.target.value })} placeholder="Aucune connue" />
        </div>

        <div className="field-group">
          <label className="field-label" htmlFor="cl-contra">Contre-indications</label>
          <textarea id="cl-contra" className="input-field" rows={2} value={form.contraindications} onChange={(e) => update({ contraindications: e.target.value })} />
        </div>
      </form>
    </Modal>
  );
}
