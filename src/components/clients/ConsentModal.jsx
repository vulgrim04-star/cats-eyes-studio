import { useState } from 'react';
import Modal from '../common/Modal';
import SignaturePad from '../common/SignaturePad';
import { useClients } from '../../hooks/useClients';
import { todayISO, formatDateLong } from '../../utils/date';
import styles from './ConsentModal.module.css';

export default function ConsentModal({ open, onClose, client }) {
  const { signConsent } = useClients();
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
        <strong>Cats Eyes Studio</strong> collecte et conserve les données personnelles et de santé nécessaires
        à la réalisation des prestations (allergies, contre-indications, historique de pose, photos avant/après).
        <ul>
          <li>Les données sont utilisées uniquement pour le suivi de votre dossier client.</li>
          <li>Vos photos ne sont jamais publiées sans votre accord explicite.</li>
          <li>Vous pouvez demander l'accès, la rectification ou la suppression de vos données à tout moment.</li>
          <li>Les données sont conservées 3 ans après votre dernière visite.</li>
        </ul>
      </div>

      <label className={styles.checkboxRow}>
        <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} />
        Je reconnais avoir pris connaissance des clauses ci-dessus et j'accepte le traitement de mes données personnelles.
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
