import { useState } from 'react';
import Modal from '../common/Modal';
import { useClients } from '../../hooks/useClients';
import { todayISO, formatDateLong } from '../../utils/date';
import { fullName } from '../../utils/format';
import styles from './ConsentModal.module.css';

export default function ConsentModal({ open, onClose, client }) {
  const { signConsent } = useClients();
  const [agreed, setAgreed] = useState(false);
  const [signature, setSignature] = useState('');

  const canSign = agreed && signature.trim().toLowerCase() === fullName(client).toLowerCase();

  const handleSign = () => {
    if (!canSign) return;
    signConsent(client.id, todayISO());
    setAgreed(false);
    setSignature('');
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

      <div className="field-group">
        <label className="field-label" htmlFor="consent-signature">
          Signature — tapez votre nom complet ({fullName(client)}) pour valider
        </label>
        <input
          id="consent-signature"
          className="input-field"
          value={signature}
          onChange={(e) => setSignature(e.target.value)}
          placeholder={fullName(client)}
        />
      </div>

      {signature && (
        <div className={styles.signaturePreview}>{signature}</div>
      )}

      <p style={{ fontSize: '0.76rem', color: 'var(--color-text-muted)', marginTop: 12 }}>
        Signé électroniquement le {formatDateLong(todayISO())}.
      </p>
    </Modal>
  );
}
