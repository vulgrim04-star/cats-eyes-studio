import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import Icon from '../common/Icon';
import { fullName } from '../../utils/format';
import styles from './NotificationsPanel.module.css';

export default function NotificationsPanel({ birthdays, lowStock, pendingAppointments, onClose }) {
  const navigate = useNavigate();
  const hasAny = birthdays.length + lowStock.length + pendingAppointments.length > 0;

  const go = (path) => {
    onClose();
    navigate(path);
  };

  return (
    <>
      {createPortal(<div className={styles.backdrop} onClick={onClose} />, document.body)}
      <div className={styles.panel}>
        <div className={styles.title}>Notifications</div>

        {!hasAny && <div className={styles.empty}>Aucune alerte pour le moment.</div>}

        {birthdays.map(({ client, daysUntil }) => (
          <button key={client.id} type="button" className={styles.row} onClick={() => go(`/clientes/${client.id}`)}>
            <span className={`${styles.iconWrap} rose`}>
              <Icon name="gift" size={15} />
            </span>
            <div className={styles.text}>
              <div className={styles.rowTitle}>{fullName(client)} — anniversaire</div>
              <div className={styles.rowSubtitle}>{daysUntil === 0 ? "Aujourd'hui" : `Dans ${daysUntil} jour${daysUntil > 1 ? 's' : ''}`}</div>
            </div>
          </button>
        ))}

        {lowStock.map((product) => (
          <button key={product.id} type="button" className={styles.row} onClick={() => go('/stock')}>
            <span className={`${styles.iconWrap} danger`}>
              <Icon name="package" size={15} />
            </span>
            <div className={styles.text}>
              <div className={styles.rowTitle}>{product.name}</div>
              <div className={styles.rowSubtitle}>Stock faible : {product.stock} / {product.stockMin}</div>
            </div>
          </button>
        ))}

        {pendingAppointments.map((apt) => (
          <button key={apt.id} type="button" className={styles.row} onClick={() => go('/agenda')}>
            <span className={styles.iconWrap}>
              <Icon name="clock" size={15} />
            </span>
            <div className={styles.text}>
              <div className={styles.rowTitle}>{apt.client ? fullName(apt.client) : 'Cliente'} — en attente</div>
              <div className={styles.rowSubtitle}>{apt.service?.name} · {apt.date} à {apt.time}</div>
            </div>
          </button>
        ))}
      </div>
    </>
  );
}
