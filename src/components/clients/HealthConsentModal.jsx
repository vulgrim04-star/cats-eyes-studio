import { useState } from 'react';
import Modal from '../common/Modal';
import SignaturePad from '../common/SignaturePad';
import { useClients } from '../../hooks/useClients';
import { todayISO, formatDateLong } from '../../utils/date';
import {
  HEALTH_FORM_TITLE,
  HEALTH_FORM_INTRO,
  HEALTH_FORM_CONDITIONS,
  HEALTH_FORM_WARNING,
  HEALTH_FORM_PATCH_TEST,
  HEALTH_FORM_POST_CARE_INTRO,
  HEALTH_FORM_POST_CARE,
  HEALTH_FORM_IMAGE_RIGHTS_LABEL,
  HEALTH_FORM_ACKNOWLEDGEMENTS,
  HEALTH_FORM_NOTE,
} from '../../data/consentText';
import consentStyles from './ConsentModal.module.css';
import styles from './HealthConsentModal.module.css';

const EMPTY_CONDITIONS = HEALTH_FORM_CONDITIONS.reduce((acc, c) => ({ ...acc, [c.key]: null }), {});

export default function HealthConsentModal({ open, onClose, client }) {
  const { signHealthForm } = useClients();
  const [conditions, setConditions] = useState(EMPTY_CONDITIONS);
  const [patchTestDone, setPatchTestDone] = useState(false);
  const [patchTestAcknowledged, setPatchTestAcknowledged] = useState(false);
  const [imageRights, setImageRights] = useState(null);
  const [agreed, setAgreed] = useState(false);
  const [signatureUrl, setSignatureUrl] = useState(null);

  const allConditionsAnswered = HEALTH_FORM_CONDITIONS.every((c) => conditions[c.key]);
  const canSign =
    allConditionsAnswered && patchTestDone && patchTestAcknowledged && imageRights && agreed && Boolean(signatureUrl);

  const setCondition = (key, value) => setConditions((c) => ({ ...c, [key]: value }));

  const reset = () => {
    setConditions(EMPTY_CONDITIONS);
    setPatchTestDone(false);
    setPatchTestAcknowledged(false);
    setImageRights(null);
    setAgreed(false);
    setSignatureUrl(null);
  };

  const handleSign = () => {
    if (!canSign) return;
    signHealthForm(client.id, todayISO(), signatureUrl, {
      conditions,
      patchTestDone,
      patchTestAcknowledged,
      imageRights,
    });
    reset();
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={HEALTH_FORM_TITLE}
      maxWidth={560}
      footer={
        <>
          <button type="button" className="btn btn-ghost" onClick={onClose}>Annuler</button>
          <button type="button" className="btn btn-primary" disabled={!canSign} onClick={handleSign}>Signer le consentement</button>
        </>
      }
    >
      <p style={{ fontSize: '0.84rem', color: 'var(--color-text-soft)', marginBottom: 'var(--space-4)' }}>
        {HEALTH_FORM_INTRO}
      </p>

      <div className={styles.section}>
        <h4 className={styles.sectionTitle}>Déclaration de santé</h4>
        {HEALTH_FORM_CONDITIONS.map((cond) => (
          <div key={cond.key} className={styles.conditionRow}>
            <span className={styles.conditionLabel}>{cond.label}</span>
            <div className={styles.radioPair}>
              <label className={styles.radioOption}>
                <input
                  type="radio"
                  name={`cond-${cond.key}`}
                  checked={conditions[cond.key] === 'oui'}
                  onChange={() => setCondition(cond.key, 'oui')}
                />
                Oui
              </label>
              <label className={styles.radioOption}>
                <input
                  type="radio"
                  name={`cond-${cond.key}`}
                  checked={conditions[cond.key] === 'non'}
                  onChange={() => setCondition(cond.key, 'non')}
                />
                Non
              </label>
            </div>
          </div>
        ))}
        <p className={styles.warning}>⚠ {HEALTH_FORM_WARNING}</p>
      </div>

      <div className={styles.section}>
        <h4 className={styles.sectionTitle}>Test de sensibilité (patch test)</h4>
        <label className={consentStyles.checkboxRow}>
          <input type="checkbox" checked={patchTestDone} onChange={(e) => setPatchTestDone(e.target.checked)} />
          {HEALTH_FORM_PATCH_TEST[0]}
        </label>
        <label className={consentStyles.checkboxRow}>
          <input type="checkbox" checked={patchTestAcknowledged} onChange={(e) => setPatchTestAcknowledged(e.target.checked)} />
          {HEALTH_FORM_PATCH_TEST[1]}
        </label>
      </div>

      <div className={styles.section}>
        <h4 className={styles.sectionTitle}>Rappels post-soin</h4>
        <p style={{ fontSize: '0.82rem', color: 'var(--color-text-soft)', marginBottom: 6 }}>{HEALTH_FORM_POST_CARE_INTRO}</p>
        <ul className={styles.list}>
          {HEALTH_FORM_POST_CARE.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </div>

      <div className={styles.section}>
        <h4 className={styles.sectionTitle}>Droit à l'image</h4>
        <span className={styles.conditionLabel}>{HEALTH_FORM_IMAGE_RIGHTS_LABEL}</span>
        <div className={styles.radioPair} style={{ marginTop: 6 }}>
          <label className={styles.radioOption}>
            <input type="radio" name="image-rights" checked={imageRights === 'authorize'} onChange={() => setImageRights('authorize')} />
            J'autorise
          </label>
          <label className={styles.radioOption}>
            <input type="radio" name="image-rights" checked={imageRights === 'deny'} onChange={() => setImageRights('deny')} />
            Je n'autorise pas
          </label>
        </div>
      </div>

      <div className={styles.section}>
        <p style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', fontStyle: 'italic' }}>{HEALTH_FORM_NOTE}</p>
      </div>

      <div className={styles.section}>
        <h4 className={styles.sectionTitle}>Je reconnais que :</h4>
        <ul className={styles.list}>
          {HEALTH_FORM_ACKNOWLEDGEMENTS.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </div>

      <label className={consentStyles.checkboxRow}>
        <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} />
        Je confirme l'exactitude de mes réponses et j'accepte les conditions ci-dessus.
      </label>

      <div className="field-group" style={{ marginBottom: 0 }}>
        <label className="field-label">Signature de la cliente</label>
        <SignaturePad onChange={setSignatureUrl} resetKey={open} />
      </div>

      <p style={{ fontSize: '0.76rem', color: 'var(--color-text-muted)', marginTop: 12 }}>
        Signé électroniquement le {formatDateLong(todayISO())}.
      </p>
    </Modal>
  );
}
