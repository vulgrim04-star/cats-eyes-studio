import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import Icon from './Icon';
import styles from './Modal.module.css';

export default function Modal({ open, onClose, title, children, footer, maxWidth }) {
  useEffect(() => {
    if (!open) return undefined;
    const onKeyDown = (e) => {
      if (e.key === 'Escape') onClose?.();
    };
    document.addEventListener('keydown', onKeyDown);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div className={styles.overlay} onMouseDown={(e) => e.target === e.currentTarget && onClose?.()}>
      <div className={styles.panel} style={maxWidth ? { maxWidth } : undefined}>
        <div className={styles.header}>
          <h3 className={styles.title}>{title}</h3>
          <button type="button" className={styles.closeBtn} onClick={onClose} aria-label="Fermer">
            <Icon name="x" size={18} />
          </button>
        </div>
        <div className={styles.body}>{children}</div>
        {footer && <div className={styles.footer}>{footer}</div>}
      </div>
    </div>,
    document.body
  );
}
