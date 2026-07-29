import { useState } from 'react';
import Icon from '../common/Icon';
import BrandMark from '../common/BrandMark';
import NotificationsPanel from './NotificationsPanel';
import GlobalSearch from './GlobalSearch';
import { useAppointments, enrich, getPendingAppointments } from '../../hooks/useAppointments';
import { useProducts, lowStockProducts } from '../../hooks/useProducts';
import { useClients } from '../../hooks/useClients';
import { useSettings } from '../../hooks/useSettings';
import { useBookingRequestsStore } from '../../store/useBookingRequestsStore';
import { upcomingBirthdays } from '../../utils/birthday';
import { formatDateLong, todayISO } from '../../utils/date';
import styles from './TopBar.module.css';

export default function TopBar() {
  const { appointments } = useAppointments();
  const { products } = useProducts();
  const { clients } = useClients();
  const { salon } = useSettings();
  const [panelOpen, setPanelOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  const bookingRequests = useBookingRequestsStore((s) => s.requests);

  const pending = getPendingAppointments(appointments).map(enrich).slice(0, 5);
  const lowStock = lowStockProducts(products);
  const birthdays = upcomingBirthdays(clients, 7);
  const alertCount = bookingRequests.length + pending.length + lowStock.length + birthdays.length;

  return (
    <header className={styles.bar}>
      <div className={styles.brand}>
        <BrandMark size={34} radius="var(--radius-sm)" iconSize={17} />
        {salon.name}
      </div>

      <div className={styles.date}>{formatDateLong(todayISO())}</div>

      <div className={styles.right}>
        <button type="button" className={styles.bell} onClick={() => setSearchOpen(true)} aria-label="Rechercher">
          <Icon name="search" size={18} />
        </button>
        <div style={{ position: 'relative' }}>
          <button type="button" className={styles.bell} onClick={() => setPanelOpen((v) => !v)} aria-label="Notifications">
            <Icon name="bell" size={18} />
            {alertCount > 0 && <span className={styles.dot} />}
          </button>
          {panelOpen && (
            <NotificationsPanel
              birthdays={birthdays}
              lowStock={lowStock}
              pendingAppointments={pending}
              bookingRequests={bookingRequests}
              onClose={() => setPanelOpen(false)}
            />
          )}
        </div>
      </div>

      {searchOpen && <GlobalSearch onClose={() => setSearchOpen(false)} />}
    </header>
  );
}
