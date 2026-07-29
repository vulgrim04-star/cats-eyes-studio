import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import Icon from '../common/Icon';
import EmptyState from '../common/EmptyState';
import LashMapCanvas from './LashMapCanvas';
import { useClients } from '../../hooks/useClients';
import { NEW_MAP_ID } from '../../hooks/useLashMapEditor';
import { getEye, lengthRange, normalizeLashMap } from '../../utils/lashModel';
import { estimateNextRetouchDate } from '../../utils/lashCycle';
import { formatDateLong } from '../../utils/date';
import styles from './styles/LashMap.module.css';

/** Onglet « Lash Map » de la fiche cliente : la liste des séances.
 *  L'édition, elle, se fait sur sa propre page — le schéma a besoin de toute la largeur.
 */
export default function LashMapTab({ client }) {
  const navigate = useNavigate();
  const { removeLashMap } = useClients();

  const maps = useMemo(
    () =>
      [...(client.lashMaps ?? [])]
        .sort((a, b) => String(b.date).localeCompare(String(a.date)))
        .map((map) => ({ raw: map, normalized: normalizeLashMap(map) })),
    [client.lashMaps]
  );

  const open = (mapId) => navigate(`/clientes/${client.id}/lash-map/${mapId}`);

  const handleDelete = (mapId) => {
    if (window.confirm('Supprimer cette Lash Map ?')) removeLashMap(client.id, mapId);
  };

  return (
    <>
      <div className={styles.tabHeader}>
        <button type="button" className="btn btn-primary btn-sm" onClick={() => open(NEW_MAP_ID)}>
          <Icon name="plus" size={14} /> Nouvelle Lash Map
        </button>
      </div>

      {maps.length === 0 ? (
        <EmptyState
          icon="sparkles"
          title="Aucune Lash Map"
          subtitle="Créez une fiche à chaque séance : le schéma, les longueurs par secteur et les notes restent d'une pose à l'autre."
        />
      ) : (
        maps.map(({ raw, normalized }) => {
          const right = getEye(normalized, 'right');
          const suggested = estimateNextRetouchDate(normalized.date, normalized.fillCycle);
          return (
            <article key={raw.id} className={styles.mapCard}>
              <div className={styles.mapCardEyes}>
                <LashMapCanvas map={normalized} side="right" compact readOnly />
                <LashMapCanvas map={normalized} side="left" compact readOnly />
              </div>

              <div className={styles.mapCardBody}>
                <div className={styles.mapCardHead}>
                  <div>
                    <h3 className={styles.mapCardTitle}>{normalized.poseType}</h3>
                    <span className={styles.sectionMeta}>{formatDateLong(normalized.date)}</span>
                  </div>
                  <div className={styles.mapCardActions}>
                    <button type="button" className="btn btn-secondary btn-sm" onClick={() => open(raw.id)}>
                      <Icon name="edit" size={13} /> Ouvrir
                    </button>
                    <button
                      type="button"
                      className={styles.iconBtn}
                      onClick={() => handleDelete(raw.id)}
                      aria-label="Supprimer cette Lash Map"
                    >
                      <Icon name="trash" size={14} />
                    </button>
                  </div>
                </div>

                <dl className={styles.mapCardSpecs}>
                  <div><dt>Technique</dt><dd>{right.global.style}</dd></div>
                  <div><dt>Courbure</dt><dd>{right.global.curl}</dd></div>
                  <div><dt>Épaisseur</dt><dd>{right.global.diameter} mm</dd></div>
                  <div><dt>Densité</dt><dd>{right.global.density}</dd></div>
                  <div><dt>Longueurs</dt><dd>{lengthRange(right)}</dd></div>
                  <div><dt>Secteurs</dt><dd>{right.zones.length}</dd></div>
                </dl>

                {suggested && (
                  <p className={styles.sectionMeta}>
                    Prochaine retouche suggérée : <strong>{formatDateLong(suggested)}</strong>
                  </p>
                )}

                {normalized.notes && <p className={styles.mapCardNotes}>{normalized.notes}</p>}
              </div>
            </article>
          );
        })
      )}
    </>
  );
}
