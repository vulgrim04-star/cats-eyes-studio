import { useRef } from 'react';
import Icon from '../common/Icon';
import { formatDayLabel, formatDayNumber, isTodayISO } from '../../utils/date';
import styles from './DaySelector.module.css';

export default function DaySelector({ days, selected, onSelect, countFor }) {
  const scrollerRef = useRef(null);

  const scrollBy = (amount) => {
    scrollerRef.current?.scrollBy({ left: amount, behavior: 'smooth' });
  };

  return (
    <div className={styles.wrap}>
      <button type="button" className={styles.arrow} onClick={() => scrollBy(-200)} aria-label="Précédent">
        <Icon name="chevron-left" size={16} />
      </button>
      <div className={`${styles.scroller} scrollbar-hidden`} ref={scrollerRef}>
        {days.map((day) => {
          const active = day === selected;
          const count = countFor(day);
          return (
            <button
              key={day}
              type="button"
              className={`${styles.day} ${active ? styles.dayActive : ''} ${!active && isTodayISO(day) ? styles.dayToday : ''}`}
              onClick={() => onSelect(day)}
            >
              <span className={styles.dayLabel}>{formatDayLabel(day)}</span>
              <span className={styles.dayNumber}>{formatDayNumber(day)}</span>
              {count > 0 && <span className={styles.dayCount}>{count}</span>}
            </button>
          );
        })}
      </div>
      <button type="button" className={styles.arrow} onClick={() => scrollBy(200)} aria-label="Suivant">
        <Icon name="chevron-right" size={16} />
      </button>
    </div>
  );
}
