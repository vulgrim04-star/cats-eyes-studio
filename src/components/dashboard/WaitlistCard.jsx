import Icon from '../common/Icon';
import EmptyState from '../common/EmptyState';
import { useWaitlist } from '../../hooks/useWaitlist';
import { formatDateShort } from '../../utils/date';

export default function WaitlistCard() {
  const { entries, removeEntry } = useWaitlist();

  if (entries.length === 0) {
    return (
      <div className="card">
        <h3 className="card-title" style={{ marginBottom: 'var(--space-2)' }}>Liste d'attente</h3>
        <EmptyState icon="clock" title="Personne en attente" subtitle="Les demandes de créneaux complets apparaîtront ici." />
      </div>
    );
  }

  return (
    <div className="card">
      <h3 className="card-title" style={{ marginBottom: 'var(--space-3)' }}>Liste d'attente ({entries.length})</h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {entries.map((entry) => (
          <div key={entry.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 0', borderBottom: '1px solid var(--color-border)' }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: '0.84rem', fontWeight: 600, color: 'var(--color-text)' }}>
                {entry.firstName} {entry.lastName}
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>
                {entry.serviceName} · souhaité le {formatDateShort(entry.preferredDate)} · {entry.phone}
              </div>
            </div>
            <button
              type="button"
              onClick={() => removeEntry(entry.id)}
              aria-label="Retirer"
              style={{ width: 28, height: 28, borderRadius: '50%', border: 'none', background: 'var(--color-cream)', color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
            >
              <Icon name="x" size={13} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
