import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import BrandMark from '../components/common/BrandMark';
import { updatePassword, useAuthStore, clearAuthError } from '../store/useAuthStore';
import styles from './Login.module.css';

const ERROR_MESSAGES = {
  'Password should be at least 6 characters.': 'Le mot de passe doit contenir au moins 6 caractères.',
  'New password should be different from the old password.': "Le nouveau mot de passe doit être différent de l'ancien.",
};

export default function ResetPassword() {
  const navigate = useNavigate();
  const ready = useAuthStore((s) => s.ready);
  const session = useAuthStore((s) => s.session);
  const authError = useAuthStore((s) => s.authError);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    clearAuthError();
    if (password !== confirm) {
      useAuthStore.setState({ authError: 'Les deux mots de passe ne correspondent pas.' });
      return;
    }
    setLoading(true);
    const ok = await updatePassword(password);
    setLoading(false);
    if (ok) setDone(true);
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
            <h1>Cats Eyes Studio</h1>
          </div>
          <p className={styles.subtitle}>Ce lien de réinitialisation n'est plus valide ou a déjà été utilisé.</p>
          <button type="button" className="btn btn-primary" onClick={() => navigate('/')}>Retour à la connexion</button>
        </div>
      </div>
    );
  }

  if (done) {
    return (
      <div className={styles.wrap}>
        <div className={styles.card}>
          <div className={styles.brand}>
            <BrandMark size={48} radius="var(--radius-md)" iconSize={22} />
            <h1>Cats Eyes Studio</h1>
          </div>
          <p className={styles.subtitle}>Mot de passe mis à jour avec succès.</p>
          <button type="button" className="btn btn-primary" onClick={() => navigate('/')}>Continuer</button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.wrap}>
      <form className={styles.card} onSubmit={handleSubmit}>
        <div className={styles.brand}>
          <BrandMark size={48} radius="var(--radius-md)" iconSize={22} />
          <h1>Cats Eyes Studio</h1>
        </div>
        <p className={styles.subtitle}>Choisis un nouveau mot de passe.</p>

        <div className="field-group">
          <label className="field-label" htmlFor="new-password">Nouveau mot de passe</label>
          <input
            id="new-password"
            type="password"
            className="input-field"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
            minLength={6}
            required
          />
        </div>
        <div className="field-group">
          <label className="field-label" htmlFor="confirm-password">Confirmer le mot de passe</label>
          <input
            id="confirm-password"
            type="password"
            className="input-field"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            autoComplete="new-password"
            minLength={6}
            required
          />
        </div>

        {authError && <p className={styles.error}>{ERROR_MESSAGES[authError] ?? authError}</p>}

        <button type="submit" className="btn btn-primary" disabled={loading}>
          {loading ? 'Patiente…' : 'Enregistrer le nouveau mot de passe'}
        </button>
      </form>
    </div>
  );
}
