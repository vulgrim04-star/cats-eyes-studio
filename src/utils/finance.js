import { getServiceById } from '../data/services';
import { addDaysISO, todayISO } from './date';

export function completedInRange(appointments, startISO, endISO) {
  return appointments.filter((a) => a.status === 'completed' && a.date >= startISO && a.date <= endISO);
}

export function revenueInRange(appointments, startISO, endISO) {
  return completedInRange(appointments, startISO, endISO).reduce((sum, a) => sum + a.price, 0);
}

export function dailySeries(appointments, days) {
  const today = todayISO();
  const start = addDaysISO(today, -(days - 1));
  const series = [];
  for (let i = 0; i < days; i += 1) {
    const date = addDaysISO(start, i);
    series.push({ date, total: revenueInRange(appointments, date, date) });
  }
  return series;
}

export function revenueByCategory(appointments, startISO, endISO) {
  const rows = completedInRange(appointments, startISO, endISO);
  const totals = new Map();
  rows.forEach((a) => {
    const service = getServiceById(a.serviceId);
    if (!service) return;
    totals.set(service.category, (totals.get(service.category) ?? 0) + a.price);
  });
  const grandTotal = Array.from(totals.values()).reduce((s, v) => s + v, 0);
  return Array.from(totals.entries())
    .map(([category, total]) => ({ category, total, ratio: grandTotal === 0 ? 0 : total / grandTotal }))
    .sort((a, b) => b.total - a.total);
}
