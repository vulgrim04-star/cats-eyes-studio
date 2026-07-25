import { useState } from 'react';
import Modal from '../common/Modal';
import Icon from '../common/Icon';
import EmptyState from '../common/EmptyState';
import StoredImage from '../common/StoredImage';
import PhotoLightbox from './PhotoLightbox';
import { useClients } from '../../hooks/useClients';
import { useToast } from '../../hooks/useToast';
import { uploadClientPhoto, deleteStoredPhotos } from '../../utils/photoStorage';
import { formatDateShort } from '../../utils/date';
import styles from './PhotosTab.module.css';

// Identifiant de séance généré côté client pour pouvoir téléverser les fichiers AVANT
// d'enregistrer la séance : le chemin de stockage a besoin d'un id stable.
function newPhotoId() {
  return crypto.randomUUID();
}

function PhotoSlot({ label, previewUrl, uploading, onFile, styleClass }) {
  const inputId = `photo-input-${label}`;
  return (
    <label htmlFor={inputId} className={styles.uploadSlot}>
      {uploading ? (
        <span className={`${styles.placeholder} ${styleClass}`} style={{ aspectRatio: 'auto', height: '100%' }}>
          Envoi…
        </span>
      ) : previewUrl ? (
        <img src={previewUrl} alt={label} className={styles.uploadPreview} />
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
  const { addPhotoSession, updatePhotoSession, removePhotoSession } = useClients();
  const { showToast } = useToast();
  const [modalOpen, setModalOpen] = useState(false);
  const [photoId, setPhotoId] = useState(newPhotoId);
  const [label, setLabel] = useState('');
  const [paths, setPaths] = useState({ beforePath: '', afterPath: '' });
  const [previews, setPreviews] = useState({ beforePath: '', afterPath: '' });
  const [uploading, setUploading] = useState({ beforePath: false, afterPath: false });
  const [viewingPhoto, setViewingPhoto] = useState(null);

  const handleFile = async (file, key) => {
    const side = key === 'beforePath' ? 'before' : 'after';
    setUploading((u) => ({ ...u, [key]: true }));
    // Aperçu local immédiat : l'utilisatrice voit sa photo sans attendre le réseau.
    const localPreview = URL.createObjectURL(file);
    const path = await uploadClientPhoto(file, { clientId: client.id, photoId, side });
    setUploading((u) => ({ ...u, [key]: false }));
    if (!path) {
      URL.revokeObjectURL(localPreview);
      showToast("L'envoi de la photo a échoué. Vérifie ta connexion et réessaie.", 'error');
      return;
    }
    setPaths((p) => ({ ...p, [key]: path }));
    setPreviews((p) => {
      if (p[key]) URL.revokeObjectURL(p[key]);
      return { ...p, [key]: localPreview };
    });
  };

  const resetModal = () => {
    Object.values(previews).forEach((url) => url && URL.revokeObjectURL(url));
    setLabel('');
    setPaths({ beforePath: '', afterPath: '' });
    setPreviews({ beforePath: '', afterPath: '' });
    setPhotoId(newPhotoId());
    setModalOpen(false);
  };

  const handleAdd = (e) => {
    e.preventDefault();
    if (!label.trim()) return;
    addPhotoSession(client.id, {
      id: photoId,
      label,
      beforePath: paths.beforePath || '',
      afterPath: paths.afterPath || '',
    });
    resetModal();
  };

  const handleReplace = async (file, key) => {
    if (!viewingPhoto) return;
    const side = key === 'beforePath' ? 'before' : 'after';
    const path = await uploadClientPhoto(file, { clientId: client.id, photoId: viewingPhoto.id, side });
    if (!path) {
      showToast("L'envoi de la photo a échoué. Vérifie ta connexion et réessaie.", 'error');
      return;
    }
    // On efface aussi l'éventuelle data URL héritée, sinon elle continuerait d'alourdir
    // la fiche et de masquer la nouvelle photo à l'affichage.
    const legacyKey = key === 'beforePath' ? 'beforeUrl' : 'afterUrl';
    updatePhotoSession(client.id, viewingPhoto.id, { [key]: path, [legacyKey]: '' });
    setViewingPhoto((p) => ({ ...p, [key]: path, [legacyKey]: '' }));
  };

  const handleDeleteSession = async () => {
    if (!viewingPhoto) return;
    if (!window.confirm('Supprimer cette session photo ?')) return;
    await deleteStoredPhotos([viewingPhoto.beforePath, viewingPhoto.afterPath]);
    removePhotoSession(client.id, viewingPhoto.id);
    setViewingPhoto(null);
  };

  return (
    <>
      {client.photos.length === 0 ? (
        <EmptyState icon="camera" title="Aucune photo" subtitle="Ajoutez une session pour suivre l'évolution avant/après de cette cliente." />
      ) : null}

      <div className={styles.grid}>
        {client.photos.map((photo) => (
          <button key={photo.id} type="button" className={styles.session} onClick={() => setViewingPhoto(photo)}>
            <div className={styles.pair}>
              <StoredImage
                path={photo.beforePath}
                legacyUrl={photo.beforeUrl}
                alt="Avant"
                className={styles.photoImg}
                placeholder={<span className={`${styles.placeholder} ${styles.before}`}>Avant</span>}
              />
              <StoredImage
                path={photo.afterPath}
                legacyUrl={photo.afterUrl}
                alt="Après"
                className={styles.photoImg}
                placeholder={<span className={`${styles.placeholder} ${styles.after}`}>Après</span>}
              />
            </div>
            <div className={styles.meta}>
              <div className={styles.label}>{photo.label}</div>
              <div className={styles.date}>{formatDateShort(photo.sessionDate)}</div>
            </div>
          </button>
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
            <button
              type="submit"
              form="photo-form"
              className="btn btn-primary"
              disabled={uploading.beforePath || uploading.afterPath}
            >
              Ajouter
            </button>
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
              <PhotoSlot
                label="Avant"
                previewUrl={previews.beforePath}
                uploading={uploading.beforePath}
                onFile={(f) => handleFile(f, 'beforePath')}
                styleClass={styles.before}
              />
              <PhotoSlot
                label="Après"
                previewUrl={previews.afterPath}
                uploading={uploading.afterPath}
                onFile={(f) => handleFile(f, 'afterPath')}
                styleClass={styles.after}
              />
            </div>
            <p style={{ fontSize: '0.74rem', color: 'var(--color-text-muted)', marginTop: 8 }}>
              Les photos sont redimensionnées puis stockées de façon privée sur votre espace cloud.
            </p>
          </div>
        </form>
      </Modal>

      <PhotoLightbox
        photo={viewingPhoto}
        onClose={() => setViewingPhoto(null)}
        onReplaceBefore={(file) => handleReplace(file, 'beforePath')}
        onReplaceAfter={(file) => handleReplace(file, 'afterPath')}
        onDelete={handleDeleteSession}
      />
    </>
  );
}
