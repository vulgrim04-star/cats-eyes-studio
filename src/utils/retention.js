import { todayISO } from './date';

export function clientVisitStats(appointments, clientId) {
  const completed = appointments
    .filter((a) => a.clientId === clientId && a.status === 'completed')
    .sort((a, b) => (a.date < b.date ? -1 : 1));

  if (completed.length === 0) return { avgIntervalDays: null, lastVisit: null, visitCount: 0 };
  if (completed.length === 1) return { avgIntervalDays: null, lastVisit: completed[0].date, visitCount: 1 };

  let totalGap = 0;
  for (let i = 1; i < completed.length; i += 1) {
    totalGap += (new Date(`${completed[i].date}T00:00:00`) - new Date(`${completed[i - 1].date}T00:00:00`)) / 86400000;
  }
  const avgIntervalDays = Math.round(totalGap / (completed.length - 1));
  return { avgIntervalDays, lastVisit: completed[completed.length - 1].date, visitCount: completed.length };
}

/** Clientes en retard par rapport à leur fréquence habituelle de visite (plus de 7 jours de retard). */
export function winBackList(clients, appointments, thresholdDays = 7) {
  const today = new Date(`${todayISO()}T00:00:00`);

  return clients
    .map((client) => {
      const stats = clientVisitStats(appointments, client.id);
      if (!stats.lastVisit || !stats.avgIntervalDays) return null;
      const daysSinceLast = Math.round((today - new Date(`${stats.lastVisit}T00:00:00`)) / 86400000);
      const overdueDays = daysSinceLast - stats.avgIntervalDays;
      if (overdueDays <= thresholdDays) return null;
      return { client, daysSinceLast, avgIntervalDays: stats.avgIntervalDays, overdueDays };
    })
    .filter(Boolean)
    .sort((a, b) => b.overdueDays - a.overdueDays);
}
