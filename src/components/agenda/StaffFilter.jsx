import styles from './StaffFilter.module.css';

export default function StaffFilter({ staff, selected, onSelect }) {
  return (
    <div className={`${styles.wrap} scrollbar-hidden`}>
      <button
        type="button"
        className={`${styles.pill} ${selected === 'all' ? styles.pillActive : ''}`}
        onClick={() => onSelect('all')}
      >
        Toutes
      </button>
      {staff.map((s) => (
        <button
          key={s.id}
          type="button"
          className={`${styles.pill} ${selected === s.id ? styles.pillActive : ''}`}
          onClick={() => onSelect(s.id)}
        >
          <span className={styles.dot} style={{ background: s.color }} />
          {s.name}
        </button>
      ))}
    </div>
  );
}
