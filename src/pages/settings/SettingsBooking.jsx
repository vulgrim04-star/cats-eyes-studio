import SettingsPage from '../../components/settings/SettingsPage';
import Icon from '../../components/common/Icon';
import CalendarSyncButton from '../../components/settings/CalendarSyncButton';
import { useToast } from '../../hooks/useToast';
import { useAuthStore } from '../../store/useAuthStore';

export default function SettingsBooking() {
  const { showToast } = useToast();
  const ownerId = useAuthStore((s) => s.session?.user?.id);

  const bookingLink = ownerId ? `${window.location.origin}/r/${ownerId}` : '';

  const copy = async (value, label) => {
    try {
      await navigator.clipboard.writeText(value);
      showToast(`${label} copié`, 'success');
    } catch {
      showToast('Impossible de copier le lien', 'error');
    }
  };

  return (
    <SettingsPage title="Réservation en ligne" subtitle="Lien public pour tes clientes et synchronisation d'agenda">
      <div className="card">
        <h3 className="card-title" style={{ marginBottom: 'var(--space-2)' }}>Lien de réservation en ligne</h3>
        <p style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', marginBottom: 'var(--space-4)' }}>
          Une page de réservation autonome (sans connexion, sans redirection vers le logiciel) à partager où tu veux
          — bio Instagram, site web, SMS… Les demandes de RDV arrivent dans « Demandes en attente » sur le tableau de
          bord, à toi de les valider.
        </p>
        <div style={{ display: 'flex', gap: 'var(--space-3)', flexWrap: 'wrap', alignItems: 'center' }}>
          <input className="input-field" readOnly value={bookingLink} aria-label="Lien de réservation" style={{ flex: '1 1 260px' }} onFocus={(e) => e.target.select()} />
          <button type="button" className="btn btn-primary btn-sm" onClick={() => copy(bookingLink, 'Lien de réservation')} disabled={!bookingLink}>
            <Icon name="clipboard" size={14} /> Copier le lien
          </button>
        </div>
      </div>

      <div className="card" style={{ marginTop: 'var(--space-5)' }}>
        <h3 className="card-title" style={{ marginBottom: 'var(--space-2)' }}>Synchronisation avec Google / Apple Agenda</h3>
        <p style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', marginBottom: 'var(--space-4)' }}>
          Tes rendez-vous apparaissent dans ton agenda personnel — celui du téléphone, de l'ordinateur, de la montre —
          et s'y mettent à jour tout seuls. Un seul bouton : choisis Google ou Apple, confirme, c'est terminé. Rien à
          installer, rien à recopier.
        </p>
        <CalendarSyncButton />
      </div>
    </SettingsPage>
  );
}
