import Icon from '../common/Icon';
import styles from './styles/BrowStudio.module.css';

/** Une carte de réglages du Brow Lift.
 *
 *  Toutes les cartes se ressemblent volontairement : même titre en capitales, même
 *  respiration, même ombre. C'est ce qui permet d'en empiler cinq sans que l'œil ait à
 *  réapprendre la lecture à chaque bloc.
 *
 *  `embedded` retire le fond et l'ombre : dans une feuille glissante, la carte EST déjà
 *  la feuille — une seconde surface posée dessus ferait un cadre dans un cadre.
 */
export default function BrowCard({ title, icon, hint, action, embedded = false, children }) {
  return (
    <section className={embedded ? styles.cardBare : styles.card}>
      {/* Dans la feuille, le titre est déjà celui de la feuille — mais l'action, elle, n'a
          nulle part ailleurs où aller : on la garde seule. */}
      {(!embedded || action) && (
        <header className={styles.cardHead}>
          {!embedded && (
            <h3 className={styles.cardTitle}>
              {icon && <Icon name={icon} size={14} />} {title}
            </h3>
          )}
          {action}
        </header>
      )}
      {hint && <p className={styles.cardHint}>{hint}</p>}
      {children}
    </section>
  );
}
