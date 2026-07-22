import EmptyState from '../common/EmptyState';
import { PAYMENT_LABELS } from '../agenda/PaymentModal';
import { fullName, formatPriceFull } from '../../utils/format';
import styles from './CashRegister.module.css';

export default function CashRegister({ appointments, total }) {
  const byMethod = appointments.reduce((acc, apt) => {
    const key = apt.paymentMethod ?? 'cb';
    acc[key] = (acc[key] ?? 0) + apt.price;
    return acc;
  }, {});

  return (
    <div className="card">
      <h3 className="card-title" style={{ marginBottom: 'var(--space-3)' }}>Caisse du jour</h3>
      <div className={styles.total}>
        <span className={styles.totalValue}>{formatPriceFull(total)}</span>
        <span className={styles.totalLabel}>{appointments.length} encaissement{appointments.length > 1 ? 's' : ''}</span>
      </div>

      {appointments.length > 0 && (
        <div className={styles.methodsRow}>
          {Object.entries(byMethod).map(([method, amount]) => (
            <span key={method} className={styles.methodChip}>
              {PAYMENT_LABELS[method] ?? method} · {formatPriceFull(amount)}
            </span>
          ))}
        </div>
      )}

      {appointments.length === 0 ? (
        <EmptyState icon="euro" title="Aucun encaissement aujourd'hui" subtitle="Les prestations terminées aujourd'hui apparaîtront ici." />
      ) : (
        appointments.map((apt) => (
          <div key={apt.id} className={styles.row}>
            <div>
              <div className={styles.client}>{apt.client ? fullName(apt.client) : 'Cliente'}</div>
              <div className={styles.service}>
                {apt.service?.name} · {apt.time}
                {apt.paymentMethod && ` · ${PAYMENT_LABELS[apt.paymentMethod]}`}
              </div>
            </div>
            <span className={styles.price}>{formatPriceFull(apt.price)}</span>
          </div>
        ))
      )}
    </div>
  );
}
