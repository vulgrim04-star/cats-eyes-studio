import { useMemo } from 'react';
import Icon from '../common/Icon';
import StoredImage from '../common/StoredImage';
import BrowCanvas from './BrowCanvas';
import { lookSummary, normalizeLook, shapeById, toneById } from '../../utils/browShapes';
import { formatDateLong } from '../../utils/date';
import styles from './styles/BrowStudio.module.css';

/** Ce qui a changé d'une séance à la suivante.
 *
 *  Comparé au PRÉCÉDENT et non au premier : c'est l'évolution pas à pas qui intéresse, et
 *  c'est ce qu'on explique à la cliente — « la dernière fois on avait ouvert l'arche, cette
 *  fois on remonte la queue ».
 */
function changesBetween(current, previous) {
  if (!previous) return ['Première séance enregistrée'];
  const a = normalizeLook(current);
  const b = normalizeLook(previous);
  const changes = [];
  if (a.shapeId !== b.shapeId) changes.push(`${shapeById(b.shapeId).label} → ${shapeById(a.shapeId).label}`);
  if (a.toneId !== b.toneId) changes.push(`teinte ${toneById(b.toneId).label} → ${toneById(a.toneId).label}`);
  if (a.effectId !== b.effectId) changes.push('effet modifié');
  const shifted = ['archHeight', 'thickness', 'length', 'angle']
    .filter((field) => Math.abs(a[field] - b[field]) >= 5);
  if (shifted.length > 0) changes.push(`${shifted.length} réglage${shifted.length > 1 ? 's' : ''} ajusté${shifted.length > 1 ? 's' : ''}`);
  return changes.length > 0 ? changes : ['Reconduit à l’identique'];
}

/** Vignettes allégées : la frise en aligne autant qu'il y a de séances. Voir
 *  `BrowShapeCard` — à cette taille, la silhouette est tout ce qui se lit. */
const THUMB_HAIRS = 130;

/** Frise d'évolution des sourcils.
 *
 *  Chaque séance est représentée par son PROPRE dessin, reconstruit depuis le look
 *  enregistré : on revoit ce qui a été posé, pas une vignette générique. C'est tout
 *  l'intérêt d'avoir gardé le look complet avec la séance.
 *
 *  Elle vit à l'intérieur de la carte Historique et n'a donc plus son propre cadre : deux
 *  surfaces imbriquées feraient un cadre dans un cadre.
 */
export default function BrowTimeline({ sessions, onOpen }) {
  const entries = useMemo(
    () => [...(sessions ?? [])].sort((a, b) => String(a.date).localeCompare(String(b.date))),
    [sessions]
  );

  if (entries.length === 0) return null;

  return (
    <div className={styles.timeline}>
      <span className={styles.label}>
        <Icon name="trending-up" size={14} /> Évolution
      </span>

      <div className={`${styles.timelineTrack} scrollbar-hidden`}>
        {entries.map((entry, index) => {
          const look = normalizeLook(entry.look);
          const changes = changesBetween(entry.look, entries[index - 1]?.look);
          return (
            <button
              key={entry.id}
              type="button"
              className={styles.timelineCard}
              onClick={() => onOpen?.(entry)}
              title={lookSummary(look)}
            >
              {/* La vraie photo quand la séance en a une, le dessin reconstruit sinon.
                  Le repli n'est pas une politesse : les séances enregistrées avant que
                  les photos existent deviendraient des cases vides. */}
              {entry.photoAfterPath ? (
                <StoredImage
                  path={entry.photoAfterPath}
                  alt={`Rendu du ${formatDateLong(entry.date)}`}
                  className={styles.timelinePhoto}
                  placeholder={<BrowCanvas look={look} readOnly hairCount={THUMB_HAIRS} />}
                />
              ) : (
                <BrowCanvas look={look} readOnly hairCount={THUMB_HAIRS} />
              )}
              <span className={styles.timelineDate}>{formatDateLong(entry.date)}</span>
              <span className={styles.timelineChange}>{changes.join(' · ')}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
