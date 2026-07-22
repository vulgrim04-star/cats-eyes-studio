import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Icon from '../components/common/Icon';
import EmptyState from '../components/common/EmptyState';
import ConsentModal from '../components/clients/ConsentModal';
import LoyaltyBadge from '../components/clients/LoyaltyBadge';
import ProfileTab from '../components/clients/ProfileTab';
import HistoryTab from '../components/clients/HistoryTab';
import PhotosTab from '../components/clients/PhotosTab';
import LashMapTab from '../components/clients/LashMapTab';
import NotesTab from '../components/clients/NotesTab';
import { useClient, useClients } from '../hooks/useClients';
import { useAppointments } from '../hooks/useAppointments';
import { useToast } from '../hooks/useToast';
import { completedCountForClient } from '../utils/loyalty';
import { fileToResizedDataUrl } from '../utils/image';
import { initials, fullName } from '../utils/format';
import styles from './ClientDetail.module.css';

const TABS = [
  { id: 'profil', label: 'Profil' },
  { id: 'historique', label: 'Historique' },
  { id: 'lashmap', label: 'Lash Map' },
  { id: 'photos', label: 'Photos' },
  { id: 'notes', label: 'Notes' },
];

export default function ClientDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const client = useClient(id);
  const { appointments } = useAppointments();
  const { updateClient } = useClients();
  const { showToast } = useToast();
  const [tab, setTab] = useState('profil');
  const [consentOpen, setConsentOpen] = useState(false);

  if (!client) {
    return <EmptyState icon="users" title="Cliente introuvable" subtitle="Cette fiche cliente n'existe pas ou a été supprimée." />;
  }

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

      {tab === 'profil' && <ProfileTab client={client} onOpenConsent={() => setConsentOpen(true)} />}
      {tab === 'historique' && <HistoryTab client={client} appointments={appointments} />}
      {tab === 'lashmap' && <LashMapTab client={client} />}
      {tab === 'photos' && <PhotosTab client={client} />}
      {tab === 'notes' && <NotesTab client={client} appointments={appointments} />}

      <ConsentModal open={consentOpen} onClose={() => setConsentOpen(false)} client={client} />
    </>
  );
}
