import { useState } from 'react';
import Modal from './Modal';
import { useWaitlist } from '../../hooks/useWaitlist';
import { formatDateLong } from '../../utils/date';

export default function WaitlistModal({ open, onClose, date, serviceName }) {
  const { addEntry } = useWaitlist();
  const [form, setForm] = useState({ firstName: '', lastName: '', phone: '', email: '' });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.firstName || !form.lastName || !form.phone) return;
    addEntry({ ...form, preferredDate: date, serviceName });
    setForm({ firstName: '', lastName: '', phone: '', email: '' });
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Liste d'attente"
      footer={
        <>
          <button type="button" className="btn btn-ghost" onClick={onClose}>Annuler</button>
          <button type="submit" form="waitlist-form" className="btn btn-primary">S'inscrire</button>
        </>
      }
    >
      <p style={{ fontSize: '0.86rem', color: 'var(--color-text-soft)', marginBottom: 'var(--space-4)' }}>
        Aucun créneau disponible le {formatDateLong(date)} pour {serviceName}. Laissez vos coordonnées, le salon vous recontacte dès qu'une place se libère.
      </p>
      <form id="waitlist-form" onSubmit={handleSubmit}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div className="field-group">
            <label className="field-label" htmlFor="wl-first">Prénom</label>
            <input id="wl-first" className="input-field" value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} required />
          </div>
          <div className="field-group">
            <label className="field-label" htmlFor="wl-last">Nom</label>
            <input id="wl-last" className="input-field" value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} required />
          </div>
        </div>
        <div className="field-group">
          <label className="field-label" htmlFor="wl-phone">Téléphone</label>
          <input id="wl-phone" className="input-field" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="06 00 00 00 00" required />
        </div>
        <div className="field-group" style={{ marginBottom: 0 }}>
          <label className="field-label" htmlFor="wl-email">Email</label>
          <input id="wl-email" type="email" className="input-field" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        </div>
      </form>
    </Modal>
  );
}
