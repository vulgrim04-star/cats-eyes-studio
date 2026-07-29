import { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Icon from './Icon';
import styles from './BottomSheet.module.css';

/** Distance de glissement au-delà de laquelle la feuille se referme. */
const DISMISS_PX = 90;

/** Feuille glissante par le bas, pour les réglages sur téléphone.
 *
 * Une modale plein écran cacherait le schéma ; ici il reste visible au-dessus, et la
 * feuille se ferme d'un glissement du pouce — la main qui tient le téléphone est déjà
 * en bas de l'écran.
 */
export default function BottomSheet({ open, onClose, title, children }) {
  const titleId = useId();
  const panelRef = useRef(null);
  const dragRef = useRef(null);
  const [offset, setOffset] = useState(0);

  useEffect(() => {
    if (!open) return undefined;
    setOffset(0);
    const onKeyDown = (event) => {
      if (event.key === 'Escape') onClose?.();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  const startDrag = (event) => {
    dragRef.current = { startY: event.clientY };
    event.currentTarget.setPointerCapture?.(event.pointerId);
  };

  const moveDrag = (event) => {
    if (!dragRef.current) return;
    setOffset(Math.max(0, event.clientY - dragRef.current.startY));
  };

  const endDrag = () => {
    if (!dragRef.current) return;
    dragRef.current = null;
    // `onClose` remonte au parent : il doit être appelé depuis le gestionnaire, jamais
    // depuis une fonction de mise à jour d'état — React l'exécute pendant le rendu.
    if (offset > DISMISS_PX) onClose?.();
    setOffset(0);
  };

  return createPortal(
    <div className={styles.overlay} onMouseDown={(e) => e.target === e.currentTarget && onClose?.()}>
      <div
        ref={panelRef}
        className={styles.sheet}
        style={offset ? { transform: `translateY(${offset}px)`, transition: 'none' } : undefined}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <div
          className={styles.grabber}
          onPointerDown={startDrag}
          onPointerMove={moveDrag}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
        >
          <span className={styles.grabberBar} />
        </div>
        <div className={styles.header}>
          <h3 className={styles.title} id={titleId}>{title}</h3>
          <button type="button" className={styles.closeBtn} onClick={onClose} aria-label="Fermer">
            <Icon name="x" size={16} />
          </button>
        </div>
        <div className={styles.body}>{children}</div>
      </div>
    </div>,
    document.body
  );
}
