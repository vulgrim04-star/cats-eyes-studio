import { useToast } from '../../hooks/useToast';
import Icon from './Icon';
import styles from './ToastContainer.module.css';

const ICONS = { success: 'check-circle', error: 'alert-triangle', warning: 'alert-triangle' };

export default function ToastContainer() {
  const { toasts, dismissToast } = useToast();

  if (toasts.length === 0) return null;

  return (
    <div className={styles.container}>
      {toasts.map((toast) => (
        <div key={toast.id} className={`${styles.toast} ${styles[toast.type] ?? ''}`}>
          <span className={styles.iconWrap}>
            <Icon name={ICONS[toast.type] ?? 'check-circle'} size={16} />
          </span>
          <span style={{ flex: 1 }}>{toast.message}</span>
          <button type="button" className={styles.closeBtn} onClick={() => dismissToast(toast.id)} aria-label="Fermer">
            <Icon name="x" size={14} />
          </button>
        </div>
      ))}
    </div>
  );
}
