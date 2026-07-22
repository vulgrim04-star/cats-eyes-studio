import { useState } from 'react';
import PageHeader from '../components/common/PageHeader';
import Icon from '../components/common/Icon';
import BrandMark from '../components/common/BrandMark';
import Toggle from '../components/common/Toggle';
import { useSettings, WEEK_DAYS } from '../hooks/useSettings';
import { useToast } from '../hooks/useToast';
import { fileToResizedDataUrl } from '../utils/image';
import { CURRENCIES } from '../utils/format';
import { downloadBackup, restoreBackup } from '../utils/backup';
import { signOut, useAuthStore } from '../store/useAuthStore';
import styles from './Settings.module.css';

const DAY_LABELS = { lun: 'Lun', mar: 'Mar', mer: 'Mer', jeu: 'Jeu', ven: 'Ven', sam: 'Sam', dim: 'Dim' };

const NOTIFICATION_ROWS = [
  { key: 'autoConfirm', title: 'Confirmation automatique', subtitle: 'Envoyer un SMS/e-mail de confirmation à la création du RDV (simulation)' },
  { key: 'reminder24h', title: 'Rappel 24h avant', subtitle: 'Envoyer un rappel automatique la veille du rendez-vous (simulation)' },
  { key: 'reminder2h', title: 'Rappel 2h avant', subtitle: 'Envoyer un rappel automatique quelques heures avant le rendez-vous (simulation)' },
];

const COLOR_SWATCHES = ['#C8718A', '#8B5CF6', '#4F9DDE', '#4CA97A', '#D9A441', '#C6667A'];

