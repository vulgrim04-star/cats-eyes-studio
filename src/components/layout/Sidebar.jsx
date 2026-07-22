import { NavLink } from 'react-router-dom';
import Icon from '../common/Icon';
import { useSettings } from '../../hooks/useSettings';
import styles from './Sidebar.module.css';

const NAV_ITEMS = [
  { to: '/', icon: 'dashboard', label: 'Dashboard', end: true },
  { to: '/agenda', icon: 'calendar', label: 'Agenda' },
  { to: '/clientes', icon: 'users', label: 'Clientes' },
  { to: '/stock', icon: 'package', label: 'Stock' },
  { to: '/finances', icon: 'euro', label: 'Finances' },
  { to: '/catalogue', icon: 'sparkles', label: 'Catalogue' },
  { to: '/parametres', icon: 'settings', label: 'Paramètres' },
];

function initialsOf(name) {
  return name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

export default function Sidebar() {
  const { salon } = useSettings();
  const nameParts = salon.name.split(' ');
  const brandSub = nameParts.length > 1 ? nameParts.pop() : '';
  const brandFirst = nameParts.join(' ') || salon.name;

  return (
    <aside className={styles.sidebar}>
      <div className={styles.brand}>
        <span className={styles.brandMark}>
          <Icon name="scissors" size={20} />
        </span>
        <div>
          <div className={styles.brandName}>{brandFirst}</div>
          <div className={styles.brandSub}>{brandSub}</div>
        </div>
      </div>

      <nav className={styles.nav}>
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) => `${styles.navLink} ${isActive ? styles.navLinkActive : ''}`}
          >
            <Icon name={item.icon} size={19} />
            {item.label}
          </NavLink>
        ))}
        <NavLink
          to="/reservation"
          className={({ isActive }) => `${styles.navLink} ${isActive ? styles.navLinkActive : ''}`}
        >
          <Icon name="clipboard" size={19} />
          Espace cliente
        </NavLink>
      </nav>

      <div className={styles.spacer} />

      <div className={styles.footer}>
        <span className={styles.avatar}>{initialsOf(salon.managerName)}</span>
        <div>
          <div className={styles.footerName}>{salon.managerName}</div>
          <div className={styles.footerRole}>Gérante</div>
        </div>
      </div>
    </aside>
  );
}
