import { useState } from 'react';
import BrandMark from '../components/common/BrandMark';
import { useSettings } from '../hooks/useSettings';
import { CURRENCIES } from '../utils/format';
import styles from './Onboarding.module.css';

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

  const update = (patch) => setForm((f) => ({ ...f, ...patch }));

  const canSubmit = form.managerName.trim() && form.name.trim() && form.address.trim() && form.phone.trim() && form.email.trim();

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!canSubmit) return;
    completeOnboarding(form);
  };

  return (
    <div className={styles.wrap}>
      <form className={styles.card} onSubmit={handleSubmit}>
        <div className={styles.brand}>
          <BrandMark size={48} radius="var(--radius-md)" iconSize={22} />
          <div>
            <h1>Bienvenue !</h1>
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

        <button type="submit" className="btn btn-primary" disabled={!canSubmit}>
          Accéder à mon espace
        </button>
      </form>
    </div>
  );
}
