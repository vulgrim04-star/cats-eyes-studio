import { getServiceById } from '../data/services';
import { addDaysISO, todayISO } from './date';

const ACTIVE_STATUSES = new Set(['confirmed', 'pending', 'completed']);

export function appointmentsOnDate(appointments, date) {
  return appointments.filter((a) => a.date === date);
}

export function revenueForDate(appointments, date) {
  return appointments
    .filter((a) => a.date === date && a.status === 'completed')
    .reduce((sum, a) => sum + a.price, 0);
}

export function trendPercent(current, previous) {
  if (previous === 0) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 100);
}

export function activeClientsCount(clients, appointments) {
  const since = addDaysISO(todayISO(), -90);
  const activeIds = new Set(
    appointments
      .filter((a) => a.date >= since && ACTIVE_STATUSES.has(a.status))
      .map((a) => a.clientId)
  );
  return clients.filter((c) => activeIds.has(c.id)).length;
}

export function monthPrefix(offsetMonths = 0) {
  const d = new Date();
  d.setDate(1);
  d.setMonth(d.getMonth() + offsetMonths);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export function appointmentsInMonth(appointments, prefix) {
  return appointments.filter((a) => a.date.startsWith(prefix) && a.status !== 'cancelled');
}

export function topServicesThisMonth(appointments, limit = 5) {
  const prefix = monthPrefix(0);
  const inMonth = appointments.filter((a) => a.date.startsWith(prefix) && a.status !== 'cancelled');
  const counts = new Map();
  inMonth.forEach((a) => {
    counts.set(a.serviceId, (counts.get(a.serviceId) ?? 0) + 1);
  });
  const rows = Array.from(counts.entries())
    .map(([serviceId, count]) => ({ service: getServiceById(serviceId), count }))
    .filter((r) => r.service)
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
  const max = rows[0]?.count ?? 1;
  return rows.map((r) => ({ ...r, ratio: r.count / max }));
}
