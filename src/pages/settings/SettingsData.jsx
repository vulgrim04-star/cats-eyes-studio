import { useState } from 'react';
import SettingsPage from '../../components/settings/SettingsPage';
import Icon from '../../components/common/Icon';
import { useSettings } from '../../hooks/useSettings';
import { useClients } from '../../hooks/useClients';
import { useToast } from '../../hooks/useToast';
import { countInlinePhotos, migrateInlinePhotos } from '../../utils/photoStorage';
import { downloadBackup, restoreBackup, BackupSyncError } from '../../utils/backup';

export default function SettingsData() {
  const { salon } = useSettings();
  const { clients, updatePhotoSession } = useClients();
  const { showToast } = useToast();
  const [migrating, setMigrating] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const inlinePhotoCount = countInlinePhotos(clients);

  const handleMigratePhotos = async () => {
    setMigrating(true);
    const { migrated, failed } = await migrateInlinePhotos(clients, updatePhotoSession);
    setMigrating(false);
    if (failed > 0) {
      showToast(`${migrated} photo(s) optimisée(s), ${failed} en échec. Réessaie plus tard.`, 'warning');
    } else {
      showToast(`${migrated} photo(s) optimisée(s).`, 'success');
    }
  };

  const handleImportFile = (file) => {
    if (!window.confirm('Importer cette sauvegarde remplacera toutes les données actuelles (clientes, RDV, stock, catalogue…). Continuer ?')) {
      return;
    }
    const reader = new FileReader();
    reader.onload = async () => {
      setRestoring(true);
      try {
        await restoreBackup(reader.result);
        showToast('Sauvegarde restaurée, rechargement…', 'success');
        setTimeout(() => window.location.reload(), 800);
      } catch (err) {
        setRestoring(false);
        // Distinguer les deux échecs : un fichier illisible se corrige en choisissant le
        // bon fichier, une synchronisation qui échoue se corrige en réessayant plus tard.
        if (err instanceof BackupSyncError) {
          showToast(
            "La restauration a échoué : vos données actuelles n'ont pas été modifiées. Vérifiez votre connexion et réessayez.",
            'error'
          );
        } else {
          showToast('Fichier de sauvegarde invalide', 'error');
        }
      }
    };
    reader.readAsText(file);
  };

  return (
    <SettingsPage title="Données" subtitle="Sauvegarde, restauration et optimisation des photos">
      <div className="card">
        <h3 className="card-title" style={{ marginBottom: 'var(--space-2)' }}>Sauvegarde des données</h3>
        <p style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', marginBottom: 'var(--space-2)' }}>
          Vos données sont synchronisées sur votre compte cloud et retrouvées automatiquement à chaque connexion.
          Téléchargez aussi une sauvegarde régulièrement par sécurité.
        </p>
        <p style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', marginBottom: 'var(--space-4)' }}>
          Le fichier contient vos clientes, rendez-vous, prestations, stock, dépenses et paramètres, ainsi que les
          signatures et le logo. <strong>Les photos avant/après n'y sont pas incluses</strong> : elles restent
          stockées sur votre espace cloud privé.
        </p>
        <div style={{ display: 'flex', gap: 'var(--space-3)', flexWrap: 'wrap' }}>
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => downloadBackup(salon.name)}>
            <Icon name="download" size={14} /> Télécharger la sauvegarde
          </button>
          <label
            htmlFor="backup-import"
            className="btn btn-ghost btn-sm"
            style={{ cursor: restoring ? 'default' : 'pointer', opacity: restoring ? 0.5 : 1 }}
          >
            <Icon name="upload" size={14} /> {restoring ? 'Restauration…' : 'Importer une sauvegarde'}
          </label>
          <input
            id="backup-import"
            type="file"
            accept="application/json"
            disabled={restoring}
            style={{ display: 'none' }}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleImportFile(file);
              e.target.value = '';
            }}
          />
        </div>
      </div>

      {inlinePhotoCount > 0 && (
        <div className="card" style={{ marginTop: 'var(--space-5)' }}>
          <h3 className="card-title" style={{ marginBottom: 'var(--space-2)' }}>Optimisation des photos</h3>
          <p style={{ fontSize: '0.82rem', color: 'var(--color-text-soft)', marginBottom: 'var(--space-4)' }}>
            {inlinePhotoCount} photo{inlinePhotoCount > 1 ? 's' : ''} {inlinePhotoCount > 1 ? 'sont' : 'est'} encore
            stockée{inlinePhotoCount > 1 ? 's' : ''} dans la fiche cliente elle-même. Les déplacer vers l'espace
            photo dédié rend l'application nettement plus rapide, surtout sur mobile. Vos photos restent privées et
            accessibles exactement comme aujourd'hui.
          </p>
          <button type="button" className="btn btn-primary btn-sm" onClick={handleMigratePhotos} disabled={migrating}>
            {migrating ? 'Optimisation en cours…' : 'Optimiser maintenant'}
          </button>
        </div>
      )}
    </SettingsPage>
  );
}
