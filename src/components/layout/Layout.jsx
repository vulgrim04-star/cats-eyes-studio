import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import BottomNav from './BottomNav';
import TopBar from './TopBar';
import ToastContainer from '../common/ToastContainer';
import DemoBanner from '../common/DemoBanner';
import { useBookingNotifications } from '../../hooks/useBookingNotifications';
import { isDemoActive } from '../../utils/demoMode';
import styles from './Layout.module.css';

export default function Layout() {
  useBookingNotifications();
  const demo = isDemoActive();

  return (
    <div className={styles.app}>
      <Sidebar />
      <div className={styles.main}>
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
