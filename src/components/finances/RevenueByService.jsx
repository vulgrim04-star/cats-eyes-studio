import ProgressBar from '../common/ProgressBar';
import EmptyState from '../common/EmptyState';
import { getCategoryLabel } from '../../data/services';
import { formatPriceFull } from '../../utils/format';

const COLORS = ['var(--color-rose)', 'var(--color-rose-dark)', 'var(--color-warning)', 'var(--color-info)'];

export default function RevenueByService({ rows }) {
  return (
    <div className="card">
      <h3 className="card-title" style={{ marginBottom: 'var(--space-4)' }}>Répartition du CA par prestation</h3>
      {rows.length === 0 ? (
        <EmptyState icon="euro" title="Pas encore de données" subtitle="La répartition du chiffre d'affaires par catégorie s'affichera ici." />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          {rows.map((row, i) => (
            <div key={row.category}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.86rem', marginBottom: 6 }}>
                <span style={{ fontWeight: 600 }}>{getCategoryLabel(row.category)}</span>
                <span>{formatPriceFull(row.total)} · {Math.round(row.ratio * 100)}%</span>
              </div>
              <ProgressBar value={row.ratio} color={COLORS[i % COLORS.length]} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
