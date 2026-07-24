import { useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import Icon from './Icon';
import styles from './Modal.module.css';

const FOCUSABLE_SELECTOR = 'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])';

export default function Modal({ open, onClose, title, children, footer, maxWidth }) {
  const panelRef = useRef(null);
  const titleId = useId();

  useEffect(() => {
    if (!open) return undefined;

    const panel = panelRef.current;
    const previouslyFocused = document.activeElement;
    const firstFocusable = panel?.querySelector(FOCUSABLE_SELECTOR);
    (firstFocusable ?? panel)?.focus();

    const onKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose?.();
        return;
      }
      if (e.key === 'Tab' && panel) {
        const focusables = panel.querySelectorAll(FOCUSABLE_SELECTOR);
        if (focusables.length === 0) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    document.addEventListener('keydown', onKeyDown);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = '';
      previouslyFocused?.focus?.();
    };
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div className={styles.overlay} onMouseDown={(e) => e.target === e.currentTarget && onClose?.()}>
      <div
        ref={panelRef}
        className={styles.panel}
        style={maxWidth ? { maxWidth } : undefined}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
      >
        <div className={styles.header}>
          <h3 className={styles.title} id={titleId}>{title}</h3>
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
