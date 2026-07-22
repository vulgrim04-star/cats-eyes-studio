import Icon from './Icon';
import styles from './Fab.module.css';

export default function Fab({ onClick, icon = 'plus', label = 'Ajouter' }) {
  return (
    <button type="button" className={styles.fab} onClick={onClick} aria-label={label} title={label}>
      <Icon name={icon} size={24} strokeWidth={2} />
    </button>
  );
}