export default function Settings() {
  const { salon, notifications, appearance, updateSalon, updateDayHours, toggleNotification, setThemeColor, toggleDarkMode } = useSettings();
  const { showToast } = useToast();
  const email = useAuthStore((s) => s.session?.user?.email);
  const [form, setForm] = useState(salon);
  const [dirty, setDirty] = useState(false);

  const handleLogoFile = async (file) => {
    try {
      const dataUrl = await fileToResizedDataUrl(file, 300);
      updateSalon({ logoUrl: dataUrl });
    } catch {
      showToast("Impossible de lire cette image", 'error');
    }
  };

  const update = (patch) => {
    setForm((f) => ({ ...f, ...patch }));
    setDirty(true);
  };

  const handleSave = (e) => {
    e.preventDefault();
    updateSalon(form);
    setDirty(false);
  };

  const handleImportFile = (file) => {
    if (!window.confirm('Importer cette sauvegarde remplacera toutes les données actuelles (clientes, RDV, stock, catalogue…). Continuer ?')) {
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      try {
        restoreBackup(reader.result);
        showToast('Sauvegarde restaurée, rechargement…', 'success');
        setTimeout(() => window.location.reload(), 800);
      } catch {
        showToast('Fichier de sauvegarde invalide', 'error');
      }
    };
    reader.readAsText(file);
  };

  return (
    <>
      <PageHeader title="Paramètres" subtitle="Configurez les informations et préférences du salon" />

      <div className={styles.grid}>
        <form className="card" onSubmit={handleSave}>
          <h3 className="card-title" style={{ marginBottom: 'var(--space-4)' }}>Informations du salon</h3>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="field-group">
              <label className="field-label" htmlFor="st-name">Nom du salon</label>
              <input id="st-name" className="input-field" value={form.name} onChange={(e) => update({ name: e.target.value })} />
            </div>
            <div className="field-group">
              <label className="field-label" htmlFor="st-manager">Nom de la gérante</label>
              <input id="st-manager" className="input-field" value={form.managerName} onChange={(e) => update({ managerName: e.target.value })} />
            </div>
          </div>

          <div className="field-group">
            <label className="field-label" htmlFor="st-address">Adresse</label>
            <input id="st-address" className="input-field" value={form.address} onChange={(e) => update({ address: e.target.value })} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="field-group">
              <label className="field-label" htmlFor="st-phone">Téléphone</label>
              <input id="st-phone" className="input-field" value={form.phone} onChange={(e) => update({ phone: e.target.value })} />
            </div>
            <div className="field-group">
              <label className="field-label" htmlFor="st-email">Email</label>
              <input id="st-email" type="email" className="input-field" value={form.email} onChange={(e) => update({ email: e.target.value })} />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
            <div className="field-group">
              <label className="field-label" htmlFor="st-currency">Devise</label>
              <select id="st-currency" className="input-field" value={form.currency} onChange={(e) => update({ currency: e.target.value })}>
                {CURRENCIES.map((c) => (
                  <option key={c.code} value={c.code}>{c.label}</option>
                ))}
              </select>
            </div>
            <div className="field-group">
              <label className="field-label" htmlFor="st-vat">TVA (%)</label>
              <input id="st-vat" type="number" min={0} max={100} step={0.1} className="input-field" value={form.vatRate} onChange={(e) => update({ vatRate: Number(e.target.value) })} />
            </div>
            <div className="field-group">
              <label className="field-label" htmlFor="st-buffer">Tampon entre RDV (min)</label>
              <input id="st-buffer" type="number" min={0} max={60} step={5} className="input-field" value={form.bufferMinutes} onChange={(e) => update({ bufferMinutes: Number(e.target.value) })} />
            </div>
          </div>

          <div className="field-group" style={{ marginBottom: 0 }}>
            <label className="field-label" htmlFor="st-cancellation">Politique d'annulation</label>
            <textarea
              id="st-cancellation"
              className="input-field"
              rows={3}
              value={form.cancellationPolicy}
              onChange={(e) => update({ cancellationPolicy: e.target.value })}
            />
            <p style={{ fontSize: '0.74rem', color: 'var(--color-text-muted)', marginTop: 8 }}>
              Affichée aux clientes dans l'espace de réservation en ligne.
            </p>
          </div>

          {dirty && (
            <button type="submit" className="btn btn-primary btn-sm" style={{ marginTop: 'var(--space-4)' }}>
              <Icon name="check" size={14} /> Enregistrer les modifications
            </button>
          )}
        </form>

        <div className="card">
          <h3 className="card-title" style={{ marginBottom: 'var(--space-2)' }}>Apparence</h3>

          <div className="field-group">
            <label className="field-label">Logo du salon</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
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
              Remplace l'icône ciseaux dans le menu, la barre du haut et l'espace de réservation.
            </p>
          </div>

          <p style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', marginBottom: 'var(--space-4)' }}>
            Couleur principale de l'interface.
          </p>
          <div className={styles.colorRow}>
            <input
              type="color"
              className={styles.colorPicker}
              value={appearance.themeColor}
              onChange={(e) => setThemeColor(e.target.value)}
              aria-label="Couleur principale"
            />
            <div className={styles.swatches}>
              {COLOR_SWATCHES.map((color) => (
                <button
                  key={color}
                  type="button"
                  className={styles.swatch}
                  style={{ background: color }}
                  onClick={() => setThemeColor(color)}
                  aria-label={color}
                />
              ))}
            </div>
          </div>

          <div className={styles.prefRow} style={{ marginTop: 'var(--space-4)', paddingTop: 'var(--space-4)', borderTop: '1px solid var(--color-border)' }}>
            <div className={styles.prefText}>
              <div className={styles.prefTitle}>Mode sombre</div>
              <div className={styles.prefSubtitle}>Interface à fond sombre, plus confortable en soirée</div>
            </div>
            <Toggle active={appearance.darkMode} onChange={toggleDarkMode} label="Mode sombre" />
          </div>
        </div>
      </div>

      <div className="card" style={{ marginTop: 'var(--space-5)' }}>
        <h3 className="card-title" style={{ marginBottom: 'var(--space-2)' }}>Horaires d'ouverture</h3>
        <p style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', marginBottom: 'var(--space-4)' }}>
          Ces horaires déterminent les créneaux proposés dans l'espace de réservation en ligne.
        </p>
        <div className={styles.hoursTable}>
          {WEEK_DAYS.map((day) => {
            const sched = salon.hours[day];
            return (
              <div key={day} className={styles.hoursRow}>
                <span className={styles.hoursDay}>{DAY_LABELS[day]}</span>
                <input
                  type="time"
                  className={styles.hoursInput}
                  value={sched.open}
                  disabled={sched.closed}
                  onChange={(e) => updateDayHours(day, { open: e.target.value })}
                />
                <input
                  type="time"
                  className={styles.hoursInput}
                  value={sched.close}
                  disabled={sched.closed}
                  onChange={(e) => updateDayHours(day, { close: e.target.value })}
                />
                <Toggle
                  active={!sched.closed}
                  onChange={(active) => updateDayHours(day, { closed: !active })}
                  label={sched.closed ? 'Ouvrir ce jour' : 'Fermer ce jour'}
                />
              </div>
            );
          })}
        </div>
      </div>

      <div className="card" style={{ marginTop: 'var(--space-5)' }}>
        <h3 className="card-title" style={{ marginBottom: 'var(--space-2)' }}>Préférences de notifications</h3>
        {NOTIFICATION_ROWS.map((row) => (
          <div key={row.key} className={styles.prefRow}>
            <div className={styles.prefText}>
              <div className={styles.prefTitle}>{row.title}</div>
              <div className={styles.prefSubtitle}>{row.subtitle}</div>
            </div>
            <Toggle active={notifications[row.key]} onChange={() => toggleNotification(row.key)} label={row.title} />
          </div>
        ))}
      </div>

      <div className="card" style={{ marginTop: 'var(--space-5)' }}>
        <h3 className="card-title" style={{ marginBottom: 'var(--space-2)' }}>Compte</h3>
        <div className={styles.prefRow}>
          <div className={styles.prefText}>
            <div className={styles.prefTitle}>Connectée</div>
            <div className={styles.prefSubtitle}>{email}</div>
          </div>
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => signOut()}>
            <Icon name="logout" size={14} /> Se déconnecter
          </button>
        </div>
      </div>

      <div className="card" style={{ marginTop: 'var(--space-5)' }}>
        <h3 className="card-title" style={{ marginBottom: 'var(--space-2)' }}>Sauvegarde des données</h3>
        <p style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', marginBottom: 'var(--space-4)' }}>
          Vos données sont synchronisées sur votre compte cloud et retrouvées automatiquement à chaque connexion. Téléchargez aussi une sauvegarde régulièrement par sécurité.
        </p>
        <div style={{ display: 'flex', gap: 'var(--space-3)', flexWrap: 'wrap' }}>
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => downloadBackup(salon.name)}>
            <Icon name="download" size={14} /> Télécharger la sauvegarde
          </button>
          <label htmlFor="backup-import" className="btn btn-ghost btn-sm" style={{ cursor: 'pointer' }}>
            <Icon name="upload" size={14} /> Importer une sauvegarde
          </label>
          <input
            id="backup-import"
            type="file"
            accept="application/json"
            style={{ display: 'none' }}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleImportFile(file);
              e.target.value = '';
            }}
          />
        </div>
      </div>
    </>
  );
}
