import { useState } from 'react';
import Modal from '../common/Modal';
import { requestAccountDeletion, clearAuthError, useAuthStore } from '../../store/useAuthStore';
import { useToast } from '../../hooks/useToast';

const CONFIRM_WORD = 'SUPPRIMER';

export default function DeleteAccountModal({ open, onClose }) {
  const email = useAuthStore((s) => s.session?.user?.email);
  const authError = useAuthStore((s) => s.authError);
  const { showToast } = useToast();
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleClose = () => {
    setInput('');
    setSent(false);
    clearAuthError();
    onClose();
  };

  const handleConfirm = async () => {
    if (input !== CONFIRM_WORD || !email) return;
    clearAuthError();
    setLoading(true);
    const ok = await requestAccountDeletion(email);
    setLoading(false);
    if (ok) {
      setSent(true);
    } else {
      showToast("Impossible d'envoyer l'email de confirmation, réessaie dans un instant.", 'error');
    }
  };

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Supprimer définitivement mon compte"
      footer={
        sent ? (
          <button type="button" className="btn btn-primary" onClick={handleClose}>J'ai compris</button>
        ) : (
          <>
            <button type="button" className="btn btn-ghost" onClick={handleClose}>Annuler</button>
            <button
              type="button"
              className="btn btn-danger"
              disabled={input !== CONFIRM_WORD || loading}
              onClick={handleConfirm}
            >
              {loading ? 'Envoi…' : 'Envoyer le lien de confirmation'}
            </button>
          </>
        )
      }
    >
      {sent ? (
        <p style={{ fontSize: '0.88rem', lineHeight: 1.6 }}>
          Un email vient d'être envoyé à <strong>{email}</strong>. Clique sur le lien qu'il contient pour confirmer
          définitivement la suppression — tant que tu ne cliques pas dessus, ton compte et tes données restent intacts.
          <br /><br />
          Cet email vient de Supabase et peut afficher "Réinitialiser le mot de passe" : c'est normal, le même
          mécanisme sécurisé est réutilisé pour vérifier que c'est bien toi avant une suppression définitive.
        </p>
      ) : (
        <>
          <p style={{ fontSize: '0.88rem', lineHeight: 1.6, marginBottom: 'var(--space-4)' }}>
            Cette action est <strong>irréversible</strong>. Seront supprimés définitivement : ton compte de connexion,
            toutes tes clientes, rendez-vous, prestations, stock, finances et paramètres. Aucune récupération ne sera
            possible ensuite.
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
          {authError && (
            <p style={{ fontSize: '0.8rem', color: 'var(--color-danger)', marginTop: 'var(--space-2)' }}>{authError}</p>
          )}
        </>
      )}
    </Modal>
  );
}
