import { useNavigate } from 'react-router-dom';
import Icon from '../common/Icon';
import EmptyState from '../common/EmptyState';
import { fullName } from '../../utils/format';
import styles from './AlertsPanel.module.css';

export default function AlertsPanel({ lowStock, pendingAppointments, birthdays = [] }) {
  const navigate = useNavigate();
  const hasAlerts = lowStock.length > 0 || pendingAppointments.length > 0 || birthdays.length > 0;

  return (
    <div className="card">
      <h3 className="card-title">Alertes</h3>
      {!hasAlerts && (
        <EmptyState icon="check-circle" title="Tout est sous contrôle" subtitle="Aucune alerte de stock ou de RDV en attente." />
      )}
      {hasAlerts && (
        <div className={styles.list}>
          {birthdays.map(({ client, daysUntil }) => (
            <button key={client.id} type="button" className={styles.row} onClick={() => navigate(`/clientes/${client.id}`)}>
              <span className={styles.iconWrap} style={{ background: 'var(--color-rose-light)', color: 'var(--color-rose-dark)' }}>
                <Icon name="gift" size={16} />
              </span>
              <div className={styles.text}>
                <div className={styles.title}>{fullName(client)} — anniversaire</div>
                <div className={styles.subtitle}>{daysUntil === 0 ? "Aujourd'hui !" : `Dans ${daysUntil} jour${daysUntil > 1 ? 's' : ''}`}</div>
              </div>
              <Icon name="chevron-right" size={16} />
            </button>
          ))}
          {lowStock.map((product) => (
            <button key={product.id} type="button" className={styles.row} onClick={() => navigate('/stock')}>
              <span className={`${styles.iconWrap} danger`}>
                <Icon name="package" size={16} />
              </span>
              <div className={styles.text}>
                <div className={styles.title}>{product.name}</div>
                <div className={styles.subtitle}>Stock faible : {product.stock} / {product.stockMin} {product.unit}</div>
              </div>
              <Icon name="chevron-right" size={16} />
            </button>
          ))}
          {pendingAppointments.map((apt) => (
            <button key={apt.id} type="button" className={styles.row} onClick={() => navigate('/agenda')}>
              <span className={styles.iconWrap}>
                <Icon name="clock" size={16} />
              </span>
              <div className={styles.text}>
                <div className={styles.title}>{apt.client ? fullName(apt.client) : 'Cliente'} — en attente</div>
                <div className={styles.subtitle}>{apt.service?.name} · {apt.date} à {apt.time}</div>
              </div>
              <Icon name="chevron-right" size={16} />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
