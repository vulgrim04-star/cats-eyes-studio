import { useState } from 'react';
import PageHeader from '../components/common/PageHeader';
import Icon from '../components/common/Icon';
import Toggle from '../components/common/Toggle';
import { useSettings, WEEK_DAYS } from '../hooks/useSettings';
import { CURRENCIES } from '../utils/format';
import styles from './Settings.module.css';

const DAY_LABELS = { lun: 'Lun', mar: 'Mar', mer: 'Mer', jeu: 'Jeu', ven: 'Ven', sam: 'Sam', dim: 'Dim' };

const NOTIFICATION_ROWS = [
  { key: 'autoConfirm', title: 'Confirmation automatique', subtitle: 'Envoyer un SMS/e-mail de confirmation à la création du RDV (simulation)' },
  { key: 'reminder24h', title: 'Rappel 24h avant', subtitle: 'Envoyer un rappel automatique la veille du rendez-vous (simulation)' },
  { key: 'reminder2h', title: 'Rappel 2h avant', subtitle: 'Envoyer un rappel automatique quelques heures avant le rendez-vous (simulation)' },
];

const COLOR_SWATCHES = ['#C8718A', '#8B5CF6', '#4F9DDE', '#4CA97A', '#D9A441', '#C6667A'];

export default function Settings() {
  const { salon, notifications, appearance, updateSalon, updateDayHours, toggleNotification, setThemeColor } = useSettings();
  const [form, setForm] = useState(salon);
  const [dirty, setDirty] = useState(false);

  const update = (patch) => {
    setForm((f) => ({ ...f, ...patch }));
    setDirty(true);
  };

  const handleSave = (e) => {
    e.preventDefault();
    updateSalon(form);
    setDirty(false);
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

          <div className="field-group" style={{ marginBottom: dirty ? 'var(--space-4)' : 0 }}>
            <label className="field-label" htmlFor="st-currency">Devise</label>
            <select id="st-currency" className="input-field" value={form.currency} onChange={(e) => update({ currency: e.target.value })}>
              {CURRENCIES.map((c) => (
                <option key={c.code} value={c.code}>{c.label}</option>
              ))}
            </select>
          </div>

          {dirty && (
            <button type="submit" className="btn btn-primary btn-sm">
              <Icon name="check" size={14} /> Enregistrer les modifications
            </button>
          )}
        </form>

        <div className="card">
          <h3 className="card-title" style={{ marginBottom: 'var(--space-2)' }}>Apparence</h3>
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
    </>
  );
}
