import Toggle from '../common/Toggle';
import { useServices } from '../../hooks/useServices';
import styles from './PromoList.module.css';

export default function PromoList() {
  const { promoCodes, togglePromo } = useServices();

  return (
    <div className="card">
      <h3 className="card-title" style={{ marginBottom: 'var(--space-2)' }}>Codes promo</h3>
      {promoCodes.map((promo) => (
        <div key={promo.id} className={styles.row}>
          <span className={styles.code}>{promo.code}</span>
          <span className={styles.desc}>{promo.label} · -{promo.discountPercent}%</span>
          <Toggle
            active={promo.active}
            onChange={() => togglePromo(promo.id)}
            label={promo.active ? 'Désactiver' : 'Activer'}
          />
        </div>
      ))}
    </div>
  );
}
