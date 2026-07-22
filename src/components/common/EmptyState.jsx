import Icon from './Icon';
import styles from './EmptyState.module.css';

export default function EmptyState({ icon = 'sparkles', title, subtitle }) {
  return (
    <div className={styles.wrap}>
      <span className={styles.iconWrap}>
        <Icon name={icon} size={28} />
      </span>
      <p className={styles.title}>{title}</p>
      {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
    </div>
  );
}
