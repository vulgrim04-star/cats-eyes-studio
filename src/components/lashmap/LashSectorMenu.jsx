import { useEffect, useRef } from 'react';
import { VIEWBOX } from '../../utils/lashGeometry';
import { QUICK_LENGTHS } from '../../utils/lashModel';
import styles from './styles/LashMap.module.css';

/** Menu contextuel de longueur, ouvert au double-clic sur un secteur.
 *
 * Ancré sous le point de base du secteur — c'est-à-dire sur la frange, pas sur le
 * secteur lui-même : on doit continuer à voir ce qu'on est en train de régler. Position
 * bornée pour qu'il ne sorte jamais du cadre sur téléphone.
 */
export default function LashSectorMenu({ sector, currentLength, onPick, onClose }) {
  const ref = useRef(null);

  useEffect(() => {
    const onPointerDown = (event) => {
      if (!ref.current?.contains(event.target)) onClose();
    };
    const onKeyDown = (event) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [onClose]);

  const left = Math.min(86, Math.max(14, (sector.basePoint.x / VIEWBOX.width) * 100));
  const top = (sector.basePoint.y / VIEWBOX.height) * 100;

  return (
    <div
      ref={ref}
      className={styles.sectorMenu}
      style={{ left: `${left}%`, top: `${top}%`, transform: 'translate(-50%, 8px)' }}
      role="dialog"
      aria-label={`Longueur du secteur ${sector.index + 1}`}
    >
      <span className={styles.sectorMenuTitle}>Secteur {sector.index + 1} · longueur</span>
      <div className={styles.sectorMenuGrid}>
        {QUICK_LENGTHS.map((value) => (
          <button
            key={value}
            type="button"
            className={`${styles.sectorMenuItem} ${currentLength === value ? styles.sectorMenuItemActive : ''}`}
            onClick={() => { onPick(value); onClose(); }}
          >
            {value}
          </button>
        ))}
      </div>
    </div>
  );
}
