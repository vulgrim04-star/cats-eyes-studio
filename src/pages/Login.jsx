import { useState } from 'react';
import BrandMark from '../components/common/BrandMark';
import { signIn, signUp, useAuthStore, clearAuthError } from '../store/useAuthStore';
import styles from './Login.module.css';

const ERROR_MESSAGES = {
  'Invalid login credentials': 'Email ou mot de passe incorrect.',
  'User already registered': 'Un compte existe déjà avec cet email.',
  'Password should be at least 6 characters.': 'Le mot de passe doit contenir au moins 6 caractères.',
};

export default function Login() {
  const [mode, setMode] = useState('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [info, setInfo] = useState('');
  const authError = useAuthStore((s) => s.authError);

  const handleSubmit = async (e) => {
    e.preventDefault();
    clearAuthError();
    setInfo('');
    setLoading(true);
    const ok = mode === 'signin' ? await signIn(email, password) : await signUp(email, password);
    setLoading(false);
    if (ok && mode === 'signup') {
      setInfo("Compte créé. Si la confirmation par email est activée, vérifie ta boîte mail avant de te connecter.");
    }
  };

  return (
    <div className={styles.wrap}>
      <form className={styles.card} onSubmit={handleSubmit}>
        <div className={styles.brand}>
          <BrandMark size={48} radius="var(--radius-md)" iconSize={22} />
          <h1>Cats Eyes Studio</h1>
        </div>
        <p className={styles.subtitle}>
          {mode === 'signin' ? 'Connecte-toi à ton espace salon.' : 'Crée ton compte salon.'}
        </p>

        <div className="field-group">
          <label className="field-label" htmlFor="login-email">Email</label>
          <input
            id="login-email"
            type="email"
            className="input-field"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            required
          />
        </div>

        <div className="field-group">
          <label className="field-label" htmlFor="login-password">Mot de passe</label>
          <input
            id="login-password"
            type="password"
            className="input-field"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
            minLength={6}
            required
          />
        </div>

        {authError && <p className={styles.error}>{ERROR_MESSAGES[authError] ?? authError}</p>}
        {info && <p className={styles.info}>{info}</p>}

        <button type="submit" className="btn btn-primary" disabled={loading}>
          {loading ? 'Patiente…' : mode === 'signin' ? 'Se connecter' : "Créer mon compte"}
        </button>

        <button
          type="button"
          className={styles.switchBtn}
          onClick={() => {
            clearAuthError();
            setInfo('');
            setMode((m) => (m === 'signin' ? 'signup' : 'signin'));
          }}
        >
          {mode === 'signin' ? "Pas encore de compte ? Crée-en un" : 'Déjà un compte ? Connecte-toi'}
        </button>
      </form>
    </div>
  );
}
