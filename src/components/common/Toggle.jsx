import styles from './Toggle.module.css';

export default function Toggle({ active, onChange, label, disabled = false }) {
  return (
    <button
      type="button"
      className={`${styles.switch} ${active ? styles.active : ''}`}
      onClick={() => onChange(!active)}
      aria-pressed={active}
      aria-label={label}
      disabled={disabled}
      style={disabled ? { cursor: 'not-allowed' } : undefined}
    >
      <span />
    </button>
  );
}
