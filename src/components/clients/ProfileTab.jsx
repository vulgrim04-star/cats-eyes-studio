import { useState } from 'react';
import Icon from '../common/Icon';
import { useClients } from '../../hooks/useClients';
import { formatDateLong } from '../../utils/date';

export default function ProfileTab({ client, onOpenConsent }) {
  const { updateClient } = useClients();
  const [form, setForm] = useState({
    phone: client.phone,
    email: client.email,
    lashType: client.lashType,
    curl: client.curl,
    length: client.length,
    allergies: client.allergies,
    contraindications: client.contraindications,
    birthday: client.birthday ?? '',
    contactPreference: client.contactPreference ?? 'sms',
    referralSource: client.referralSource ?? '',
  });
  const [dirty, setDirty] = useState(false);

  const update = (patch) => {
    setForm((f) => ({ ...f, ...patch }));
    setDirty(true);
  };

  const handleSave = () => {
    updateClient(client.id, form);
    setDirty(false);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
      <div className="card">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-2)' }}>
          <h3 className="card-title">Consentement RGPD</h3>
          <span
            className="badge"
            style={{
              background: client.consentSigned ? 'var(--color-success-bg)' : 'var(--color-warning-bg)',
              color: client.consentSigned ? 'var(--color-success)' : 'var(--color-warning)',
            }}
          >
            {client.consentSigned ? 'Signé' : 'Non signé'}
          </span>
        </div>
        {client.consentSigned ? (
          <div>
            <p style={{ fontSize: '0.86rem', color: 'var(--color-text-soft)', marginBottom: client.consentSignatureUrl ? 10 : 0 }}>
              Signé le {formatDateLong(client.consentDate)}.
            </p>
            {client.consentSignatureUrl && (
              <img
                src={client.consentSignatureUrl}
                alt="Signature"
                style={{ height: 60, background: 'var(--color-cream)', borderRadius: 'var(--radius-sm)', padding: 8 }}
              />
            )}
          </div>
        ) : (
          <>
            <p style={{ fontSize: '0.86rem', color: 'var(--color-text-soft)', marginBottom: 'var(--space-3)' }}>
              Le consentement RGPD n'a pas encore été signé par cette cliente.
            </p>
            <button type="button" className="btn btn-secondary btn-sm" onClick={onOpenConsent}>
              <Icon name="edit" size={14} /> Faire signer
            </button>
          </>
        )}
      </div>

      <div className="card">
        <h3 className="card-title" style={{ marginBottom: 'var(--space-4)' }}>Informations</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div className="field-group">
            <label className="field-label" htmlFor="pf-phone">Téléphone</label>
            <input id="pf-phone" className="input-field" value={form.phone} onChange={(e) => update({ phone: e.target.value })} />
          </div>
          <div className="field-group">
            <label className="field-label" htmlFor="pf-email">Email</label>
            <input id="pf-email" className="input-field" value={form.email} onChange={(e) => update({ email: e.target.value })} />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
          <div className="field-group">
            <label className="field-label" htmlFor="pf-lash">Type de cils</label>
            <select id="pf-lash" className="input-field" value={form.lashType} onChange={(e) => update({ lashType: e.target.value })}>
              <option value="fin">Fin</option>
              <option value="normal">Normal</option>
              <option value="épais">Épais</option>
            </select>
          </div>
          <div className="field-group">
            <label className="field-label" htmlFor="pf-curl">Courbure</label>
            <input id="pf-curl" className="input-field" value={form.curl} onChange={(e) => update({ curl: e.target.value })} />
          </div>
          <div className="field-group">
            <label className="field-label" htmlFor="pf-length">Longueur habituelle</label>
            <input id="pf-length" className="input-field" value={form.length} onChange={(e) => update({ length: e.target.value })} />
          </div>
        </div>

        <div className="field-group">
          <label className="field-label" htmlFor="pf-allergies">Allergies</label>
          <input id="pf-allergies" className="input-field" value={form.allergies} onChange={(e) => update({ allergies: e.target.value })} />
        </div>

        <div className="field-group" style={{ marginBottom: 0 }}>
          <label className="field-label" htmlFor="pf-contra">Contre-indications</label>
          <textarea id="pf-contra" className="input-field" rows={2} value={form.contraindications} onChange={(e) => update({ contraindications: e.target.value })} />
        </div>
      </div>

      <div className="card">
        <h3 className="card-title" style={{ marginBottom: 'var(--space-4)' }}>Préférences</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div className="field-group">
            <label className="field-label" htmlFor="pf-birthday">Date d'anniversaire</label>
            <input id="pf-birthday" type="date" className="input-field" value={form.birthday} onChange={(e) => update({ birthday: e.target.value })} />
          </div>
          <div className="field-group">
            <label className="field-label" htmlFor="pf-contact-pref">Préférence de contact</label>
            <select id="pf-contact-pref" className="input-field" value={form.contactPreference} onChange={(e) => update({ contactPreference: e.target.value })}>
              <option value="sms">SMS</option>
              <option value="email">Email</option>
              <option value="whatsapp">WhatsApp</option>
            </select>
          </div>
        </div>
        <div className="field-group" style={{ marginBottom: 0 }}>
          <label className="field-label" htmlFor="pf-referral">Comment elle a connu le salon</label>
          <input id="pf-referral" className="input-field" value={form.referralSource} onChange={(e) => update({ referralSource: e.target.value })} placeholder="Instagram, bouche-à-oreille, Google…" />
        </div>
      </div>

      {dirty && (
        <button type="button" className="btn btn-primary btn-sm" onClick={handleSave}>
          <Icon name="check" size={14} /> Enregistrer les modifications
        </button>
      )}
    </div>
  );
}
