import { useState } from 'react';
import Modal from '../common/Modal';
import { resetAllData } from '../../utils/resetData';
import { useToast } from '../../hooks/useToast';

const CONFIRM_WORD = 'REINITIALISER';

export default function ResetDataModal({ open, onClose }) {
  const { showToast } = useToast();
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const handleClose = () => {
    setInput('');
    onClose();
  };

  const handleConfirm = async () => {
    if (input !== CONFIRM_WORD) return;
    setLoading(true);
    try {
      await resetAllData();
      showToast('Toutes les données ont été réinitialisées.', 'success');
      handleClose();
    } catch {
      showToast('La réinitialisation a échoué, réessaie dans un instant.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Réinitialiser toutes les données"
      footer={
        <>
          <button type="button" className="btn btn-ghost" onClick={handleClose}>Annuler</button>
          <button
            type="button"
            className="btn btn-danger"
            disabled={input !== CONFIRM_WORD || loading}
            onClick={handleConfirm}
          >
            {loading ? 'Réinitialisation…' : 'Réinitialiser définitivement'}
          </button>
        </>
      }
    >
      <p style={{ fontSize: '0.88rem', lineHeight: 1.6, marginBottom: 'var(--space-4)' }}>
        Cette action est <strong>irréversible</strong>. Seront supprimés définitivement : toutes tes clientes,
        rendez-vous, prestations, stock, dépenses et demandes de réservation en attente. Ton compte de connexion et
        les paramètres du salon (nom, horaires, apparence) restent intacts — tu repars avec un espace vide, comme un
        compte tout juste créé.
      </p>
      <p style={{ fontSize: '0.88rem', marginBottom: 'var(--space-2)' }}>
        Tape <strong>{CONFIRM_WORD}</strong> ci-dessous pour continuer :
      </p>
      <input
        className="input-field"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder={CONFIRM_WORD}
        autoFocus
      />
    </Modal>
  );
}
