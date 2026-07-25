import { useEffect } from 'react';
import { useAuthStore, initAuth } from '../../store/useAuthStore';
import { ensureDemoLoaded } from '../../utils/demoMode';
import BrandMark from './BrandMark';
import styles from './AuthGate.module.css';

export default function AuthGate({ children }) {
  const ready = useAuthStore((s) => s.ready);

  useEffect(() => {
    initAuth();
  }, []);

  // La persistance étant neutralisée en démo, un rechargement de page repartirait sur des
  // stores vides : on recharge le jeu fictif une fois l'authentification résolue.
  useEffect(() => {
    if (ready) ensureDemoLoaded();
  }, [ready]);

  if (!ready) {
    return (
      <div className={styles.wrap}>
        <BrandMark size={48} radius="var(--radius-md)" iconSize={22} />
        <p>Chargement…</p>
      </div>
    );
  }

  return children;
}
