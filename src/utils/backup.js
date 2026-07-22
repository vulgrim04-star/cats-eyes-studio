const STORE_KEYS = ['ces-clients', 'ces-appointments', 'ces-products', 'ces-services', 'ces-settings', 'ces-expenses', 'ces-waitlist'];

export function downloadBackup(salonName) {
  const data = {};
  STORE_KEYS.forEach((key) => {
    const raw = localStorage.getItem(key);
    if (raw) data[key] = JSON.parse(raw);
  });
  const backup = { exportedAt: new Date().toISOString(), data };

  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  const datePart = new Date().toISOString().slice(0, 10);
  link.download = `${(salonName || 'salon').replace(/\s+/g, '-').toLowerCase()}-sauvegarde-${datePart}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/** Restaure une sauvegarde JSON ; lève une erreur si le format est invalide. */
export function restoreBackup(jsonText) {
  const parsed = JSON.parse(jsonText);
  if (!parsed || typeof parsed !== 'object' || !parsed.data) {
    throw new Error('Fichier de sauvegarde invalide');
  }
  STORE_KEYS.forEach((key) => {
    if (parsed.data[key]) {
      localStorage.setItem(key, JSON.stringify(parsed.data[key]));
    }
  });
}
