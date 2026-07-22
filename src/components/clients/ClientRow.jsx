import { useNavigate } from 'react-router-dom';
import Icon from '../common/Icon';
import LoyaltyBadge from './LoyaltyBadge';
import { initials, fullName } from '../../utils/format';
import styles from './ClientRow.module.css';

export default function ClientRow({ client, completedCount = 0 }) {
  const navigate = useNavigate();
  return (
    <button type="button" className={styles.row} onClick={() => navigate(`/clientes/${client.id}`)}>
      {client.photoUrl ? (
        <img src={client.photoUrl} alt="" className={styles.avatarImg} />
      ) : (
        <span className={styles.avatar}>{initials(client.firstName, client.lastName)}</span>
      )}
      <div className={styles.info}>
        <div className={styles.name}>
          {fullName(client)}
          <span
            className={`${styles.consentDot} ${!client.consentSigned ? styles.unsigned : ''}`}
            title={client.consentSigned ? 'Consentement RGPD signé' : 'Consentement RGPD non signé'}
          />
          <LoyaltyBadge completedCount={completedCount} size="sm" />
        </div>
        <div className={styles.contact}>
          <span>{client.phone}</span>
          <span>{client.email}</span>
        </div>
      </div>
      <Icon name="chevron-right" size={18} className={styles.chevron} />
    </button>
  );
}
