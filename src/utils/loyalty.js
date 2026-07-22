export function loyaltyTier(completedCount) {
  if (completedCount >= 6) return { id: 'vip', label: 'VIP', color: 'var(--color-rose-dark)', bg: 'var(--color-rose-light)' };
  if (completedCount >= 2) return { id: 'regular', label: 'Régulière', color: 'var(--color-success)', bg: 'var(--color-success-bg)' };
  return { id: 'new', label: 'Nouvelle', color: 'var(--color-info)', bg: 'var(--color-info-bg)' };
}

export function completedCountForClient(appointments, clientId) {
  return appointments.filter((a) => a.clientId === clientId && a.status === 'completed').length;
}
