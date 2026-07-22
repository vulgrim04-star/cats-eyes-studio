import { staff } from '../../data/staff';
import { formatPrice } from '../../utils/format';
import styles from './StaffPricing.module.css';

const MULTIPLIER = { staff_1: 1, staff_2: 1, staff_3: 0.9 };

export default function StaffPricing({ services }) {
  const sample = services.slice(0, 6);

  return (
    <div className="card">
      <h3 className="card-title" style={{ marginBottom: 'var(--space-2)' }}>Variations de prix par praticienne</h3>
      <p style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', marginBottom: 'var(--space-3)' }}>
        Tarif ajusté selon le niveau d'expérience (-10% pour les esthéticiennes juniors).
      </p>
      <div className={styles.tableWrap}>
        <table>
          <thead>
            <tr>
              <th>Prestation</th>
              {staff.map((s) => (
                <th key={s.id}>{s.name.split(' ')[0]}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sample.map((service) => (
              <tr key={service.id}>
                <td>{service.name}</td>
                {staff.map((s) => (
                  <td key={s.id}>{formatPrice(Math.round(service.price * (MULTIPLIER[s.id] ?? 1)))}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
