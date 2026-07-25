import { exitDemo } from '../../utils/demoMode';
import styles from './DemoBanner.module.css';

/** Rappel permanent que rien n'est réel en mode démonstration : sans ça, quelqu'un pourrait
 * croire avoir créé un compte et saisir de vraies données clientes qui disparaîtraient. */
export default function DemoBanner() {
  return (
    <div className={styles.banner} role="status">
      {/* Formulation courte : sur un écran de 375px, la version longue occupait trois
          lignes, soit un cinquième de la hauteur utile. */}
      <span className={styles.text}>
        <strong>Mode démo</strong> — rien n'est enregistré.
      </span>
      <button type="button" className={styles.exitBtn} onClick={exitDemo}>
        Quitter
      </button>
    </div>
  );
}
