import Modal from '../common/Modal';
import Icon from '../common/Icon';
import { formatDateLong } from '../../utils/date';
import styles from './PhotoLightbox.module.css';

function Slot({ label, url, styleClass, onReplace, inputId }) {
  return (
    <div className={styles.slot}>
      <span className={styles.slotLabel}>{label}</span>
      <div className={styles.imgWrap}>
        {url ? (
          <img src={url} alt={label} className={styles.img} />
        ) : (
          <span className={`${styles.placeholder} ${styleClass}`}>{label}</span>
        )}
      </div>
      <label htmlFor={inputId} className="btn btn-secondary btn-sm" style={{ justifyContent: 'center', cursor: 'pointer' }}>
        <Icon name="camera" size={13} /> Remplacer
        <input
          id={inputId}
          type="file"
          accept="image/*"
          style={{ display: 'none' }}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) onReplace(file);
            e.target.value = '';
          }}
        />
      </label>
    </div>
  );
}

export default function PhotoLightbox({ photo, onClose, onReplaceBefore, onReplaceAfter, onDelete }) {
  if (!photo) return null;

  return (
    <Modal
      open={Boolean(photo)}
      onClose={onClose}
      title={photo.label || 'Session photo'}
      maxWidth={640}
      footer={
        <>
          <button type="button" className="btn btn-danger" onClick={onDelete}>
            <Icon name="trash" size={14} /> Supprimer la session
          </button>
          <button type="button" className="btn btn-primary" onClick={onClose}>Fermer</button>
        </>
      }
    >
      <div className={styles.header}>
        <div className={styles.date}>{formatDateLong(photo.sessionDate)}</div>
      </div>
      <div className={styles.pair}>
        <Slot label="Avant" url={photo.beforeUrl} styleClass={styles.before} onReplace={onReplaceBefore} inputId="lightbox-before-input" />
        <Slot label="Après" url={photo.afterUrl} styleClass={styles.after} onReplace={onReplaceAfter} inputId="lightbox-after-input" />
      </div>
    </Modal>
  );
}
