import { useMemo } from 'react';
import LashMapCanvas from './LashMapCanvas';
import { getEye, lengthRange, normalizeLashMap } from '../../utils/lashModel';
import { formatDateLong } from '../../utils/date';
import styles from './styles/LashMap.module.css';

/** Frise chronologique des séances : la forme du mapping se lit d'un coup d'œil, et
 *  un clic ouvre la fiche correspondante. */
export default function LashTimeline({ maps, currentId, onOpen }) {
  const entries = useMemo(() => maps.map((map) => normalizeLashMap(map)), [maps]);
  if (entries.length === 0) return null;

  return (
    <section className={styles.section}>
      <header className={styles.sectionHeader}>
        <h2 className={styles.sectionTitle}>Historique</h2>
        <span className={styles.sectionMeta}>{entries.length} séance{entries.length > 1 ? 's' : ''} enregistrée{entries.length > 1 ? 's' : ''}</span>
      </header>

      <div className={styles.timeline}>
        {entries.map((map, index) => (
          <button
            key={map.id ?? index}
            type="button"
            className={`${styles.timelineCard} ${map.id === currentId ? styles.timelineCardActive : ''}`}
            onClick={() => onOpen(map)}
          >
            <span className={styles.timelineDate}>{formatDateLong(map.date)}</span>
            <LashMapCanvas map={map} side="right" compact readOnly />
            <span className={styles.timelineMeta}>
              {map.poseType} · {lengthRange(getEye(map, 'right'))}
            </span>
            <span className={styles.timelineMeta}>
              {getEye(map, 'right').global.style} · {getEye(map, 'right').global.curl} · {getEye(map, 'right').global.diameter} mm
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}
