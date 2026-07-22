import Icon from '../common/Icon';
import { formatDuration, formatPrice } from '../../utils/format';
import styles from './ServiceRow.module.css';

export default function ServiceRow({ service, onEdit, onDelete }) {
  return (
    <div className={styles.row}>
      <span className={styles.name}>{service.name}</span>
      <span className={styles.meta}>
        <Icon name="clock" size={13} /> {formatDuration(service.duration)}
      </span>
      <span className={styles.price}>{formatPrice(service.price)}</span>
      <div className={styles.actions}>
        <button type="button" className={styles.iconBtn} onClick={() => onEdit(service)} aria-label="Modifier">
          <Icon name="edit" size={14} />
        </button>
        <button type="button" className={styles.iconBtn} onClick={() => onDelete(service)} aria-label="Supprimer">
          <Icon name="trash" size={14} />
        </button>
      </div>
    </div>
  );
}
