const STATUS_MAP = {
  confirmed: { label: 'Confirmé', bg: 'var(--color-success-bg)', color: 'var(--status-confirmed)' },
  pending: { label: 'En attente', bg: 'var(--color-warning-bg)', color: 'var(--status-pending)' },
  completed: { label: 'Terminé', bg: 'var(--color-info-bg)', color: 'var(--status-completed)' },
  cancelled: { label: 'Annulé', bg: '#F1EAEA', color: 'var(--status-cancelled)' },
  'no-show': { label: 'No-show', bg: 'var(--color-danger-bg)', color: 'var(--status-noshow)' },
};

export default function StatusBadge({ status, size = 'md' }) {
  const meta = STATUS_MAP[status] ?? { label: status, bg: '#eee', color: '#888' };
  return (
    <span
      className="badge"
      style={{
        background: meta.bg,
        color: meta.color,
        fontSize: size === 'sm' ? '0.7rem' : undefined,
        padding: size === 'sm' ? '3px 10px' : undefined,
      }}
    >
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: meta.color, display: 'inline-block' }} />
      {meta.label}
    </span>
  );
}

export { STATUS_MAP };
