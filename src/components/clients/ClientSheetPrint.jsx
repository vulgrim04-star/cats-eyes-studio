import { formatDateLong, formatDateShort } from '../../utils/date';
import { formatPrice, fullName } from '../../utils/format';
import styles from '../common/PrintDocument.module.css';

export default function ClientSheetPrint({ client, history, salon }) {
  if (!client) return null;

  return (
    <div className="printable">
      <div className={styles.header}>
        <div>
          <div className={styles.salonName}>{salon.name}</div>
          <div className={styles.salonMeta}>{salon.address}</div>
        </div>
        <div>
          <div className={styles.docTitle}>Fiche cliente</div>
          <div className={styles.docMeta}>Éditée le {formatDateLong(new Date().toISOString().slice(0, 10))}</div>
        </div>
      </div>

      <div className={styles.section}>
        <div className={styles.sectionTitle}>Identité</div>
        <div><strong>{fullName(client)}</strong></div>
        <div>{client.phone} · {client.email}</div>
      </div>

      <div className={styles.section}>
        <div className={styles.sectionTitle}>Informations techniques</div>
        <div>Type de cils : {client.lashType} · Courbure : {client.curl} · Longueur : {client.length}</div>
        <div>Allergies : {client.allergies || 'Aucune connue'}</div>
        {client.contraindications && <div>Contre-indications : {client.contraindications}</div>}
      </div>

      {client.notes && (
        <div className={styles.section}>
          <div className={styles.sectionTitle}>Notes</div>
          <div style={{ whiteSpace: 'pre-wrap' }}>{client.notes}</div>
        </div>
      )}

      <div className={styles.section}>
        <div className={styles.sectionTitle}>Historique des prestations</div>
        {history.length === 0 ? (
          <p>Aucune prestation enregistrée.</p>
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Date</th>
                <th>Prestation</th>
                <th>Statut</th>
                <th>Prix</th>
              </tr>
            </thead>
            <tbody>
              {history.map((apt) => (
                <tr key={apt.id}>
                  <td>{formatDateShort(apt.date)}</td>
                  <td>{apt.service?.name}</td>
                  <td>{apt.status}</td>
                  <td>{formatPrice(apt.price)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
