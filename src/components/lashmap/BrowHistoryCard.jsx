import Icon from '../common/Icon';
import BrowCard from './BrowCard';
import BrowTimeline from './BrowTimeline';
import { lookSummary, normalizeLook, toneById } from '../../utils/browShapes';
import { formatDateLong } from '../../utils/date';
import styles from './styles/BrowStudio.module.css';

/** Historique de la cliente : la frise d'abord, la liste ensuite.
 *
 *  Les deux disent la même chose et c'est voulu. La frise se regarde — on y voit du coin
 *  de l'œil que l'arche est montée de séance en séance. La liste se lit et s'actionne :
 *  c'est elle qui porte la reprise et la suppression.
 */
export default function BrowHistoryCard({ sessions, onOpen, onRemove, embedded = false }) {
  return (
    <BrowCard title="Historique cliente" icon="clock" embedded={embedded}>
      {sessions.length === 0 ? (
        <p className={styles.cardEmpty}>Aucune séance sourcils enregistrée pour cette cliente.</p>
      ) : (
        <>
          <BrowTimeline sessions={sessions} onOpen={onOpen} />

          <div className={styles.historyList}>
            {sessions.map((entry) => (
              <div key={entry.id} className={styles.historyRow}>
                <span
                  className={styles.historyChip}
                  style={{ background: toneById(normalizeLook(entry.look).toneId).hex }}
                  aria-hidden="true"
                />
                <div className={styles.historyMain}>
                  <strong>{formatDateLong(entry.date)}</strong>
                  <span>
                    {entry.summary || lookSummary(entry.look)}
                    {entry.processingMinutes ? ` · ${entry.processingMinutes} min` : ''}
                  </span>
                </div>
                <button
                  type="button"
                  className={styles.iconBtn}
                  onClick={() => onOpen(entry)}
                  aria-label={`Reprendre la séance du ${formatDateLong(entry.date)}`}
                >
                  <Icon name="edit" size={14} />
                </button>
                <button
                  type="button"
                  className={styles.iconBtn}
                  onClick={() => onRemove(entry)}
                  aria-label={`Supprimer la séance du ${formatDateLong(entry.date)}`}
                >
                  <Icon name="trash" size={14} />
                </button>
              </div>
            ))}
          </div>
        </>
      )}
    </BrowCard>
  );
}
