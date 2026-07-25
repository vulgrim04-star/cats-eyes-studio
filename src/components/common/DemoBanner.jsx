import { exitDemo } from '../../utils/demoMode';
import styles from './DemoBanner.module.css';

/** Rappel permanent que rien n'est réel en mode démonstration : sans ça, quelqu'un pourrait
 * croire avoir créé un compte et saisir de vraies données clientes qui disparaîtraient. */
export default function DemoBanner() {
  return (
    <div className={styles.banner} role="status">
      <span className={styles.text}>
        <strong>Mode démonstration</strong> — données fictives, rien n'est enregistré.
      </span>
      <button type="button" className={styles.exitBtn} onClick={exitDemo}>
        Quitter la démo
      </button>
    </div>
  );
}
