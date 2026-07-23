import Icon from '../common/Icon';
import EmptyState from '../common/EmptyState';
import { useBookingRequests } from '../../hooks/useBookingRequests';
import { formatDateShort } from '../../utils/date';
import { formatPrice } from '../../utils/format';

export default function BookingRequestsCard() {
  const { requests, loading, confirm, decline } = useBookingRequests();

  if (loading) return null;

  if (requests.length === 0) {
    return (
      <div className="card">
        <h3 className="card-title" style={{ marginBottom: 'var(--space-2)' }}>Demandes en attente</h3>
        <EmptyState icon="clipboard" title="Aucune demande" subtitle="Les RDV pris via ton lien de réservation en ligne apparaîtront ici." />
      </div>
    );
  }

  return (
    <div className="card">
      <h3 className="card-title" style={{ marginBottom: 'var(--space-3)' }}>Demandes en attente ({requests.length})</h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {requests.map((request) => (
          <div key={request.id} style={{ padding: '10px 0', borderBottom: '1px solid var(--color-border)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: '0.84rem', fontWeight: 600, color: 'var(--color-text)' }}>
                  {request.first_name} {request.last_name}
                </div>
                <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>
                  {request.service_name} · {formatDateShort(request.date)} à {request.time} · {formatPrice(request.price)}
                </div>
                <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>
                  {request.phone}{request.email ? ` · ${request.email}` : ''}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 6, flexShrink: 0, alignItems: 'flex-start' }}>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => confirm(request)}
                  title="Confirmer"
                >
                  <Icon name="check" size={13} />
                </button>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() => decline(request)}
                  title="Refuser"
                >
                  <Icon name="x" size={13} />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
