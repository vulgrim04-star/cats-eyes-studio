import { useState } from 'react';
import Modal from '../common/Modal';
import Icon from '../common/Icon';
import { useAppointments } from '../../hooks/useAppointments';
import { formatPriceFull, fullName } from '../../utils/format';
import styles from './PaymentModal.module.css';

export const PAYMENT_METHODS = [
  { id: 'cb', label: 'CB', icon: 'clipboard' },
  { id: 'especes', label: 'Espèces', icon: 'euro' },
  { id: 'virement', label: 'Virement', icon: 'trending-up' },
];

export const PAYMENT_LABELS = { cb: 'CB', especes: 'Espèces', virement: 'Virement' };

export default function PaymentModal({ appointment, onClose }) {
  const { setStatus, updateAppointment } = useAppointments();
  const [method, setMethod] = useState('cb');

  if (!appointment) return null;

  const handleConfirm = () => {
    updateAppointment(appointment.id, { paymentMethod: method });
    setStatus(appointment.id, 'completed');
    onClose();
  };

  return (
    <Modal
      open={!!appointment}
      onClose={onClose}
      title="Encaissement"
      footer={
        <>
          <button type="button" className="btn btn-ghost" onClick={onClose}>Annuler</button>
          <button type="button" className="btn btn-primary" onClick={handleConfirm}>
            <Icon name="check" size={15} /> Encaisser et terminer
          </button>
        </>
      }
    >
      <div className={styles.summary}>
        <div>
          <div style={{ fontWeight: 700 }}>{appointment.client ? fullName(appointment.client) : 'Cliente'}</div>
          <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>{appointment.service?.name}</div>
        </div>
        <span className={styles.amount}>{formatPriceFull(appointment.price)}</span>
      </div>

      <label className="field-label">Mode de paiement</label>
      <div className={styles.methods}>
        {PAYMENT_METHODS.map((m) => (
          <button
            key={m.id}
            type="button"
            className={`${styles.method} ${method === m.id ? styles.methodActive : ''}`}
            onClick={() => setMethod(m.id)}
          >
            <Icon name={m.icon} size={20} />
            {m.label}
          </button>
        ))}
      </div>
    </Modal>
  );
}
