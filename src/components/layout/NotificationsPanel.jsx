import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import Icon from '../common/Icon';
import { KIND } from '../../utils/notificationFeed';
import styles from './NotificationsPanel.module.css';

/** Apparence par type d'alerte. La demande de réservation porte la couleur d'accent :
 *  c'est la seule qu'une cliente attend, elle doit se distinguer du reste. */
const LOOK = {
  [KIND.booking]: { icon: 'clipboard', tone: 'rose' },
  [KIND.appointment]: { icon: 'clock', tone: '' },
  [KIND.birthday]: { icon: 'gift', tone: 'rose' },
  [KIND.stock]: { icon: 'package', tone: 'danger' },
};

/** Panneau de la cloche : les alertes en cours, chacune supprimable.
 *
 *  Les entrées sont désormais des objets enregistrés et non plus des lignes recalculées :
 *  c'est ce qui permet de les marquer lues, de les supprimer une par une, et de retrouver
 *  les précédentes dans l'historique. */
export default function NotificationsPanel({ items, unread, onRead, onDismiss, onReadAll, onClose }) {
  const navigate = useNavigate();

  const open = (notification) => {
    onRead(notification.id);
    onClose();
    navigate(notification.href || '/');
  };

  // Voile ET panneau dans le MÊME portail.
  //
  // Le panneau vivait auparavant dans la barre du haut, qui est `position: sticky` avec
  // `z-index: 80` : elle crée donc un contexte d'empilement, et le `z-index: 151` du panneau
  // n'y valait que 80 vis-à-vis du document. Le voile, lui, était déjà porté dans <body> à
  // 150 — il recouvrait le panneau. Résultat : la liste s'affichait mais aucun clic ne
  // l'atteignait. Sortis tous les deux du header, les z-index se comparent enfin entre eux.
  return createPortal(
    <>
      <div className={styles.backdrop} onClick={onClose} />
      <div className={styles.panel} role="dialog" aria-label="Notifications">
        <div className={styles.header}>
          <div className={styles.title}>Notifications</div>
          {unread > 0 && (
            <button type="button" className={styles.headerAction} onClick={onReadAll}>
              Tout marquer comme lu
            </button>
          )}
        </div>

        {items.length === 0 && <div className={styles.empty}>Aucune alerte pour le moment.</div>}

        {items.map((notification) => {
          const look = LOOK[notification.kind] ?? { icon: 'bell', tone: '' };
          return (
            <div key={notification.id} className={styles.row}>
              {!notification.readAt && <span className={styles.unreadDot} aria-label="Non lue" />}
              <button type="button" className={styles.rowMain} onClick={() => open(notification)}>
                <span className={`${styles.iconWrap} ${look.tone}`}>
                  <Icon name={look.icon} size={15} />
                </span>
                <span className={styles.text}>
                  <span className={notification.readAt ? styles.rowTitle : styles.rowTitleUnread}>
                    {notification.title}
                  </span>
                  <span className={styles.rowSubtitle}>{notification.body}</span>
                </span>
              </button>
              <button
                type="button"
                className={styles.dismiss}
                onClick={() => onDismiss(notification.id)}
                aria-label={`Supprimer : ${notification.title}`}
                title="Supprimer"
              >
                <Icon name="x" size={14} />
              </button>
            </div>
          );
        })}

        <button
          type="button"
          className={styles.footerLink}
          onClick={() => {
            onClose();
            navigate('/notifications');
          }}
        >
          Voir tout l'historique
        </button>
      </div>
    </>,
    document.body
  );
}
