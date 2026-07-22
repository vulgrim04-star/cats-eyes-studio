import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import BottomNav from './BottomNav';
import TopBar from './TopBar';
import ToastContainer from '../common/ToastContainer';
import styles from './Layout.module.css';

export default function Layout() {
  return (
    <div className={styles.app}>
      <Sidebar />
      <div className={styles.main}>
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
