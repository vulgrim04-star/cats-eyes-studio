import ProgressBar from '../common/ProgressBar';
import EmptyState from '../common/EmptyState';
import styles from './TopServices.module.css';

export default function TopServices({ rows }) {
  return (
    <div className="card">
      <h3 className="card-title">Top prestations du mois</h3>
      {rows.length === 0 ? (
        <EmptyState icon="sparkles" title="Pas encore de données" subtitle="Les prestations les plus demandées du mois s'afficheront ici." />
      ) : (
        <div className={styles.list}>
          {rows.map((row) => (
            <div key={row.service.id} className={styles.row}>
              <div className={styles.rowTop}>
                <span className={styles.name}>{row.service.name}</span>
                <span className={styles.count}>{row.count} RDV</span>
              </div>
              <ProgressBar value={row.ratio} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
