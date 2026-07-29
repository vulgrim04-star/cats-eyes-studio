import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Icon from '../common/Icon';
import EmptyState from '../common/EmptyState';
import LashMapModal from './LashMapModal';
import LashDiagram from './LashDiagram';
import { useClients } from '../../hooks/useClients';
import { formatDateLong } from '../../utils/date';
import { estimateNextRetouchDate } from '../../utils/lashCycle';
import { diffMaps } from '../../utils/lashCalculations';
import styles from './styles/LashMap.module.css';

const noop = () => {};

/** Écarts avec la séance qui précède immédiatement, affichés sur la fiche. */
function ChangesFromPrevious({ map, previous }) {
  const { changes } = useMemo(() => diffMaps(map, previous), [map, previous]);
  if (!previous || changes.length === 0) return null;

  return (
    <div className={styles.cardChanges}>
      <span className={styles.cardChangesLabel}>Depuis le {formatDateLong(previous.date)}</span>
      <div className={styles.cardChangesList}>
        {changes.slice(0, 4).map((change) => (
          <span key={change.key} className={styles.changeChip}>
            {change.label} : {change.from} → {change.to}
          </span>
        ))}
      </div>
    </div>
  );
}

export default function LashMapTab({ client }) {
  const navigate = useNavigate();
  const { removeLashMap } = useClients();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingMap, setEditingMap] = useState(null);

  const maps = useMemo(
    () => [...(client.lashMaps ?? [])].sort((a, b) => String(b.date).localeCompare(String(a.date))),
    [client.lashMaps]
  );

  const handleDelete = (mapId) => {
    if (window.confirm('Supprimer cette Lash Map ?')) {
      removeLashMap(client.id, mapId);
    }
  };

  const handleNewClick = () => {
    setEditingMap(null);
    setModalOpen(true);
  };

  const handleEditClick = (map) => {
    setEditingMap(map);
    setModalOpen(true);
  };

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 'var(--space-4)' }}>
        <button type="button" className="btn btn-primary btn-sm" onClick={handleNewClick}>
          <Icon name="plus" size={14} /> Nouvelle Lash Map
        </button>
      </div>

      {maps.length === 0 ? (
        <EmptyState
          icon="sparkles"
          title="Aucune Lash Map"
          subtitle="Créez une fiche technique à chaque séance pour suivre la forme, le style et les longueurs posées."
        />
      ) : (
        maps.map((map, index) => (
          <div key={map.id} className={styles.card}>
            <div className={styles.cardHeader}>
              <div>
                <div className={styles.cardTitle}>{map.poseType || 'Séance'}</div>
                <div className={styles.cardDate}>{formatDateLong(map.date)}</div>
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                <button type="button" className={styles.deleteBtn} onClick={() => handleEditClick(map)} aria-label="Modifier">
                  <Icon name="edit" size={14} />
                </button>
                <button type="button" className={styles.deleteBtn} onClick={() => handleDelete(map.id)} aria-label="Supprimer">
                  <Icon name="trash" size={14} />
                </button>
              </div>
            </div>

            <div className={styles.tagRow}>
              {(map.styles ?? []).map((style) => (
                <span key={style} className={styles.tag}>{style}</span>
              ))}
              {(map.effects ?? []).map((effect) => (
                <span key={effect} className={styles.tag}>{effect}</span>
              ))}
              {map.setShape && <span className={styles.tagNeutral}>{map.setShape}</span>}
            </div>

            {(() => {
              const suggested = estimateNextRetouchDate(map.date, map.fillCycle);
              if (!suggested) return null;
              return (
                <div className={styles.retouchHint}>
                  <span>Prochaine retouche suggérée : <strong>{formatDateLong(suggested)}</strong></span>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => navigate('/agenda', { state: { openNew: true, clientId: client.id, date: suggested } })}
                  >
                    Planifier
                  </button>
                </div>
              );
            })()}

            <div className={styles.specsGrid}>
              <div className={styles.spec}>
                <span className={styles.specLabel}>Forme de l'œil</span>
                <span className={styles.specValue}>{map.eyeShape || '—'}</span>
              </div>
              <div className={styles.spec}>
                <span className={styles.specLabel}>Cils naturels</span>
                <span className={styles.specValue}>{map.lashHealth || '—'}</span>
              </div>
              <div className={styles.spec}>
                <span className={styles.specLabel}>Cycle de retouche</span>
                <span className={styles.specValue}>{map.fillCycle || '—'}</span>
              </div>
              <div className={styles.spec}>
                <span className={styles.specLabel}>Courbure</span>
                <span className={styles.specValue}>{map.curl || '—'}</span>
              </div>
              <div className={styles.spec}>
                <span className={styles.specLabel}>Longueur</span>
                <span className={styles.specValue}>{map.length ? `${map.length}mm` : '—'}</span>
              </div>
              <div className={styles.spec}>
                <span className={styles.specLabel}>Épaisseur</span>
                <span className={styles.specValue}>{map.thickness ? `${map.thickness}mm` : '—'}</span>
              </div>
              <div className={styles.spec}>
                <span className={styles.specLabel}>Type de base</span>
                <span className={styles.specValue}>{map.baseType || '—'}</span>
              </div>
              <div className={styles.spec}>
                <span className={styles.specLabel}>Colle</span>
                <span className={styles.specValue}>{map.adhesive || '—'}</span>
              </div>
              <div className={styles.spec}>
                <span className={styles.specLabel}>Coin interne / externe</span>
                <span className={styles.specValue}>
                  {map.innerCornerLength || map.outerCornerLength
                    ? `${map.innerCornerLength || '—'} / ${map.outerCornerLength || '—'}`
                    : '—'}
                </span>
              </div>
              {map.layers && (map.layers.top || map.layers.mid || map.layers.bottom) && (
                <div className={styles.spec}>
                  <span className={styles.specLabel}>Couches (H / M / B)</span>
                  <span className={styles.specValue}>
                    {map.layers.top || '—'} / {map.layers.mid || '—'} / {map.layers.bottom || '—'}
                  </span>
                </div>
              )}
            </div>

            <div className={styles.diagramsRow}>
              <LashDiagram title="Œil gauche" values={map.zonesLeft ?? []} onChange={noop} readOnly mirrored />
              <LashDiagram title="Œil droit" values={map.zonesRight ?? []} onChange={noop} readOnly />
            </div>

            <ChangesFromPrevious map={map} previous={maps[index + 1]} />

            {map.notes && <div className={styles.notes}>{map.notes}</div>}
          </div>
        ))
      )}

      <LashMapModal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setEditingMap(null); }}
        client={client}
        editingMap={editingMap}
      />
    </>
  );
}
