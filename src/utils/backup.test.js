import { describe, expect, it, vi, beforeEach } from 'vitest';

// La restauration passe volontairement par le stockage synchronisé plutôt que par
// localStorage : c'est tout l'objet du correctif, et c'est donc ce qu'on vérifie ici.
const replaceAllStoredState = vi.fn();
vi.mock('./supabaseSyncStorage', () => ({
  replaceAllStoredState: (...args) => replaceAllStoredState(...args),
}));

const { restoreBackup, InvalidBackupError, BackupSyncError } = await import('./backup');

const validBackup = JSON.stringify({
  exportedAt: '2026-07-01T10:00:00.000Z',
  data: {
    'ces-clients': { state: { clients: [{ id: 'c1' }] }, version: 0 },
    'ces-settings': { state: { salon: { name: 'Test' } }, version: 0 },
  },
});

beforeEach(() => {
  replaceAllStoredState.mockReset();
});

describe('restoreBackup', () => {
  it('confie les clés présentes au stockage synchronisé', async () => {
    replaceAllStoredState.mockResolvedValue(true);
    await restoreBackup(validBackup);

    const entries = replaceAllStoredState.mock.calls[0][0];
    expect(entries.map(([key]) => key)).toEqual(['ces-clients', 'ces-settings']);
    expect(JSON.parse(entries[0][1]).state.clients).toHaveLength(1);
  });

  it('rejette un fichier qui n\'est pas une sauvegarde', async () => {
    await expect(restoreBackup('{"rien":1}')).rejects.toThrow(InvalidBackupError);
    await expect(restoreBackup(JSON.stringify({ data: {} }))).rejects.toThrow(InvalidBackupError);
    expect(replaceAllStoredState).not.toHaveBeenCalled();
  });

  // Sans ça, l'écran annoncerait « Sauvegarde restaurée » puis rechargerait sur les anciennes
  // données relues depuis le cloud — le bug que ce correctif ferme.
  it('signale un échec distinct quand l\'écriture n\'est pas garantie', async () => {
    replaceAllStoredState.mockResolvedValue(false);
    await expect(restoreBackup(validBackup)).rejects.toThrow(BackupSyncError);
  });
});
