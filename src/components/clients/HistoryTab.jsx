import EmptyState from '../common/EmptyState';
import StatusBadge from '../common/StatusBadge';
import VisitCalendar from './VisitCalendar';
import { getAppointmentsByClient, enrich } from '../../hooks/useAppointments';
import { formatDateShort } from '../../utils/date';
import { formatPrice } from '../../utils/format';
import styles from './HistoryTab.module.css';

export default function HistoryTab({ client, appointments }) {
  const history = getAppointmentsByClient(appointments, client.id).map(enrich);

  if (history.length === 0) {
    return <EmptyState icon="clock" title="Aucun historique" subtitle="Les prestations passées de cette cliente apparaîtront ici." />;
  }

  return (
    <>
      <VisitCalendar appointments={history} />
      <div className="card">
        {history.map((apt) => (
          <div key={apt.id} className={styles.row}>
            <div>
              <div className={styles.date}>{formatDateShort(apt.date)} · {apt.time} · {apt.staff?.name}</div>
              <div className={styles.name}>{apt.service?.name}</div>
              {apt.notes && <div className={styles.notes}>{apt.notes}</div>}
            </div>
            <StatusBadge status={apt.status} size="sm" />
            <span className={styles.price}>{formatPrice(apt.price)}</span>
          </div>
        ))}
      </div>
    </>
  );
}
