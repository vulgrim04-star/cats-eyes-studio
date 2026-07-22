import { todayISO } from './date';

/** Retourne les clientes dont l'anniversaire tombe dans les `days` prochains jours (année ignorée). */
export function upcomingBirthdays(clients, days = 7) {
  const today = new Date(`${todayISO()}T00:00:00`);

  return clients
    .filter((c) => c.birthday)
    .map((c) => {
      const bday = new Date(`${c.birthday}T00:00:00`);
      let next = new Date(today.getFullYear(), bday.getMonth(), bday.getDate());
      if (next < today) next = new Date(today.getFullYear() + 1, bday.getMonth(), bday.getDate());
      const daysUntil = Math.round((next - today) / 86400000);
      return { client: c, daysUntil };
    })
    .filter((row) => row.daysUntil <= days)
    .sort((a, b) => a.daysUntil - b.daysUntil);
}
