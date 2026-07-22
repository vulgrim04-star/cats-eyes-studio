import Icon from './Icon';
import styles from './SearchInput.module.css';

export default function SearchInput({ value, onChange, placeholder = 'Rechercher…' }) {
  return (
    <div className={styles.wrap}>
      <span className={styles.icon}>
        <Icon name="search" size={17} />
      </span>
      <input
        className={`input-field ${styles.input}`}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
      />
    </div>
  );
}
