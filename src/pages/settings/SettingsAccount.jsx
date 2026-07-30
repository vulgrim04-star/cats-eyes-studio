import { useState } from 'react';
import { Link } from 'react-router-dom';
import SettingsPage from '../../components/settings/SettingsPage';
import Icon from '../../components/common/Icon';
import DeleteAccountModal from '../../components/settings/DeleteAccountModal';
import ResetDataModal from '../../components/settings/ResetDataModal';
import FeedbackModal from '../../components/settings/FeedbackModal';
import { signOut, useAuthStore } from '../../store/useAuthStore';
import styles from '../Settings.module.css';

export default function SettingsAccount() {
  const email = useAuthStore((s) => s.session?.user?.email);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [resetModalOpen, setResetModalOpen] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);

  return (
    <SettingsPage title="Compte" subtitle="Connexion, aide et informations légales">
      <div className="card">
        <div className={styles.prefRow}>
          <div className={styles.prefText}>
            <div className={styles.prefTitle}>Connectée</div>
            <div className={styles.prefSubtitle}>{email}</div>
          </div>
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => signOut()}>
            <Icon name="logout" size={14} /> Se déconnecter
          </button>
        </div>

        <div className={styles.prefRow}>
          <div className={styles.prefText}>
            <div className={styles.prefTitle}>Guide de démarrage</div>
            <div className={styles.prefSubtitle}>Les étapes pour prendre en main l'application</div>
          </div>
          <Link to="/guide" className="btn btn-secondary btn-sm">Ouvrir le guide</Link>
        </div>

        <div className={styles.prefRow}>
          <div className={styles.prefText}>
            <div className={styles.prefTitle}>Un problème, une idée ?</div>
            <div className={styles.prefSubtitle}>
              Signale-le directement — c'est ce qui fait avancer l'application le plus vite.
            </div>
          </div>
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => setFeedbackOpen(true)}>
            <Icon name="mail" size={14} /> Envoyer un retour
          </button>
        </div>

        <div className={styles.prefRow}>
          <div className={styles.prefText}>
            <div className={styles.prefTitle}>Informations légales</div>
            <div className={styles.prefSubtitle}>Politique de confidentialité et conditions d'utilisation</div>
          </div>
          <div className={styles.prefActions}>
            <Link to="/confidentialite" className="btn btn-secondary btn-sm">Confidentialité</Link>
            <Link to="/conditions" className="btn btn-secondary btn-sm">Conditions</Link>
          </div>
        </div>
      </div>

      <div className="card" style={{ marginTop: 'var(--space-5)', borderColor: 'var(--color-danger)' }}>
        <h3 className="card-title" style={{ marginBottom: 'var(--space-2)', color: 'var(--color-danger)' }}>Zone dangereuse</h3>

        <p style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', marginBottom: 'var(--space-3)' }}>
          Efface toutes les données métier (clientes, rendez-vous, prestations, stock, dépenses, demandes en
          attente) pour repartir de zéro, comme un compte tout juste créé. Ton compte de connexion et les
          paramètres du salon restent intacts.
        </p>
        <button type="button" className="btn btn-danger btn-sm" style={{ marginBottom: 'var(--space-4)' }} onClick={() => setResetModalOpen(true)}>
          <Icon name="alert-triangle" size={14} /> Réinitialiser toutes les données
        </button>

        <p style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', marginBottom: 'var(--space-4)', paddingTop: 'var(--space-4)', borderTop: '1px solid var(--color-border)' }}>
          Supprime définitivement ton compte et toutes tes données (clientes, rendez-vous, prestations, stock,
          finances, paramètres). Une confirmation par email est requise avant que la suppression ait lieu.
        </p>
        <button type="button" className="btn btn-danger btn-sm" onClick={() => setDeleteModalOpen(true)}>
          <Icon name="trash" size={14} /> Supprimer mon compte
        </button>
      </div>

      <ResetDataModal open={resetModalOpen} onClose={() => setResetModalOpen(false)} />
      <DeleteAccountModal open={deleteModalOpen} onClose={() => setDeleteModalOpen(false)} />
      <FeedbackModal open={feedbackOpen} onClose={() => setFeedbackOpen(false)} />
    </SettingsPage>
  );
}
