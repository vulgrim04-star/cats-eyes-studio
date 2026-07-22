import { useNavigate } from 'react-router-dom';
import Icon from '../common/Icon';
import EmptyState from '../common/EmptyState';
import { fullName } from '../../utils/format';

export default function WinBackList({ rows }) {
  const navigate = useNavigate();

  return (
    <div className="card">
      <h3 className="card-title" style={{ marginBottom: 'var(--space-2)' }}>Clientes à relancer</h3>
      {rows.length === 0 ? (
        <EmptyState icon="check-circle" title="Personne à relancer" subtitle="Toutes vos clientes reviennent selon leur fréquence habituelle." />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 'var(--space-3)' }}>
          {rows.slice(0, 5).map(({ client, daysSinceLast, avgIntervalDays }) => (
            <button
              key={client.id}
              type="button"
              onClick={() => navigate(`/clientes/${client.id}`)}
              style={{
                display: 'flex', alignItems: 'center', gap: 12, padding: '10px 4px',
                border: 'none', background: 'none', textAlign: 'left', width: '100%',
                borderRadius: 'var(--radius-md)',
              }}
            >
              <span style={{
                width: 32, height: 32, borderRadius: '50%', background: 'var(--color-warning-bg)',
                color: 'var(--color-warning)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              }}>
                <Icon name="alert-triangle" size={14} />
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '0.84rem', fontWeight: 600, color: 'var(--color-text)' }}>{fullName(client)}</div>
                <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>
                  Dernière visite il y a {daysSinceLast}j · habituellement toutes les {avgIntervalDays}j
                </div>
              </div>
              <Icon name="chevron-right" size={16} />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
