import { formatDayNumber } from '../../utils/date';
import { formatPriceFull } from '../../utils/format';
import styles from './RevenueChart.module.css';

export default function RevenueChart({ series, total, label }) {
  const max = Math.max(1, ...series.map((s) => s.total));

  return (
    <div className="card">
      <div className={styles.summary}>
        <div>
          <h3 className="card-title">Chiffre d'affaires</h3>
          <span style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>{label}</span>
        </div>
        <span className={styles.summaryValue}>{formatPriceFull(total)}</span>
      </div>

      <div className={styles.chart}>
        {series.map((point) => (
          <div key={point.date} className={styles.barWrap} title={`${formatPriceFull(point.total)}`}>
            <div className={styles.bar} style={{ height: `${Math.max(4, (point.total / max) * 100)}%` }} />
            <span className={styles.dayLabel}>{formatDayNumber(point.date)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
