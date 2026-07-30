import { useState } from 'react';
import Icon from '../common/Icon';
import BrandMark from '../common/BrandMark';
import NotificationsPanel from './NotificationsPanel';
import GlobalSearch from './GlobalSearch';
import { useSettings } from '../../hooks/useSettings';
import { useNotifications } from '../../hooks/useNotifications';
import { formatDateLong, todayISO } from '../../utils/date';
import styles from './TopBar.module.css';

export default function TopBar() {
  const { salon } = useSettings();
  const [panelOpen, setPanelOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  // Les alertes ne sont plus recalculées ici : la barre lit le même fil que la page
  // d'historique, ce qui garantit qu'elles ne peuvent plus se contredire.
  const { active, unread, markRead, markAllRead, dismiss } = useNotifications();

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
          <button
            type="button"
            className={styles.bell}
            onClick={() => setPanelOpen((v) => !v)}
            aria-label={unread > 0 ? `Notifications, ${unread} non lue${unread > 1 ? 's' : ''}` : 'Notifications'}
          >
            <Icon name="bell" size={18} />
            {/* Un nombre plutôt qu'un point : « il se passe quelque chose » ne dit pas s'il
                faut s'interrompre maintenant. Au-delà de 9, le compte exact n'aide plus. */}
            {unread > 0 && <span className={styles.badge}>{unread > 9 ? '9+' : unread}</span>}
          </button>
          {panelOpen && (
            <NotificationsPanel
              items={active}
              unread={unread}
              onRead={markRead}
              onDismiss={dismiss}
              onReadAll={markAllRead}
              onClose={() => setPanelOpen(false)}
            />
          )}
        </div>
      </div>

      {searchOpen && <GlobalSearch onClose={() => setSearchOpen(false)} />}
    </header>
  );
}
