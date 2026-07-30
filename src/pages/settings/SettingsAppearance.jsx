import SettingsPage from '../../components/settings/SettingsPage';
import Icon from '../../components/common/Icon';
import Toggle from '../../components/common/Toggle';
import BrandMark from '../../components/common/BrandMark';
import { useSettings } from '../../hooks/useSettings';
import { useToast } from '../../hooks/useToast';
import { fileToResizedDataUrl } from '../../utils/image';
import styles from '../Settings.module.css';

export default function SettingsAppearance() {
  const { salon, appearance, updateSalon, toggleDarkMode } = useSettings();
  const { showToast } = useToast();

  const handleLogoFile = async (file) => {
    try {
      const dataUrl = await fileToResizedDataUrl(file, 300);
      updateSalon({ logoUrl: dataUrl });
    } catch {
      showToast('Impossible de lire cette image', 'error');
    }
  };

  return (
    <SettingsPage title="Apparence" subtitle="Logo du salon et thème de l'interface">
      <div className="card">
        <div className="field-group">
          <label className="field-label">Logo du salon</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', flexWrap: 'wrap' }}>
            <BrandMark size={56} radius="var(--radius-md)" iconSize={26} />
            <label htmlFor="logo-upload" className="btn btn-secondary btn-sm" style={{ cursor: 'pointer' }}>
              <Icon name="camera" size={13} /> {salon.logoUrl ? 'Changer le logo' : 'Ajouter un logo'}
            </label>
            <input
              id="logo-upload"
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleLogoFile(file);
                e.target.value = '';
              }}
            />
          </div>
          <p style={{ fontSize: '0.74rem', color: 'var(--color-text-muted)', marginTop: 8 }}>
            Remplace l'icône dans le menu, la barre du haut et l'espace de réservation.
          </p>
        </div>

        <div
          className={styles.prefRow}
          style={{ marginTop: 'var(--space-4)', paddingTop: 'var(--space-4)', borderTop: '1px solid var(--color-border)' }}
        >
          <div className={styles.prefText}>
            <div className={styles.prefTitle}>Mode sombre</div>
            <div className={styles.prefSubtitle}>Interface à fond sombre, plus confortable en soirée</div>
          </div>
          <Toggle active={appearance.darkMode} onChange={toggleDarkMode} label="Mode sombre" />
        </div>
      </div>
    </SettingsPage>
  );
}
