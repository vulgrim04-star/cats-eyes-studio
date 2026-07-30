import { useState } from 'react';
import SettingsPage from '../../components/settings/SettingsPage';
import Icon from '../../components/common/Icon';
import Toggle from '../../components/common/Toggle';
import { useSettings, WEEK_DAYS } from '../../hooks/useSettings';
import { CURRENCIES } from '../../utils/format';
import { timeZoneOptions } from '../../utils/timezone';
import styles from '../Settings.module.css';

const DAY_LABELS = { lun: 'Lun', mar: 'Mar', mer: 'Mer', jeu: 'Jeu', ven: 'Ven', sam: 'Sam', dim: 'Dim' };

export default function SettingsSalon() {
  const { salon, updateSalon, updateDayHours } = useSettings();
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
    <SettingsPage title="Salon" subtitle="Coordonnées, facturation et horaires d'ouverture">
      <form className="card" onSubmit={handleSave}>
        <h3 className="card-title" style={{ marginBottom: 'var(--space-4)' }}>Informations du salon</h3>

        <div className={styles.fieldPair}>
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

        <div className={styles.fieldPair}>
          <div className="field-group">
            <label className="field-label" htmlFor="st-phone">Téléphone</label>
            <input id="st-phone" className="input-field" value={form.phone} onChange={(e) => update({ phone: e.target.value })} />
          </div>
          <div className="field-group">
            <label className="field-label" htmlFor="st-email">Email</label>
            <input id="st-email" type="email" className="input-field" value={form.email} onChange={(e) => update({ email: e.target.value })} />
          </div>
        </div>

        <div className={styles.fieldTrio}>
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

        <div className="field-group">
          <label className="field-label" htmlFor="st-timezone">Fuseau horaire</label>
          <select id="st-timezone" className="input-field" value={form.timezone} onChange={(e) => update({ timezone: e.target.value })}>
            {timeZoneOptions(form.timezone).map((zone) => (
              <option key={zone} value={zone}>{zone.replace(/_/g, ' ')}</option>
            ))}
          </select>
          <p style={{ fontSize: '0.74rem', color: 'var(--color-text-muted)', marginTop: 8 }}>
            Détecté automatiquement à l'inscription. Il sert à savoir à quelle heure réelle
            correspond un rendez-vous, donc à envoyer les rappels au bon moment — à ne corriger
            que s'il ne correspond pas à celui du salon.
          </p>
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
                  aria-label={`${DAY_LABELS[day]} — ouverture`}
                  value={sched.open}
                  disabled={sched.closed}
                  onChange={(e) => updateDayHours(day, { open: e.target.value })}
                />
                <input
                  type="time"
                  className={styles.hoursInput}
                  aria-label={`${DAY_LABELS[day]} — fermeture`}
                  value={sched.close}
                  disabled={sched.closed}
                  onChange={(e) => updateDayHours(day, { close: e.target.value })}
                />
                <Toggle
                  active={!sched.closed}
                  onChange={(active) => updateDayHours(day, { closed: !active })}
                  label={sched.closed ? `Ouvrir le ${DAY_LABELS[day]}` : `Fermer le ${DAY_LABELS[day]}`}
                />
              </div>
            );
          })}
        </div>
      </div>
    </SettingsPage>
  );
}
