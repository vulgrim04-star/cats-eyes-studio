import { useState } from 'react';
import BrandMark from '../components/common/BrandMark';
import { useSettings, WEEK_DAYS } from '../hooks/useSettings';
import { APP_NAME } from '../data/brand';
import { CURRENCIES } from '../utils/format';
import styles from './Onboarding.module.css';

// Régimes de TVA proposés. `null` = taux libre à saisir. Le défaut est "non assujettie" :
// beaucoup d'indépendantes sont sous le seuil d'assujettissement, et faire figurer une
// TVA fictive sur un reçu serait une erreur comptable.
const VAT_PRESETS = [
  { key: 'none', label: 'Non assujettie', hint: 'Aucune TVA sur les reçus', rate: 0 },
  { key: 'ch', label: 'Suisse — 8,1 %', hint: 'Taux normal', rate: 8.1 },
  { key: 'fr', label: 'France — 20 %', hint: 'Taux normal', rate: 20 },
  { key: 'custom', label: 'Autre taux', hint: 'À préciser', rate: null },
];

const DAY_LABELS = { lun: 'Lundi', mar: 'Mardi', mer: 'Mercredi', jeu: 'Jeudi', ven: 'Vendredi', sam: 'Samedi', dim: 'Dimanche' };

// Semaine de travail la plus courante, modifiable ensuite dans Paramètres.
const DEFAULT_OPEN_DAYS = ['mar', 'mer', 'jeu', 'ven', 'sam'];

const EMPTY = {
  managerName: '',
  name: '',
  address: '',
  phone: '',
  email: '',
  currency: 'EUR',
};

export default function Onboarding() {
  const { completeOnboarding } = useSettings();
  const [form, setForm] = useState(EMPTY);
  const [vatKey, setVatKey] = useState('none');
  const [customVat, setCustomVat] = useState('');
  const [openDays, setOpenDays] = useState(DEFAULT_OPEN_DAYS);

  const update = (patch) => setForm((f) => ({ ...f, ...patch }));

  const toggleDay = (day) =>
    setOpenDays((days) => (days.includes(day) ? days.filter((d) => d !== day) : [...days, day]));

  const vatRate =
    vatKey === 'custom' ? parseFloat(customVat.replace(',', '.')) : VAT_PRESETS.find((v) => v.key === vatKey).rate;
  const vatValid = Number.isFinite(vatRate) && vatRate >= 0 && vatRate < 100;

  const canSubmit =
    form.managerName.trim() && form.name.trim() && form.address.trim() && form.phone.trim() && form.email.trim() && vatValid;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!canSubmit) return;
    const hours = WEEK_DAYS.reduce(
      (acc, day) => ({ ...acc, [day]: { open: '09:00', close: '18:30', closed: !openDays.includes(day) } }),
      {}
    );
    completeOnboarding({ ...form, vatRate, hours });
  };

  return (
    <div className={styles.wrap}>
      <form className={styles.card} onSubmit={handleSubmit}>
        <div className={styles.brand}>
          <BrandMark size={48} radius="var(--radius-md)" iconSize={22} />
          <div>
            <h1>Bienvenue sur {APP_NAME} !</h1>
            <p className={styles.subtitle}>Quelques informations pour configurer ton espace salon.</p>
          </div>
        </div>

        <div className="field-group">
          <label className="field-label" htmlFor="ob-manager">Ton nom (gérante / gérant)</label>
          <input
            id="ob-manager"
            className="input-field"
            value={form.managerName}
            onChange={(e) => update({ managerName: e.target.value })}
            required
          />
        </div>

        <div className="field-group">
          <label className="field-label" htmlFor="ob-name">Nom de l'institut</label>
          <input
            id="ob-name"
            className="input-field"
            value={form.name}
            onChange={(e) => update({ name: e.target.value })}
            required
          />
        </div>

        <div className="field-group">
          <label className="field-label" htmlFor="ob-address">Adresse</label>
          <input
            id="ob-address"
            className="input-field"
            value={form.address}
            onChange={(e) => update({ address: e.target.value })}
            placeholder="12 rue des Lilas, 75011 Paris"
            required
          />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div className="field-group">
            <label className="field-label" htmlFor="ob-phone">Téléphone</label>
            <input
              id="ob-phone"
              className="input-field"
              value={form.phone}
              onChange={(e) => update({ phone: e.target.value })}
              placeholder="01 23 45 67 89"
              required
            />
          </div>
          <div className="field-group">
            <label className="field-label" htmlFor="ob-currency">Devise</label>
            <select id="ob-currency" className="input-field" value={form.currency} onChange={(e) => update({ currency: e.target.value })}>
              {CURRENCIES.map((c) => (
                <option key={c.code} value={c.code}>{c.label}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="field-group" style={{ marginBottom: 0 }}>
          <label className="field-label" htmlFor="ob-email">Email de contact du salon</label>
          <input
            id="ob-email"
            type="email"
            className="input-field"
            value={form.email}
            onChange={(e) => update({ email: e.target.value })}
            placeholder="contact@moninstitut.fr"
            required
          />
        </div>

        <div className="field-group">
          <label className="field-label">TVA</label>
          <div className={styles.optionGrid}>
            {VAT_PRESETS.map((preset) => (
              <button
                key={preset.key}
                type="button"
                className={`${styles.option} ${vatKey === preset.key ? styles.optionActive : ''}`}
                onClick={() => setVatKey(preset.key)}
              >
                <span className={styles.optionLabel}>{preset.label}</span>
                <span className={styles.optionHint}>{preset.hint}</span>
              </button>
            ))}
          </div>
          {vatKey === 'custom' && (
            <input
              className="input-field"
              style={{ marginTop: 8, maxWidth: 160 }}
              value={customVat}
              onChange={(e) => setCustomVat(e.target.value)}
              placeholder="ex. 7.7"
              inputMode="decimal"
              aria-label="Taux de TVA en pourcentage"
              autoFocus
            />
          )}
        </div>

        <div className="field-group" style={{ marginBottom: 0 }}>
          <label className="field-label">Jours d'ouverture</label>
          <div className={styles.dayRow}>
            {WEEK_DAYS.map((day) => (
              <button
                key={day}
                type="button"
                className={`${styles.dayChip} ${openDays.includes(day) ? styles.dayChipActive : ''}`}
                onClick={() => toggleDay(day)}
                aria-pressed={openDays.includes(day)}
              >
                {DAY_LABELS[day].slice(0, 3)}
              </button>
            ))}
          </div>
          <p className={styles.helpText}>
            Horaires 09:00–18:30 par défaut, ajustables ensuite dans les Paramètres.
          </p>
        </div>

        <button type="submit" className="btn btn-primary" disabled={!canSubmit}>
          Accéder à mon espace
        </button>
      </form>
    </div>
  );
}
