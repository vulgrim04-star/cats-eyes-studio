import { replaceAllStoredState } from './supabaseSyncStorage';

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

export class InvalidBackupError extends Error {}
export class BackupSyncError extends Error {}

/** Restaure une sauvegarde JSON.
 *
 * Lève `InvalidBackupError` si le fichier n'est pas une sauvegarde exploitable, et
 * `BackupSyncError` si les données n'ont pas pu être écrites de façon garantie — dans ce
 * dernier cas rien n'a été modifié, et l'appelant ne doit surtout pas recharger la page
 * en annonçant un succès. */
export async function restoreBackup(jsonText) {
  const parsed = JSON.parse(jsonText);
  if (!parsed || typeof parsed !== 'object' || !parsed.data) {
    throw new InvalidBackupError('Fichier de sauvegarde invalide');
  }
  const entries = STORE_KEYS.filter((key) => parsed.data[key]).map((key) => [
    key,
    JSON.stringify(parsed.data[key]),
  ]);
  if (entries.length === 0) {
    throw new InvalidBackupError('Fichier de sauvegarde invalide');
  }
  const ok = await replaceAllStoredState(entries);
  if (!ok) {
    throw new BackupSyncError("La restauration n'a pas pu être enregistrée");
  }
}
