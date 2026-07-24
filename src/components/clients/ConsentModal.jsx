import { useState } from 'react';
import Modal from '../common/Modal';
import SignaturePad from '../common/SignaturePad';
import { useClients } from '../../hooks/useClients';
import { useSettings } from '../../hooks/useSettings';
import { todayISO, formatDateLong } from '../../utils/date';
import { gdprIntro, GDPR_CLAUSES, GDPR_AGREEMENT_LABEL } from '../../data/consentText';
import styles from './ConsentModal.module.css';

export default function ConsentModal({ open, onClose, client }) {
  const { signConsent } = useClients();
  const { salon } = useSettings();
  const [agreed, setAgreed] = useState(false);
  const [signatureUrl, setSignatureUrl] = useState(null);

  const canSign = agreed && Boolean(signatureUrl);

  const handleSign = () => {
    if (!canSign) return;
    signConsent(client.id, todayISO(), signatureUrl);
    setAgreed(false);
    setSignatureUrl(null);
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Consentement RGPD"
      footer={
        <>
          <button type="button" className="btn btn-ghost" onClick={onClose}>Annuler</button>
          <button type="button" className="btn btn-primary" disabled={!canSign} onClick={handleSign}>Signer le consentement</button>
        </>
      }
    >
      <div className={styles.clauses}>
        {gdprIntro(salon?.name)}
        <ul>
          {GDPR_CLAUSES.map((clause) => (
            <li key={clause}>{clause}</li>
          ))}
        </ul>
      </div>

      <label className={styles.checkboxRow}>
        <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} />
        {GDPR_AGREEMENT_LABEL}
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
