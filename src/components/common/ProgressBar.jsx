import styles from './ProgressBar.module.css';

export default function ProgressBar({ value, color = 'var(--color-rose)', trackHeight }) {
  const pct = Math.max(0, Math.min(100, value * 100));
  return (
    <div className={styles.track} style={trackHeight ? { height: trackHeight } : undefined}>
      <div className={styles.fill} style={{ width: `${pct}%`, background: color }} />
    </div>
  );
}
