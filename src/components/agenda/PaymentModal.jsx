import { useMemo, useState } from 'react';
import Modal from '../common/Modal';
import Icon from '../common/Icon';
import { useAppointments } from '../../hooks/useAppointments';
import { formatPriceFull, fullName } from '../../utils/format';
import { PAYMENT_METHODS } from '../../utils/payments';
import { normalizeExtras } from '../../utils/billing';
import styles from './PaymentModal.module.css';

/** Une ligne de supplément en cours de saisie. `amount` reste une CHAÎNE tant que la
 *  praticienne tape : convertir à chaque frappe empêcherait d'écrire « 12.5 » (le point
 *  serait avalé) et transformerait un champ vidé en zéro. */
const emptyExtra = () => ({ key: Math.random().toString(36).slice(2), label: '', amount: '' });

export default function PaymentModal({ appointment, onClose }) {
  const { setStatus, updateAppointment } = useAppointments();
  const [method, setMethod] = useState('cb');
  const [extras, setExtras] = useState([]);
  const [tip, setTip] = useState('');

  const clean = useMemo(() => normalizeExtras(extras), [extras]);
  const extrasSum = clean.reduce((sum, e) => sum + e.amount, 0);
  const tipValue = Math.max(0, Number.parseFloat(tip) || 0);
  const base = appointment?.price ?? 0;
  const total = base + extrasSum + tipValue;

  if (!appointment) return null;

  const updateExtra = (key, patch) =>
    setExtras((list) => list.map((e) => (e.key === key ? { ...e, ...patch } : e)));

  const handleConfirm = () => {
    updateAppointment(appointment.id, {
      paymentMethod: method,
      // On n'enregistre que ce qui a une valeur : un rendez-vous encaissé sans supplément
      // ni pourboire garde exactement la forme qu'il avait avant.
      ...(clean.length > 0 ? { extras: clean } : {}),
      ...(tipValue > 0 ? { tip: tipValue } : {}),
    });
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
            <Icon name="check" size={15} /> Encaisser {formatPriceFull(total)}
          </button>
        </>
      }
    >
      <div className={styles.summary}>
        <div>
          <div style={{ fontWeight: 700 }}>{appointment.client ? fullName(appointment.client) : 'Cliente'}</div>
          <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>{appointment.service?.name}</div>
        </div>
        <span className={styles.amount}>{formatPriceFull(base)}</span>
      </div>

      <div className={styles.block}>
        <div className={styles.blockHead}>
          <label className="field-label" style={{ margin: 0 }}>Prestations en plus</label>
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => setExtras((l) => [...l, emptyExtra()])}>
            <Icon name="plus" size={13} /> Ajouter
          </button>
        </div>

        {extras.length === 0 && (
          <p className={styles.hint}>Une pose supplémentaire, un soin ajouté en cours de séance…</p>
        )}

        {extras.map((extra) => (
          <div key={extra.key} className={styles.extraRow}>
            <input
              className="input-field"
              placeholder="Ex. pose de 4 cils"
              value={extra.label}
              onChange={(e) => updateExtra(extra.key, { label: e.target.value })}
            />
            <input
              className="input-field"
              type="number"
              inputMode="decimal"
              min={0}
              step="0.5"
              placeholder="0"
              aria-label="Montant du supplément"
              value={extra.amount}
              onChange={(e) => updateExtra(extra.key, { amount: e.target.value })}
            />
            <button
              type="button"
              className={styles.removeExtra}
              onClick={() => setExtras((l) => l.filter((e) => e.key !== extra.key))}
              aria-label="Retirer ce supplément"
            >
              <Icon name="x" size={15} />
            </button>
          </div>
        ))}
      </div>

      <div className={styles.block}>
        <label className="field-label" htmlFor="pay-tip">Pourboire</label>
        <input
          id="pay-tip"
          className="input-field"
          type="number"
          inputMode="decimal"
          min={0}
          step="0.5"
          placeholder="0"
          value={tip}
          onChange={(e) => setTip(e.target.value)}
        />
        {/* Dit explicitement pourquoi le pourboire est traité à part : il n'est pas une
            prestation vendue, donc ni chiffre d'affaires ni TVA. */}
        <p className={styles.hint}>Suivi à part : compté dans la caisse, hors chiffre d'affaires.</p>
      </div>

      {(extrasSum > 0 || tipValue > 0) && (
        <div className={styles.totals}>
          <div className={styles.totalLine}>
            <span>Prestation</span>
            <span>{formatPriceFull(base)}</span>
          </div>
          {extrasSum > 0 && (
            <div className={styles.totalLine}>
              <span>Suppléments</span>
              <span>{formatPriceFull(extrasSum)}</span>
            </div>
          )}
          {tipValue > 0 && (
            <div className={styles.totalLine}>
              <span>Pourboire</span>
              <span>{formatPriceFull(tipValue)}</span>
            </div>
          )}
          <div className={styles.totalLineStrong}>
            <span>Total encaissé</span>
            <span>{formatPriceFull(total)}</span>
          </div>
        </div>
      )}

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
