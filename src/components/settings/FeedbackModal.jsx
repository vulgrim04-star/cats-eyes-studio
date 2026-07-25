import { useState } from 'react';
import Modal from '../common/Modal';
import { useToast } from '../../hooks/useToast';
import { submitFeedback, FEEDBACK_KINDS } from '../../utils/feedback';
import styles from './FeedbackModal.module.css';

export default function FeedbackModal({ open, onClose }) {
  const { showToast } = useToast();
  const [kind, setKind] = useState('bug');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);

  const reset = () => {
    setKind('bug');
    setMessage('');
    onClose();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!message.trim() || sending) return;
    setSending(true);
    const ok = await submitFeedback({ kind, message: message.trim() });
    setSending(false);
    if (ok) {
      showToast('Merci ! Ton retour a bien été envoyé.', 'success');
      reset();
    } else {
      showToast("L'envoi a échoué. Vérifie ta connexion et réessaie.", 'error');
    }
  };

  return (
    <Modal
      open={open}
      onClose={reset}
      title="Signaler un problème"
      maxWidth={460}
      footer={
        <>
          <button type="button" className="btn btn-ghost" onClick={reset}>Annuler</button>
          <button type="submit" form="feedback-form" className="btn btn-primary" disabled={sending || !message.trim()}>
            {sending ? 'Envoi…' : 'Envoyer'}
          </button>
        </>
      }
    >
      <form id="feedback-form" onSubmit={handleSubmit}>
        <div className="field-group">
          <label className="field-label">De quoi s'agit-il ?</label>
          <div className={styles.kindRow}>
            {FEEDBACK_KINDS.map((k) => (
              <button
                key={k.key}
                type="button"
                className={`${styles.kindChip} ${kind === k.key ? styles.kindChipActive : ''}`}
                onClick={() => setKind(k.key)}
              >
                {k.label}
              </button>
            ))}
          </div>
        </div>

        <div className="field-group" style={{ marginBottom: 0 }}>
          <label className="field-label" htmlFor="feedback-message">Ton message</label>
          <textarea
            id="feedback-message"
            className="input-field"
            rows={5}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Décris ce qui s'est passé, ou ce que tu aimerais voir amélioré…"
            autoFocus
          />
          <p className={styles.privacyNote}>
            La page consultée et le type d'appareil sont joints automatiquement pour aider au
            diagnostic. Aucune donnée de tes clientes n'est envoyée.
          </p>
        </div>
      </form>
    </Modal>
  );
}
