import { estimateMargin } from '../../utils/margin';
import { formatPrice } from '../../utils/format';
import styles from './MarginTable.module.css';

export default function MarginTable({ services }) {
  return (
    <div className="card">
      <h3 className="card-title" style={{ marginBottom: 'var(--space-3)' }}>Coût de revient estimé & marge</h3>
      <p style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', marginBottom: 'var(--space-3)' }}>
        Estimation basée sur la consommation moyenne de matières par type de prestation.
      </p>
      <div className={styles.tableWrap}>
        <table>
          <thead>
            <tr>
              <th>Prestation</th>
              <th>Prix</th>
              <th>Coût matière</th>
              <th>Marge</th>
            </tr>
          </thead>
          <tbody>
            {services.map((service) => {
              const { cost, margin, marginPercent } = estimateMargin(service);
              return (
                <tr key={service.id}>
                  <td>{service.name}</td>
                  <td>{formatPrice(service.price)}</td>
                  <td>{formatPrice(cost)}</td>
                  <td className={styles.marginPositive}>{formatPrice(margin)} ({marginPercent}%)</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
