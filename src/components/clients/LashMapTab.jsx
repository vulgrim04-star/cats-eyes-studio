import { useState } from 'react';
import Icon from '../common/Icon';
import EmptyState from '../common/EmptyState';
import LashMapModal from './LashMapModal';
import LashMapConsentModal from './LashMapConsentModal';
import EyeDiagram from './EyeDiagram';
import { useClients } from '../../hooks/useClients';
import { formatDateLong } from '../../utils/date';
import styles from './LashMap.module.css';

export default function LashMapTab({ client }) {
  const { removeLashMap } = useClients();
  const [modalOpen, setModalOpen] = useState(false);
  const [consentOpen, setConsentOpen] = useState(false);
  const [editingMap, setEditingMap] = useState(null);
  const maps = client.lashMaps ?? [];

  const handleDelete = (mapId) => {
    if (window.confirm('Supprimer cette Lash Map ?')) {
      removeLashMap(client.id, mapId);
    }
  };

  const handleNewClick = () => {
    setEditingMap(null);
    if (client.lashMapConsentSigned) {
      setModalOpen(true);
    } else {
      setConsentOpen(true);
    }
  };

  const handleEditClick = (map) => {
    setEditingMap(map);
    setModalOpen(true);
  };

  return (
    <>
      {!client.lashMapConsentSigned && (
        <div className={styles.consentBanner}>
          <div>
            <div className={styles.consentTitle}>Consentement Lash Map requis</div>
            <div className={styles.consentSubtitle}>
              À faire signer avant la première fiche technique de cette cliente.
            </div>
          </div>
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => setConsentOpen(true)}>
            <Icon name="edit" size={14} /> Faire signer
          </button>
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 'var(--space-4)' }}>
        <button type="button" className="btn btn-primary btn-sm" onClick={handleNewClick}>
          <Icon name="plus" size={14} /> Nouvelle Lash Map
        </button>
      </div>

      {maps.length === 0 ? (
        <EmptyState icon="sparkles" title="Aucune Lash Map" subtitle="Créez une fiche technique à chaque séance pour suivre la forme, le style et les longueurs posées." />
      ) : (
        maps.map((map) => (
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
              {(map.styles ?? []).map((s) => (
                <span key={s} className={styles.tag}>{s}</span>
              ))}
              {map.setShape && <span className={styles.tagNeutral}>{map.setShape}</span>}
            </div>

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
                <span className={styles.specValue}>{map.length || '—'}</span>
              </div>
              <div className={styles.spec}>
                <span className={styles.specLabel}>Épaisseur</span>
                <span className={styles.specValue}>{map.thickness || '—'}</span>
              </div>
            </div>

            <div className={styles.eyesRow}>
              <EyeDiagram title="Œil gauche" zones={map.zonesLeft} readOnly />
              <EyeDiagram title="Œil droit" zones={map.zonesRight} readOnly />
            </div>

            {map.notes && <div className={styles.notes}>{map.notes}</div>}
          </div>
        ))
      )}

      <LashMapModal open={modalOpen} onClose={() => { setModalOpen(false); setEditingMap(null); }} client={client} editingMap={editingMap} />
      <LashMapConsentModal open={consentOpen} onClose={() => setConsentOpen(false)} client={client} />
    </>
  );
}
