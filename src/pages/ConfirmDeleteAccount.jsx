import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import BrandMark from '../components/common/BrandMark';
import { APP_NAME } from '../data/brand';
import { useAuthStore } from '../store/useAuthStore';
import { supabase } from '../lib/supabaseClient';
import styles from './Login.module.css';

export default function ConfirmDeleteAccount() {
  const navigate = useNavigate();
  const ready = useAuthStore((s) => s.ready);
  const session = useAuthStore((s) => s.session);
  const [status, setStatus] = useState('confirm'); // 'confirm' | 'deleting' | 'done' | 'error'
  const [error, setError] = useState('');

  const handleConfirm = async () => {
    setStatus('deleting');
    setError('');
    try {
      const response = await fetch('/api/delete-account', {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || data?.error) {
        setError(data?.error || 'La suppression a échoué, réessaie dans un instant.');
        setStatus('error');
        return;
      }
    } catch {
      setError('Connexion impossible. Vérifie ta connexion internet et réessaie.');
      setStatus('error');
      return;
    }
    setStatus('done');
    await supabase.auth.signOut();
  };

  if (!ready) {
    return (
      <div className={styles.wrap}>
        <p style={{ color: 'var(--color-text-muted)' }}>Chargement…</p>
      </div>
    );
  }

  if (!session) {
    return (
      <div className={styles.wrap}>
        <div className={styles.card}>
          <div className={styles.brand}>
            <BrandMark size={48} radius="var(--radius-md)" iconSize={22} />
            <h1>{APP_NAME}</h1>
          </div>
          <p className={styles.subtitle}>Ce lien de confirmation n'est plus valide ou a déjà été utilisé.</p>
          <button type="button" className="btn btn-primary" onClick={() => navigate('/')}>Retour à la connexion</button>
        </div>
      </div>
    );
  }

  if (status === 'done') {
    return (
      <div className={styles.wrap}>
        <div className={styles.card}>
          <div className={styles.brand}>
            <BrandMark size={48} radius="var(--radius-md)" iconSize={22} />
            <h1>{APP_NAME}</h1>
          </div>
          <p className={styles.subtitle}>
            Ton compte et toutes tes données ont été supprimés définitivement. Merci d'avoir utilisé {APP_NAME}.
          </p>
          <button type="button" className="btn btn-primary" onClick={() => navigate('/')}>Retour à l'accueil</button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.card}>
        <div className={styles.brand}>
          <BrandMark size={48} radius="var(--radius-md)" iconSize={22} />
          <h1>{APP_NAME}</h1>
        </div>
        <p className={styles.subtitle}>
          Dernière étape : confirmer la suppression définitive du compte {session.user?.email} et de toutes ses
          données. Cette action est irréversible.
        </p>

        {status === 'error' && <p className={styles.error}>{error}</p>}

        <button type="button" className="btn btn-danger" disabled={status === 'deleting'} onClick={handleConfirm}>
          {status === 'deleting' ? 'Suppression en cours…' : 'Confirmer la suppression définitive'}
        </button>
        <button type="button" className="btn btn-ghost" disabled={status === 'deleting'} onClick={() => navigate('/')}>
          Annuler
        </button>
      </div>
    </div>
  );
}
