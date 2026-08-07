import Icon from '../common/Icon';
import styles from './styles/studio.module.css';

/** Une carte de studio — Lash Map ou Brow Lift, sans distinction.
 *
 *  Toutes se ressemblent volontairement : même titre en capitales discrètes, même
 *  respiration, même ombre. C'est ce qui permet d'en empiler cinq sans que l'œil ait à
 *  réapprendre la lecture à chaque bloc, et c'est ce qui fait que les deux modules se
 *  reconnaissent comme le même outil.
 *
 *  `embedded` retire le fond et le titre : dans une feuille glissante, la carte EST déjà la
 *  feuille et celle-ci porte déjà son titre. Une seconde surface ferait un cadre dans un
 *  cadre. L'action, elle, est conservée — elle n'a nulle part ailleurs où aller.
 */
export default function StudioCard({ title, icon, hint, action, embedded = false, children }) {
  return (
    <section className={embedded ? styles.cardBare : styles.card}>
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
