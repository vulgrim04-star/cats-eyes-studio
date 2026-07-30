import EmptyState from '../common/EmptyState';
import { paymentLabel } from '../../utils/payments';
import { collectedTotal, extrasTotal, tipOf } from '../../utils/billing';
import { fullName, formatPriceFull } from '../../utils/format';
import styles from './CashRegister.module.css';

export default function CashRegister({ appointments, total }) {
  // Ici c'est l'argent réellement encaissé qui compte, pourboire compris : cette carte
  // répond à « combien y a-t-il dans la caisse ce soir ? », pas à « quel chiffre d'affaires
  // ai-je fait ? ».
  const byMethod = appointments.reduce((acc, apt) => {
    const key = apt.paymentMethod ?? 'cb';
    acc[key] = (acc[key] ?? 0) + collectedTotal(apt);
    return acc;
  }, {});

  const tipsTotal = appointments.reduce((sum, apt) => sum + tipOf(apt), 0);

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
              {paymentLabel(method)} · {formatPriceFull(amount)}
            </span>
          ))}
          {/* Affiché à part, et pas fondu dans les moyens de paiement : c'est la seule
              façon de savoir ce qui revient au chiffre d'affaires et ce qui n'y revient pas. */}
          {tipsTotal > 0 && (
            <span className={`${styles.methodChip} ${styles.tipChip}`}>
              Dont pourboires · {formatPriceFull(tipsTotal)}
            </span>
          )}
        </div>
      )}

      {appointments.length === 0 ? (
        <EmptyState icon="euro" title="Aucun encaissement aujourd'hui" subtitle="Les prestations terminées aujourd'hui apparaîtront ici." />
      ) : (
        appointments.map((apt) => {
          const extras = extrasTotal(apt);
          const tip = tipOf(apt);
          return (
            <div key={apt.id} className={styles.row}>
              <div>
                <div className={styles.client}>{apt.client ? fullName(apt.client) : 'Cliente'}</div>
                <div className={styles.service}>
                  {apt.service?.name} · {apt.time}
                  {apt.paymentMethod && ` · ${paymentLabel(apt.paymentMethod)}`}
                </div>
                {(extras > 0 || tip > 0) && (
                  <div className={styles.breakdown}>
                    {extras > 0 && <span>+ {formatPriceFull(extras)} de suppléments</span>}
                    {tip > 0 && <span>+ {formatPriceFull(tip)} de pourboire</span>}
                  </div>
                )}
              </div>
              <span className={styles.price}>{formatPriceFull(collectedTotal(apt))}</span>
            </div>
          );
        })
      )}
    </div>
  );
}
