import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Icon from '../components/common/Icon';
import EmptyState from '../components/common/EmptyState';
import ConsentModal from '../components/clients/ConsentModal';
import HealthConsentModal from '../components/clients/HealthConsentModal';
import LoyaltyBadge from '../components/clients/LoyaltyBadge';
import ProfileTab from '../components/clients/ProfileTab';
import HistoryTab from '../components/clients/HistoryTab';
import PhotosTab from '../components/clients/PhotosTab';
import LashMapTab from '../components/clients/LashMapTab';
import LashSimulatorTab from '../components/clients/LashSimulatorTab';
import NotesTab from '../components/clients/NotesTab';
import ClientSheetExportModal from '../components/clients/ClientSheetExportModal';
import { useClient, useClients } from '../hooks/useClients';
import { useAppointments, enrich, getAppointmentsByClient } from '../hooks/useAppointments';
import { useToast } from '../hooks/useToast';
import { useSettings } from '../hooks/useSettings';
import { completedCountForClient } from '../utils/loyalty';
import { fileToResizedDataUrl } from '../utils/image';
import { initials, fullName } from '../utils/format';
import styles from './ClientDetail.module.css';

const TABS = [
  { id: 'profil', label: 'Profil' },
  { id: 'historique', label: 'Historique' },
  { id: 'lashmap', label: 'Lash Map' },
  { id: 'simulateur', label: 'Simulateur' },
  { id: 'photos', label: 'Photos' },
  { id: 'notes', label: 'Notes' },
];

export default function ClientDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const client = useClient(id);
  const { appointments } = useAppointments();
  const { updateClient, removeClient } = useClients();
  const { showToast } = useToast();
  const { salon, appearance } = useSettings();
  const [tab, setTab] = useState('profil');
  const [consentOpen, setConsentOpen] = useState(false);
  const [healthFormOpen, setHealthFormOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);

  if (!client) {
    return <EmptyState icon="users" title="Cliente introuvable" subtitle="Cette fiche cliente n'existe pas ou a été supprimée." />;
  }

  const handleDelete = () => {
    if (!window.confirm(`Supprimer définitivement la fiche de ${fullName(client)} ? Cette action est irréversible (l'historique des RDV associés sera conservé mais ne pourra plus être lié à une fiche).`)) {
      return;
    }
    removeClient(client.id);
    navigate('/clientes');
  };

  const handleAvatarFile = async (file) => {
    try {
      const dataUrl = await fileToResizedDataUrl(file, 400);
      updateClient(client.id, { photoUrl: dataUrl });
    } catch {
      showToast("Impossible de lire cette image", 'error');
    }
  };

  return (
    <>
      <button type="button" className={styles.backLink} onClick={() => navigate('/clientes')}>
        <Icon name="arrow-left" size={15} /> Retour aux clientes
      </button>

      <div className={styles.headCard}>
        <label className={styles.avatarUpload} htmlFor="client-avatar-input">
          {client.photoUrl ? (
            <img src={client.photoUrl} alt="" className={styles.avatarImg} />
          ) : (
            <span className={styles.avatar}>{initials(client.firstName, client.lastName)}</span>
          )}
          <span className={styles.avatarEdit}>
            <Icon name="camera" size={13} />
          </span>
          <input
            id="client-avatar-input"
            type="file"
            accept="image/*"
            style={{ display: 'none' }}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleAvatarFile(file);
              e.target.value = '';
            }}
          />
        </label>
        <div>
          <h1 className={styles.name}>
            {fullName(client)}
            <LoyaltyBadge completedCount={completedCountForClient(appointments, client.id)} />
          </h1>
          <div className={styles.contact}>
            <span><Icon name="phone" size={14} /> {client.phone}</span>
            <span><Icon name="mail" size={14} /> {client.email}</span>
          </div>
        </div>
        <div className={styles.spacer} />
        <button type="button" className="btn btn-ghost" onClick={handleDelete} title="Supprimer la fiche" aria-label="Supprimer la fiche">
          <Icon name="trash" size={16} />
        </button>
        <button type="button" className="btn btn-ghost" onClick={() => setExportOpen(true)}>
          <Icon name="download" size={16} /> Télécharger le PDF
        </button>
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => navigate('/agenda', { state: { openNew: true, clientId: client.id } })}
        >
          <Icon name="plus" size={16} /> Nouveau RDV
        </button>
      </div>

      <div className={styles.tabs}>
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            className={`${styles.tab} ${tab === t.id ? styles.tabActive : ''}`}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'profil' && (
        <ProfileTab client={client} onOpenConsent={() => setConsentOpen(true)} onOpenHealthForm={() => setHealthFormOpen(true)} />
      )}
      {tab === 'historique' && <HistoryTab client={client} appointments={appointments} />}
      {tab === 'lashmap' && <LashMapTab client={client} />}
      {tab === 'simulateur' && <LashSimulatorTab client={client} />}
      {tab === 'photos' && <PhotosTab client={client} />}
      {tab === 'notes' && <NotesTab client={client} appointments={appointments} />}

      <ConsentModal open={consentOpen} onClose={() => setConsentOpen(false)} client={client} />
      <HealthConsentModal open={healthFormOpen} onClose={() => setHealthFormOpen(false)} client={client} />
      <ClientSheetExportModal
        open={exportOpen}
        onClose={() => setExportOpen(false)}
        client={client}
        appointments={getAppointmentsByClient(appointments, client.id).map(enrich)}
        salon={salon}
        themeColor={appearance.themeColor}
      />
    </>
  );
}
