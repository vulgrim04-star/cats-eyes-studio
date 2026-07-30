import styles from './UpdateBanner.module.css';

/** Signale qu'une version plus récente est en ligne, et propose de la charger.
 *
 *  Nécessaire parce qu'une application installée sur l'écran d'accueil ne se met pas à jour
 *  toute seule de façon visible : elle reste dans les applications récentes et resert sa
 *  page. Sans ce bandeau, une correction pouvait être en ligne depuis des heures sans que
 *  rien ne le laisse deviner.
 *
 *  Le rechargement suffit à tout basculer : les fichiers portent une empreinte dans leur
 *  nom, la page fraîche référence donc les nouveaux. */
export default function UpdateBanner() {
  return (
    <div className={styles.banner} role="status">
      <span className={styles.text}>
        <strong>Nouvelle version disponible</strong>
      </span>
      <button type="button" className={styles.reloadBtn} onClick={() => window.location.reload()}>
        Recharger
      </button>
    </div>
  );
}
