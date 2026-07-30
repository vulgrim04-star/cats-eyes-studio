import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import PageHeader from '../components/common/PageHeader';
import Icon from '../components/common/Icon';
import EmptyState from '../components/common/EmptyState';
import { useNotifications } from '../hooks/useNotifications';
import { KIND } from '../utils/notificationFeed';
import styles from './Notifications.module.css';

const LOOK = {
  [KIND.booking]: { icon: 'clipboard', tone: 'rose', label: 'Réservation en ligne' },
  [KIND.appointment]: { icon: 'clock', tone: '', label: 'Rendez-vous' },
  [KIND.birthday]: { icon: 'gift', tone: 'rose', label: 'Anniversaire' },
  [KIND.stock]: { icon: 'package', tone: 'danger', label: 'Stock' },
};

const FILTERS = [
  { key: 'unread', label: 'Non lues' },
  { key: 'active', label: 'En cours' },
  { key: 'resolved', label: 'Traitées' },
];

/** Date lisible sans dépendre d'un utilitaire de formatage métier : ici on veut le moment
 *  où l'alerte est apparue, pas une date de rendez-vous. */
function whenText(iso) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

export default function Notifications() {
  const navigate = useNavigate();
  const { active, resolved, unread, markRead, markAllRead, dismiss, clearHistory } = useNotifications();
  const [filter, setFilter] = useState('active');

  const list = useMemo(() => {
    if (filter === 'resolved') return resolved;
    if (filter === 'unread') return active.filter((n) => !n.readAt);
    return active;
  }, [filter, active, resolved]);

  const counts = { unread, active: active.length, resolved: resolved.length };

  const open = (notification) => {
    markRead(notification.id);
    navigate(notification.href || '/');
  };

  return (
    <div>
      <PageHeader
        title="Notifications"
        subtitle="Tout ce que l'application a signalé, y compris ce qui est déjà traité."
      />

      <div className={styles.toolbar}>
        <div className={styles.filters} role="tablist" aria-label="Filtrer les notifications">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              type="button"
              role="tab"
              aria-selected={filter === f.key}
              className={`${styles.filter} ${filter === f.key ? styles.filterActive : ''}`}
              onClick={() => setFilter(f.key)}
            >
              {f.label}
              <span className={styles.filterCount}>{counts[f.key]}</span>
            </button>
          ))}
        </div>

        <div className={styles.actions}>
          {unread > 0 && (
            <button type="button" className="btn btn-secondary btn-sm" onClick={markAllRead}>
              <Icon name="check" size={14} /> Tout marquer comme lu
            </button>
          )}
          {filter === 'resolved' && resolved.length > 0 && (
            <button type="button" className="btn btn-ghost btn-sm" onClick={clearHistory}>
              <Icon name="trash" size={14} /> Vider l'historique
            </button>
          )}
        </div>
      </div>

      {list.length === 0 ? (
        <div className="card">
          <EmptyState
            icon="bell"
            title={filter === 'resolved' ? 'Aucune notification traitée' : 'Aucune notification'}
            subtitle={
              filter === 'resolved'
                ? "Les alertes disparaissent d'ici une fois le rendez-vous confirmé ou le stock réapprovisionné."
                : 'Les demandes de réservation, rendez-vous à confirmer, anniversaires et alertes de stock arrivent ici.'
            }
          />
        </div>
      ) : (
        <div className="card" style={{ padding: 'var(--space-2)' }}>
          {list.map((notification) => {
            const look = LOOK[notification.kind] ?? { icon: 'bell', tone: '', label: 'Alerte' };
            return (
              <div key={notification.id} className={styles.row}>
                <button type="button" className={styles.rowMain} onClick={() => open(notification)}>
                  <span className={`${styles.iconWrap} ${look.tone}`}>
                    <Icon name={look.icon} size={16} />
                  </span>
                  <span className={styles.text}>
                    <span className={styles.rowMeta}>
                      {look.label} · {whenText(notification.createdAt)}
                      {notification.resolvedAt && <span className={styles.resolvedTag}>Traitée</span>}
                    </span>
                    <span className={notification.readAt ? styles.rowTitle : styles.rowTitleUnread}>
                      {notification.title}
                    </span>
                    <span className={styles.rowSubtitle}>{notification.body}</span>
                  </span>
                </button>
                <button
                  type="button"
                  className={styles.dismiss}
                  onClick={() => dismiss(notification.id)}
                  aria-label={`Supprimer : ${notification.title}`}
                  title="Supprimer"
                >
                  <Icon name="x" size={15} />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
