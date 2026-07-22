export function downloadCsv(filename, header, rows) {
  const escape = (value) => `"${String(value ?? '').replace(/"/g, '""')}"`;
  const csv = [header, ...rows].map((row) => row.map(escape).join(';')).join('\r\n');
  // BOM UTF-8 pour qu'Excel affiche correctement les accents
  const blob = new Blob([`﻿${csv}`], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
