import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import Icon from '../common/Icon';
import styles from './BottomNav.module.css';

const MAIN_ITEMS = [
  { to: '/', icon: 'dashboard', label: 'Accueil', end: true },
  { to: '/agenda', icon: 'calendar', label: 'Agenda' },
  { to: '/clientes', icon: 'users', label: 'Clientes' },
  { to: '/stock', icon: 'package', label: 'Stock' },
];

const MORE_ITEMS = [
  { to: '/finances', icon: 'euro', label: 'Finances' },
  { to: '/catalogue', icon: 'sparkles', label: 'Catalogue' },
  { to: '/parametres', icon: 'settings', label: 'Paramètres' },
  { to: '/reservation', icon: 'clipboard', label: 'Espace cliente' },
];

export default function BottomNav() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  return (
    <>
      <nav className={styles.nav}>
        {MAIN_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) => `${styles.item} ${isActive ? styles.itemActive : ''}`}
          >
            <Icon name={item.icon} size={20} />
            <span className={styles.label}>{item.label}</span>
          </NavLink>
        ))}
        <button type="button" className={styles.item} onClick={() => setOpen(true)}>
          <Icon name="more" size={20} />
          <span className={styles.label}>Plus</span>
        </button>
      </nav>

      {open && (
        <div className={styles.sheet} onMouseDown={(e) => e.target === e.currentTarget && setOpen(false)}>
          <div className={styles.sheetPanel}>
            {MORE_ITEMS.map((item) => (
              <button
                key={item.to}
                type="button"
                className={styles.sheetLink}
                onClick={() => {
                  setOpen(false);
                  navigate(item.to);
                }}
              >
                <Icon name={item.icon} size={19} />
                {item.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
