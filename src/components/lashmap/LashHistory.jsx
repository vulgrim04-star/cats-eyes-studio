import { SIDE_LABEL } from '../../utils/lashModel';
import { formatMm } from '../../utils/lashCalculations';
import { formatDateLong } from '../../utils/date';
import styles from './styles/LashMap.module.css';

function signed(delta) {
  return `${delta > 0 ? '+' : '−'}${formatMm(Math.abs(delta))} mm`;
}

/** Comparaison avec une séance passée.
 *
 * Choisir une séance surligne en doré, DANS LE SCHÉMA, les secteurs dont la longueur a
 * changé — le tableau ci-dessous ne fait que chiffrer ce que l'œil a déjà vu.
 */
export default function LashHistory({ previousMaps, comparedId, onCompare, diff }) {
  if (previousMaps.length === 0) return null;

  return (
    <>
      <p className={styles.sectionMeta}>
        {comparedId ? 'Les secteurs modifiés sont surlignés sur le schéma' : 'Choisissez une séance de référence'}
      </p>

      <div className={styles.compareRow}>
        <button
          type="button"
          className={`btn btn-sm ${comparedId ? 'btn-ghost' : 'btn-secondary'}`}
          onClick={() => onCompare(null)}
        >
          Aucune
        </button>
        {previousMaps.slice(0, 6).map((map) => (
          <button
            key={map.id}
            type="button"
            className={`btn btn-sm ${comparedId === map.id ? 'btn-secondary' : 'btn-ghost'}`}
            onClick={() => onCompare(map.id)}
          >
            {formatDateLong(map.date)}
          </button>
        ))}
      </div>

      {diff && (
        <ul className={styles.diffList}>
          {diff.globals.map((change) => (
            <li className={styles.diffItem} key={`${change.side}-${change.field}`}>
              <span className={styles.diffLabel}>{SIDE_LABEL[change.side]} · {change.label}</span>
              <span className={styles.diffValue}>{change.from} → <strong>{change.to}</strong></span>
            </li>
          ))}

          {['left', 'right'].map((side) => {
            const changes = diff.sectors[side];
            if (changes.length === 0) return null;
            return (
              <li className={styles.diffItem} key={side}>
                <span className={styles.diffLabel}>{SIDE_LABEL[side]} · longueurs</span>
                <span className={styles.diffValue}>
                  {changes
                    .slice(0, 4)
                    .map((change) => `secteur ${change.index + 1} : ${formatMm(change.from)} → ${formatMm(change.to)}`)
                    .join(' · ')}
                  {changes.length > 4 && ` et ${changes.length - 4} autre(s)`}
                  {diff.averages[side] !== null && diff.averages[side] !== 0 && (
                    <em className={styles.diffUp}> ({signed(diff.averages[side])} en moyenne)</em>
                  )}
                </span>
              </li>
            );
          })}

          {diff.globals.length === 0 && diff.sectors.left.length === 0 && diff.sectors.right.length === 0 && (
            <li className={styles.diffItem}>
              <span className={styles.diffLabel}>Aucun écart</span>
              <span className={styles.diffValue}>Cette séance reprend exactement la précédente</span>
            </li>
          )}
        </ul>
      )}
    </>
  );
}
