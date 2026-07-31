import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Modal from '../common/Modal';
import { useClients } from '../../hooks/useClients';
import { useReferentialsStore } from '../../store/useReferentialsStore';
import LashSelect from './LashSelect';

const EMPTY = {
  firstName: '',
  lastName: '',
  phone: '',
  email: '',
  lashType: '',
  lashCondition: '',
  naturalLength: '',
  allergies: '',
  contraindications: '',
};

export default function NewClientModal({ open, onClose }) {
  const { addClient } = useClients();
  const navigate = useNavigate();
  const lashTypes = useReferentialsStore((s) => s.lashTypes);
  const lashConditions = useReferentialsStore((s) => s.lashConditions);
  const naturalLengths = useReferentialsStore((s) => s.naturalLengths);
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
          <LashSelect id="cl-lash" label="Type de cils" options={lashTypes} value={form.lashType} onChange={(v) => update({ lashType: v })} />
          <LashSelect id="cl-condition" label="État des cils" options={lashConditions} value={form.lashCondition} onChange={(v) => update({ lashCondition: v })} />
          <LashSelect id="cl-natural" label="Longueur naturelle" options={naturalLengths} value={form.naturalLength} onChange={(v) => update({ naturalLength: v })} />
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
