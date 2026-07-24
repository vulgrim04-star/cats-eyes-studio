import { useMemo, useState } from 'react';
import Icon from '../common/Icon';
import StatusBadge from '../common/StatusBadge';
import { formatDateLong } from '../../utils/date';
import { formatPrice } from '../../utils/format';
import styles from './VisitCalendar.module.css';

const WEEKDAYS = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];
const MONTH_NAMES = [
  'janvier', 'février', 'mars', 'avril', 'mai', 'juin',
  'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre',
];

function pad(n) {
  return String(n).padStart(2, '0');
}

function statusClass(status) {
  if (status === 'completed') return styles.statusCompleted;
  if (status === 'no-show') return styles.statusNoshow;
  if (status === 'confirmed' || status === 'pending') return styles.statusUpcoming;
  return '';
}

export default function VisitCalendar({ appointments }) {
  const visitsByDate = useMemo(() => {
    const map = new Map();
    appointments.forEach((a) => {
      if (a.status === 'cancelled') return;
      const list = map.get(a.date) ?? [];
      list.push(a);
      map.set(a.date, list);
    });
    return map;
  }, [appointments]);

  const sortedDates = useMemo(() => Array.from(visitsByDate.keys()).sort(), [visitsByDate]);

  const initialCursor = useMemo(() => {
    const latest = sortedDates[sortedDates.length - 1];
    const d = latest ? new Date(`${latest}T00:00:00`) : new Date();
    return { year: d.getFullYear(), month: d.getMonth() };
  }, [sortedDates]);

  const [cursor, setCursor] = useState(initialCursor);
  const [selectedDate, setSelectedDate] = useState(sortedDates[sortedDates.length - 1] ?? null);

  const cells = useMemo(() => {
    const firstDay = new Date(cursor.year, cursor.month, 1);
    const startWeekday = (firstDay.getDay() + 6) % 7;
    const daysInMonth = new Date(cursor.year, cursor.month + 1, 0).getDate();
    const list = [];
    for (let i = 0; i < startWeekday; i += 1) list.push(null);
    for (let d = 1; d <= daysInMonth; d += 1) list.push(d);
    return list;
  }, [cursor]);

  const shift = (delta) => {
    setCursor((c) => {
      const d = new Date(c.year, c.month + delta, 1);
      return { year: d.getFullYear(), month: d.getMonth() };
    });
  };

  const selectedVisits = selectedDate ? (visitsByDate.get(selectedDate) ?? []) : [];

  return (
    <div className="card" style={{ marginBottom: 'var(--space-5)' }}>
      <div className={styles.header}>
        <button type="button" className={styles.navBtn} onClick={() => shift(-1)} aria-label="Mois précédent">
          <Icon name="chevron-left" size={15} />
        </button>
        <h3 className="card-title" style={{ textTransform: 'capitalize' }}>
          {MONTH_NAMES[cursor.month]} {cursor.year}
        </h3>
        <button type="button" className={styles.navBtn} onClick={() => shift(1)} aria-label="Mois suivant">
          <Icon name="chevron-right" size={15} />
        </button>
      </div>

      <div className={styles.weekdays}>
        {WEEKDAYS.map((w, i) => (
          <span key={i}>{w}</span>
        ))}
      </div>

      <div className={styles.grid}>
        {cells.map((day, i) => {
          if (day === null) return <span key={`empty-${i}`} className={styles.empty} />;
          const iso = `${cursor.year}-${pad(cursor.month + 1)}-${pad(day)}`;
          const visits = visitsByDate.get(iso);
          const hasVisit = Boolean(visits?.length);
          return (
            <button
              key={iso}
              type="button"
              className={`${styles.day} ${hasVisit ? statusClass(visits[0].status) : ''} ${selectedDate === iso ? styles.daySelected : ''}`}
              onClick={() => hasVisit && setSelectedDate(iso)}
              disabled={!hasVisit}
            >
              {day}
            </button>
          );
        })}
      </div>

      <div className={styles.legend}>
        <span><i className={`${styles.dot} ${styles.legendCompleted}`} /> Terminé</span>
        <span><i className={`${styles.dot} ${styles.legendUpcoming}`} /> À venir</span>
        <span><i className={`${styles.dot} ${styles.legendNoshow}`} /> No-show</span>
      </div>

      {selectedVisits.length > 0 && (
        <div className={styles.detail}>
          <div className={styles.detailDate}>{formatDateLong(selectedDate)}</div>
          {selectedVisits.map((visit) => (
            <div key={visit.id} className={styles.detailRow}>
              <div>
                <div className={styles.detailService}>{visit.service?.name}</div>
                <div className={styles.detailMeta}>
                  {visit.time}
                  {visit.notes && ` · ${visit.notes}`}
                </div>
              </div>
              <div className={styles.detailRight}>
                <StatusBadge status={visit.status} size="sm" />
                <span className={styles.detailPrice}>{formatPrice(visit.price)}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
