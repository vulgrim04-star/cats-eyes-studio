import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import BottomNav from './BottomNav';
import TopBar from './TopBar';
import ToastContainer from '../common/ToastContainer';
import DemoBanner from '../common/DemoBanner';
import UpdateBanner from '../common/UpdateBanner';
import { useBookingNotifications } from '../../hooks/useBookingNotifications';
import { useNotificationSync } from '../../hooks/useNotifications';
import { useAppUpdate } from '../../hooks/useAppUpdate';
import { isDemoActive } from '../../utils/demoMode';
import styles from './Layout.module.css';

export default function Layout() {
  useBookingNotifications();
  // Monté ici, et ici seulement : la synchronisation écrit dans un magasin persisté.
  useNotificationSync();
  const updateAvailable = useAppUpdate();
  const demo = isDemoActive();

  return (
    <div className={styles.app}>
      <Sidebar />
      <div className={styles.main}>
        {updateAvailable && <UpdateBanner />}
        {demo && <DemoBanner />}
        <TopBar />
        <div className={styles.content}>
          <Outlet />
        </div>
      </div>
      <BottomNav />
      <ToastContainer />
    </div>
  );
}
