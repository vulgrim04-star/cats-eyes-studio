import Icon from '../common/Icon';
import styles from './KpiCard.module.css';

export default function KpiCard({ icon, iconColor = 'var(--color-rose)', iconBg = 'var(--color-rose-light)', label, value, trend, trendLabel }) {
  const trendClass = trend === null || trend === undefined ? null : trend > 0 ? styles.trendUp : trend < 0 ? styles.trendDown : styles.trendFlat;

  return (
    <div className={styles.card}>
      <div className={styles.top}>
        <span className={styles.iconWrap} style={{ background: iconBg, color: iconColor }}>
          <Icon name={icon} size={20} />
        </span>
      </div>
      <div>
        <div className={styles.label}>{label}</div>
        <div className={styles.value}>{value}</div>
      </div>
      {trend !== undefined && trend !== null && (
        <span className={`${styles.trend} ${trendClass}`}>
          <Icon name="trending-up" size={12} strokeWidth={2.4} style={trend < 0 ? { transform: 'rotate(90deg) scaleX(-1)' } : undefined} />
          {trend > 0 ? '+' : ''}{trend}% {trendLabel}
        </span>
      )}
    </div>
  );
}
