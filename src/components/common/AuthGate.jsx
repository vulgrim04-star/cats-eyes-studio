import { useEffect } from 'react';
import { useAuthStore, initAuth } from '../../store/useAuthStore';
import BrandMark from './BrandMark';
import styles from './AuthGate.module.css';

export default function AuthGate({ children }) {
  const ready = useAuthStore((s) => s.ready);

  useEffect(() => {
    initAuth();
  }, []);

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
