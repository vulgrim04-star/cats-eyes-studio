import { formatDateLong } from '../../utils/date';
import { formatPrice, fullName } from '../../utils/format';
import styles from '../common/PrintDocument.module.css';

const STATUS_LABELS = { confirmed: 'Confirmé', pending: 'En attente', completed: 'Terminé', cancelled: 'Annulé', 'no-show': 'No-show' };

export default function DayPlanningPrint({ date, appointments, salon }) {
  if (!date) return null;

  return (
    <div className="printable">
      <div className={styles.header}>
        <div>
          <div className={styles.salonName}>{salon.name}</div>
          <div className={styles.salonMeta}>{salon.address}</div>
        </div>
        <div>
          <div className={styles.docTitle}>Planning du jour</div>
          <div className={styles.docMeta}>{formatDateLong(date)}</div>
        </div>
      </div>

      {appointments.length === 0 ? (
        <p>Aucun rendez-vous ce jour-là.</p>
      ) : (
        <div className={styles.dayList}>
          {appointments.map((apt) => (
            <div key={apt.id} className={styles.dayRow}>
              <span>
                <strong>{apt.time}</strong> — {apt.client ? fullName(apt.client) : 'Cliente'} · {apt.service?.name}
              </span>
              <span>{STATUS_LABELS[apt.status] ?? apt.status} · {formatPrice(apt.price)}</span>
            </div>
          ))}
        </div>
      )}

      <div className={styles.footer}>Édité le {formatDateLong(new Date().toISOString().slice(0, 10))}</div>
    </div>
  );
}
