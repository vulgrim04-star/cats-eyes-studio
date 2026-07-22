import { enrich, getAppointmentsByDate } from '../../hooks/useAppointments';
import { formatDayLabel, formatDayNumber, isTodayISO } from '../../utils/date';
import { fullName } from '../../utils/format';
import styles from './WeekView.module.css';

export default function WeekView({ weekDays, appointments, staffFilter, onSelectDay }) {
  return (
    <div className={styles.grid}>
      {weekDays.map((day) => {
        let dayAppointments = getAppointmentsByDate(appointments, day).filter((a) => a.status !== 'cancelled');
        if (staffFilter !== 'all') dayAppointments = dayAppointments.filter((a) => a.staffId === staffFilter);
        const enriched = dayAppointments.map(enrich);

        return (
          <div key={day} className={`${styles.column} ${isTodayISO(day) ? styles.columnToday : ''}`}>
            <button type="button" className={styles.dayHeader} onClick={() => onSelectDay(day)}>
              <div className={styles.dayLabel}>{formatDayLabel(day)}</div>
              <div className={styles.dayNumber}>{formatDayNumber(day)}</div>
            </button>

            {enriched.length === 0 ? (
              <div className={styles.empty}>—</div>
            ) : (
              enriched.map((apt) => (
                <button key={apt.id} type="button" className={styles.miniCard} onClick={() => onSelectDay(day)}>
                  <span className={styles.miniDot} style={{ background: apt.staff?.color }} />
                  <div className={styles.miniText}>
                    <div className={styles.miniTime}>{apt.time}</div>
                    <div className={styles.miniName}>{apt.client ? fullName(apt.client) : 'Cliente'}</div>
                  </div>
                </button>
              ))
            )}
          </div>
        );
      })}
    </div>
  );
}
