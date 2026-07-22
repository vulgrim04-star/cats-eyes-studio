import { useState } from 'react';
import Modal from '../common/Modal';
import Icon from '../common/Icon';
import EmptyState from '../common/EmptyState';
import { useClients } from '../../hooks/useClients';
import { useToast } from '../../hooks/useToast';
import { fileToResizedDataUrl } from '../../utils/image';
import { formatDateShort } from '../../utils/date';
import styles from './PhotosTab.module.css';

function PhotoSlot({ label, url, onFile, styleClass }) {
  const inputId = `photo-input-${label}`;
  return (
    <label htmlFor={inputId} className={styles.uploadSlot}>
      {url ? (
        <img src={url} alt={label} className={styles.uploadPreview} />
      ) : (
        <span className={`${styles.placeholder} ${styleClass}`} style={{ aspectRatio: 'auto', height: '100%' }}>
          <Icon name="camera" size={18} /> {label}
        </span>
      )}
      <input
        id={inputId}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onFile(file);
          e.target.value = '';
        }}
      />
    </label>
  );
}

export default function PhotosTab({ client }) {
  const { addPhotoSession } = useClients();
  const { showToast } = useToast();
  const [modalOpen, setModalOpen] = useState(false);
  const [label, setLabel] = useState('');
  const [beforeUrl, setBeforeUrl] = useState('');
  const [afterUrl, setAfterUrl] = useState('');

  const handleFile = async (file, setter) => {
    try {
      const dataUrl = await fileToResizedDataUrl(file);
      setter(dataUrl);
    } catch {
      showToast("Impossible de lire cette image", 'error');
    }
  };

  const resetModal = () => {
    setLabel('');
    setBeforeUrl('');
    setAfterUrl('');
    setModalOpen(false);
  };

  const handleAdd = (e) => {
    e.preventDefault();
    if (!label.trim()) return;
    try {
      addPhotoSession(client.id, { label, beforeUrl, afterUrl });
      resetModal();
    } catch {
      showToast('Stockage local plein : supprimez des photos ou réduisez leur taille', 'error');
    }
  };

  return (
    <>
      {client.photos.length === 0 ? (
        <EmptyState icon="camera" title="Aucune photo" subtitle="Ajoutez une session pour suivre l'évolution avant/après de cette cliente." />
      ) : null}

      <div className={styles.grid}>
        {client.photos.map((photo) => (
          <div key={photo.id} className={styles.session}>
            <div className={styles.pair}>
              {photo.beforeUrl ? (
                <img src={photo.beforeUrl} alt="Avant" className={styles.photoImg} />
              ) : (
                <span className={`${styles.placeholder} ${styles.before}`}>Avant</span>
              )}
              {photo.afterUrl ? (
                <img src={photo.afterUrl} alt="Après" className={styles.photoImg} />
              ) : (
                <span className={`${styles.placeholder} ${styles.after}`}>Après</span>
              )}
            </div>
            <div className={styles.meta}>
              <div className={styles.label}>{photo.label}</div>
              <div className={styles.date}>{formatDateShort(photo.sessionDate)}</div>
            </div>
          </div>
        ))}

        <button type="button" className={styles.addCard} onClick={() => setModalOpen(true)}>
          <Icon name="camera" size={22} />
          Ajouter une session
        </button>
      </div>

      <Modal
        open={modalOpen}
        onClose={resetModal}
        title="Nouvelle session photo"
        footer={
          <>
            <button type="button" className="btn btn-ghost" onClick={resetModal}>Annuler</button>
            <button type="submit" form="photo-form" className="btn btn-primary">Ajouter</button>
          </>
        }
      >
        <form id="photo-form" onSubmit={handleAdd}>
          <div className="field-group">
            <label className="field-label" htmlFor="photo-label">Description de la session</label>
            <input id="photo-label" className="input-field" value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Ex : Volume russe 3D" autoFocus />
          </div>

          <div className="field-group" style={{ marginBottom: 0 }}>
            <label className="field-label">Photos (cliquez pour choisir un fichier)</label>
            <div className={styles.uploadPair}>
              <PhotoSlot label="Avant" url={beforeUrl} onFile={(f) => handleFile(f, setBeforeUrl)} styleClass={styles.before} />
              <PhotoSlot label="Après" url={afterUrl} onFile={(f) => handleFile(f, setAfterUrl)} styleClass={styles.after} />
            </div>
            <p style={{ fontSize: '0.74rem', color: 'var(--color-text-muted)', marginTop: 8 }}>
              Les photos sont redimensionnées et stockées localement dans le navigateur.
            </p>
          </div>
        </form>
      </Modal>
    </>
  );
}
