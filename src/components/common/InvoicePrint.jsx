import { formatDateLong } from '../../utils/date';
import { formatPriceFull, fullName } from '../../utils/format';
import styles from './PrintDocument.module.css';

export default function InvoicePrint({ appointment, salon }) {
  if (!appointment) return null;

  const vatRate = salon.vatRate ?? 20;
  const priceTTC = appointment.price;
  const priceHT = priceTTC / (1 + vatRate / 100);
  const vatAmount = priceTTC - priceHT;

  return (
    <div className="printable">
      <div className={styles.header}>
        <div>
          <div className={styles.salonName}>{salon.name}</div>
          <div className={styles.salonMeta}>
            {salon.address}<br />
            {salon.phone} · {salon.email}
          </div>
        </div>
        <div>
          <div className={styles.docTitle}>Reçu / Facture</div>
          <div className={styles.docMeta}>
            N° {appointment.id}<br />
            {formatDateLong(appointment.date)}
          </div>
        </div>
      </div>

      <div className={styles.section}>
        <div className={styles.sectionTitle}>Cliente</div>
        <div>{appointment.client ? fullName(appointment.client) : 'Cliente'}</div>
        {appointment.client?.phone && <div>{appointment.client.phone}</div>}
      </div>

      <table className={styles.table}>
        <thead>
          <tr>
            <th>Prestation</th>
            <th>Esthéticienne</th>
            <th>Prix TTC</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>{appointment.service?.name}</td>
            <td>{appointment.staff?.name}</td>
            <td>{formatPriceFull(priceTTC)}</td>
          </tr>
          <tr>
            <td colSpan={2}>Dont TVA ({vatRate}%)</td>
            <td>{formatPriceFull(vatAmount)}</td>
          </tr>
          <tr>
            <td colSpan={2}>Total HT</td>
            <td>{formatPriceFull(priceHT)}</td>
          </tr>
          <tr className={styles.totalsRow}>
            <td colSpan={2}>Total TTC</td>
            <td>{formatPriceFull(priceTTC)}</td>
          </tr>
        </tbody>
      </table>

      {appointment.paymentMethod && (
        <div className={styles.section} style={{ marginTop: 16 }}>
          <div className={styles.sectionTitle}>Paiement</div>
          <div>{appointment.paymentMethod === 'cb' ? 'Carte bancaire' : appointment.paymentMethod === 'especes' ? 'Espèces' : 'Virement'}</div>
        </div>
      )}

      <div className={styles.footer}>Merci de votre confiance — {salon.name}</div>
    </div>
  );
}
