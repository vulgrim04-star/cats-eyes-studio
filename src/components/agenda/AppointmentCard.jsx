import { useNavigate } from 'react-router-dom';
import Icon from '../common/Icon';
import StatusBadge, { STATUS_MAP } from '../common/StatusBadge';
import { addMinutesToTime } from '../../utils/date';
import { formatPrice, fullName } from '../../utils/format';
import styles from './AppointmentCard.module.css';

export default function AppointmentCard({ appointment, showActions = true, onStatusChange, onEdit, onRequestComplete, onPrint }) {
  const navigate = useNavigate();
  const { client, service, time, duration, status } = appointment;
  const stripeColor = STATUS_MAP[status]?.color ?? 'var(--color-rose)';

  const handleComplete = () => {
    if (onRequestComplete) {
      onRequestComplete(appointment);
    } else {
      onStatusChange(appointment.id, 'completed');
    }
  };

  return (
    <div className={styles.card}>
      <span className={styles.stripe} style={{ background: stripeColor }} />
      <div className={styles.time}>
        <span className={styles.timeStart}>{time}</span>
        <span className={styles.timeEnd}>{addMinutesToTime(time, duration)}</span>
      </div>
      <div className={styles.body}>
        <div className={styles.headRow}>
          <div>
            <div
              className={styles.clientName}
              onClick={() => client && navigate(`/clientes/${client.id}`)}
              role={client ? 'button' : undefined}
              tabIndex={client ? 0 : undefined}
            >
              {client ? fullName(client) : 'Cliente inconnue'}
            </div>
            <div className={styles.serviceName}>{service?.name}</div>
          </div>
          <StatusBadge status={status} size="sm" />
        </div>

        <div className={styles.metaRow}>
          <span>{formatPrice(appointment.price)}</span>
        </div>

        {showActions && onStatusChange && (
          <div className={styles.actions}>
            {status === 'pending' && (
              <>
                <button type="button" className={`${styles.actionBtn} ${styles.confirm}`} onClick={() => onStatusChange(appointment.id, 'confirmed')}>
                  <Icon name="check" size={13} /> Confirmer
                </button>
                {onEdit && (
                  <button type="button" className={`${styles.actionBtn} ${styles.cancel}`} onClick={() => onEdit(appointment)}>
                    <Icon name="edit" size={13} /> Modifier
                  </button>
                )}
                <button type="button" className={`${styles.actionBtn} ${styles.cancel}`} onClick={() => onStatusChange(appointment.id, 'cancelled')}>
                  <Icon name="x" size={13} /> Annuler
                </button>
              </>
            )}
            {status === 'confirmed' && (
              <>
                <button type="button" className={`${styles.actionBtn} ${styles.complete}`} onClick={handleComplete}>
                  <Icon name="check" size={13} /> Terminé
                </button>
                {onEdit && (
                  <button type="button" className={`${styles.actionBtn} ${styles.cancel}`} onClick={() => onEdit(appointment)}>
                    <Icon name="edit" size={13} /> Modifier
                  </button>
                )}
                <button type="button" className={`${styles.actionBtn} ${styles.noshow}`} onClick={() => onStatusChange(appointment.id, 'no-show')}>
                  <Icon name="alert-triangle" size={13} /> No-show
                </button>
                <button type="button" className={`${styles.actionBtn} ${styles.cancel}`} onClick={() => onStatusChange(appointment.id, 'cancelled')}>
                  <Icon name="x" size={13} /> Annuler
                </button>
              </>
            )}
            {(status === 'completed' || status === 'cancelled' || status === 'no-show') && (
              <button type="button" className={`${styles.actionBtn} ${styles.cancel}`} onClick={() => onStatusChange(appointment.id, 'pending')}>
                Remettre en attente
              </button>
            )}
            {status === 'completed' && onPrint && (
              <button type="button" className={`${styles.actionBtn} ${styles.cancel}`} onClick={() => onPrint(appointment)}>
                <Icon name="download" size={13} /> Reçu
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
