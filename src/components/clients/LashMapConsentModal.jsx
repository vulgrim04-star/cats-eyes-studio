import { useState } from 'react';
import Modal from '../common/Modal';
import { useClients } from '../../hooks/useClients';
import { todayISO, formatDateLong } from '../../utils/date';
import { fullName } from '../../utils/format';
import styles from './ConsentModal.module.css';

export default function LashMapConsentModal({ open, onClose, client }) {
  const { signLashMapConsent } = useClients();
  const [agreed, setAgreed] = useState(false);
  const [signature, setSignature] = useState('');

  const canSign = agreed && signature.trim().toLowerCase() === fullName(client).toLowerCase();

  const handleSign = () => {
    if (!canSign) return;
    signLashMapConsent(client.id, todayISO());
    setAgreed(false);
    setSignature('');
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Consentement Lash Map"
      footer={
        <>
          <button type="button" className="btn btn-ghost" onClick={onClose}>Annuler</button>
          <button type="button" className="btn btn-primary" disabled={!canSign} onClick={handleSign}>Signer le consentement</button>
        </>
      }
    >
      <div className={styles.clauses}>
        Avant chaque pose ou retouche, l'esthéticienne établit une <strong>fiche technique (Lash Map)</strong> qui
        détaille la forme de l'œil, la santé de vos cils naturels, le style et les longueurs posées.
        <ul>
          <li>Ces informations techniques sont utilisées pour reproduire ou ajuster votre pose lors des prochaines séances.</li>
          <li>Aucun test d'allergie n'est réalisé par défaut : signalez toute réaction ou allergie connue à la colle avant la pose.</li>
          <li>Des photos avant/après peuvent être associées à votre dossier pour suivre l'évolution des poses.</li>
          <li>Ces données restent internes au salon et ne sont jamais transmises à un tiers.</li>
        </ul>
      </div>

      <label className={styles.checkboxRow}>
        <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} />
        Je reconnais avoir pris connaissance des clauses ci-dessus et j'accepte l'établissement de fiches techniques Lash Map pour le suivi de mes poses.
      </label>

      <div className="field-group">
        <label className="field-label" htmlFor="lashmap-consent-signature">
          Signature — tapez votre nom complet ({fullName(client)}) pour valider
        </label>
        <input
          id="lashmap-consent-signature"
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
