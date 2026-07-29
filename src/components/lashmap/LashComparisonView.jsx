import { useMemo } from 'react';
import LashDiagram from './LashDiagram';
import Icon from '../common/Icon';
import { diffMaps } from '../../utils/lashCalculations';
import { formatDateLong } from '../../utils/date';
import styles from './styles/LashMap.module.css';

const MAX_TIMELINE = 6;

function formatDelta(delta) {
  if (delta === null || delta === 0) return null;
  return `${delta > 0 ? '+' : '−'}${Math.abs(delta)} mm`;
}

/** Frise des séances précédentes + écarts avec la fiche en cours.
 *  Répond à la question posée à chaque retouche : « qu'est-ce qui change par rapport
 *  à la dernière fois ? ».
 */
export default function LashComparisonView({ currentMap, previousMaps = [], onDuplicate }) {
  const timeline = useMemo(() => previousMaps.slice(0, MAX_TIMELINE), [previousMaps]);
  const reference = timeline[0] ?? null;
  const { changes } = useMemo(() => diffMaps(currentMap, reference), [currentMap, reference]);

  if (timeline.length === 0) return null;

  return (
    <section className={styles.comparison}>
      <header className={styles.comparisonHeader}>
        <h4 className={styles.comparisonTitle}>Séances précédentes</h4>
        {reference && (
          <span className={styles.comparisonMeta}>
            Comparé au {formatDateLong(reference.date)}
          </span>
        )}
      </header>

      <div className={`${styles.timeline} scrollbar-hidden`}>
        {timeline.map((map) => (
          <article key={map.id} className={styles.timelineCard}>
            <div className={styles.timelineDate}>{formatDateLong(map.date)}</div>
            <div className={styles.timelineDiagram}>
              <LashDiagram values={map.zonesLeft ?? []} onChange={() => {}} readOnly mirrored compact />
              <LashDiagram values={map.zonesRight ?? []} onChange={() => {}} readOnly compact />
            </div>
            <div className={styles.timelineSpecs}>
              {map.curl && <span className={styles.tag}>{map.curl}</span>}
              {map.length && <span className={styles.tagNeutral}>{map.length}mm</span>}
              {map.thickness && <span className={styles.tagNeutral}>{map.thickness}mm</span>}
            </div>
            {onDuplicate && (
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => onDuplicate(map)}>
                <Icon name="clipboard" size={13} /> Reprendre
              </button>
            )}
          </article>
        ))}
      </div>

      {changes.length > 0 && (
        <ul className={styles.diffList}>
          {changes.map((change) => (
            <li key={change.key} className={styles.diffItem}>
              <span className={styles.diffLabel}>{change.label}</span>
              <span className={styles.diffValue}>
                {change.from} → <strong>{change.to}</strong>
                {formatDelta(change.delta) && (
                  <em className={change.delta > 0 ? styles.diffUp : styles.diffDown}>
                    {' '}({formatDelta(change.delta)})
                  </em>
                )}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
