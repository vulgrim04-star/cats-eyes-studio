import { useState } from 'react';
import Icon from '../common/Icon';
import { useClients } from '../../hooks/useClients';
import { useSettings } from '../../hooks/useSettings';
import { useReferentialsStore } from '../../store/useReferentialsStore';
import LashSelect from './LashSelect';
import { formatDateLong } from '../../utils/date';
import { generateGdprConsentPdf, generateHealthFormPdf } from '../../utils/consentPdf';
import { HEALTH_FORM_TITLE } from '../../data/consentText';

export default function ProfileTab({ client, onOpenConsent, onOpenHealthForm }) {
  const { updateClient } = useClients();
  const { salon } = useSettings();
  const lashTypes = useReferentialsStore((s) => s.lashTypes);
  const lashConditions = useReferentialsStore((s) => s.lashConditions);
  const naturalLengths = useReferentialsStore((s) => s.naturalLengths);
  const [form, setForm] = useState({
    phone: client.phone,
    email: client.email,
    lashType: client.lashType ?? '',
    lashCondition: client.lashCondition ?? '',
    naturalLength: client.naturalLength ?? '',
    allergies: client.allergies,
    contraindications: client.contraindications,
    birthday: client.birthday ?? '',
    instagram: client.instagram ?? '',
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
                style={{ height: 60, background: 'var(--color-cream)', borderRadius: 'var(--radius-sm)', padding: 8, marginBottom: 10, display: 'block' }}
              />
            )}
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => generateGdprConsentPdf(client, salon)}>
              <Icon name="download" size={14} /> Télécharger le PDF
            </button>
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
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-2)' }}>
          <h3 className="card-title">{HEALTH_FORM_TITLE}</h3>
          <span
            className="badge"
            style={{
              background: client.healthFormSigned ? 'var(--color-success-bg)' : 'var(--color-warning-bg)',
              color: client.healthFormSigned ? 'var(--color-success)' : 'var(--color-warning)',
            }}
          >
            {client.healthFormSigned ? 'Signée' : 'Non signée'}
          </span>
        </div>
        {client.healthFormSigned ? (
          <div>
            <p style={{ fontSize: '0.86rem', color: 'var(--color-text-soft)', marginBottom: client.healthFormSignatureUrl ? 10 : 0 }}>
              Signée le {formatDateLong(client.healthFormDate)}.
            </p>
            {client.healthFormSignatureUrl && (
              <img
                src={client.healthFormSignatureUrl}
                alt="Signature"
                style={{ height: 60, background: 'var(--color-cream)', borderRadius: 'var(--radius-sm)', padding: 8, marginBottom: 10, display: 'block' }}
              />
            )}
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => generateHealthFormPdf(client, salon)}>
              <Icon name="download" size={14} /> Télécharger le PDF
            </button>
          </div>
        ) : (
          <>
            <p style={{ fontSize: '0.86rem', color: 'var(--color-text-soft)', marginBottom: 'var(--space-3)' }}>
              La fiche de santé n'a pas encore été remplie et signée par cette cliente.
            </p>
            <button type="button" className="btn btn-secondary btn-sm" onClick={onOpenHealthForm}>
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

        <div className="field-group">
          <label className="field-label" htmlFor="pf-instagram">
            Instagram{' '}
            {client.instagram && (
              <a
                href={`https://instagram.com/${client.instagram}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{ fontWeight: 400, color: 'var(--color-accent-dark)' }}
              >
                Voir le profil ↗
              </a>
            )}
          </label>
          <input
            id="pf-instagram"
            className="input-field"
            value={form.instagram}
            onChange={(e) => update({ instagram: e.target.value.trim().replace(/^@+/, '').replace(/^https?:\/\/(www\.)?instagram\.com\//i, '').replace(/\/.*$/, '') })}
            placeholder="pseudo (sans @)"
          />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
          <LashSelect id="pf-lash" label="Type de cils" options={lashTypes} value={form.lashType} onChange={(v) => update({ lashType: v })} />
          <LashSelect id="pf-condition" label="État des cils" options={lashConditions} value={form.lashCondition} onChange={(v) => update({ lashCondition: v })} />
          <LashSelect id="pf-natural" label="Longueur naturelle" options={naturalLengths} value={form.naturalLength} onChange={(v) => update({ naturalLength: v })} />
        </div>

        <div className="field-group">
          <label className="field-label" htmlFor="pf-birthday">Date d'anniversaire</label>
          {/* Remonté ici depuis la carte « Préférences », supprimée : c'est cette date qui
              déclenche les alertes d'anniversaire, la retirer les aurait éteintes. */}
          <input id="pf-birthday" type="date" className="input-field" value={form.birthday} onChange={(e) => update({ birthday: e.target.value })} />
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

      {dirty && (
        <button type="button" className="btn btn-primary btn-sm" onClick={handleSave}>
          <Icon name="check" size={14} /> Enregistrer les modifications
        </button>
      )}
    </div>
  );
}
