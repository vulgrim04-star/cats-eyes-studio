import { addMinutesToTime } from './date';
import { fullName } from './format';

function pad(n) {
  return String(n).padStart(2, '0');
}

function formatICSDateTime(date, time) {
  const [y, m, d] = date.split('-');
  const [h, mi] = time.split(':');
  return `${y}${m}${d}T${h}${mi}00`;
}

function escapeText(text = '') {
  return String(text).replace(/[\\;,]/g, (m) => `\\${m}`).replace(/\n/g, '\\n');
}

export function generateICS(appointments, salonName) {
  const now = new Date();
  const stamp = `${now.getUTCFullYear()}${pad(now.getUTCMonth() + 1)}${pad(now.getUTCDate())}T${pad(now.getUTCHours())}${pad(now.getUTCMinutes())}${pad(now.getUTCSeconds())}Z`;

  const events = appointments.map((apt) => {
    const start = formatICSDateTime(apt.date, apt.time);
    const end = formatICSDateTime(apt.date, addMinutesToTime(apt.time, apt.duration));
    const clientName = apt.client ? fullName(apt.client) : 'Cliente';
    return [
      'BEGIN:VEVENT',
      `UID:${apt.id}@catseyesstudio`,
      `DTSTAMP:${stamp}`,
      `DTSTART:${start}`,
      `DTEND:${end}`,
      `SUMMARY:${escapeText(`${clientName} — ${apt.service?.name ?? ''}`)}`,
      `DESCRIPTION:${escapeText(`Esthéticienne : ${apt.staff?.name ?? ''}`)}`,
      'END:VEVENT',
    ].join('\r\n');
  });

  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    `PRODID:-//${salonName}//FR`,
    'CALSCALE:GREGORIAN',
    ...events,
    'END:VCALENDAR',
  ].join('\r\n');
}

export function downloadICS(filename, content) {
  const blob = new Blob([content], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
