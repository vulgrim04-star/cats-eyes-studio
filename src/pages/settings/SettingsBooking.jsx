import { useEffect } from 'react';
import SettingsPage from '../../components/settings/SettingsPage';
import Icon from '../../components/common/Icon';
import { useSettings } from '../../hooks/useSettings';
import { useToast } from '../../hooks/useToast';
import { useAuthStore } from '../../store/useAuthStore';

export default function SettingsBooking() {
  const { calendarToken, ensureCalendarToken } = useSettings();
  const { showToast } = useToast();
  const ownerId = useAuthStore((s) => s.session?.user?.id);

  useEffect(() => {
    ensureCalendarToken();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const bookingLink = ownerId ? `${window.location.origin}/r/${ownerId}` : '';
  const calendarLink = ownerId && calendarToken ? `${window.location.origin}/api/ics?u=${ownerId}&t=${calendarToken}` : '';

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
          Un lien privé à coller une seule fois dans Google Calendar ou Apple Calendar (« s'abonner à un calendrier »).
          Tes rendez-vous y apparaissent automatiquement et se mettent à jour tout seuls, sans rien reconfigurer.
          Ne partage ce lien avec personne : il donne accès en lecture à ton planning.
        </p>
        <div style={{ display: 'flex', gap: 'var(--space-3)', flexWrap: 'wrap', alignItems: 'center', marginBottom: 'var(--space-4)' }}>
          <input className="input-field" readOnly value={calendarLink} aria-label="Lien de calendrier" style={{ flex: '1 1 260px' }} onFocus={(e) => e.target.select()} />
          <button type="button" className="btn btn-primary btn-sm" onClick={() => copy(calendarLink, 'Lien de calendrier')} disabled={!calendarLink}>
            <Icon name="clipboard" size={14} /> Copier le lien
          </button>
        </div>
        <details>
          <summary style={{ fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer', color: 'var(--color-accent-dark)' }}>
            Comment l'ajouter à Google Calendar ou Apple Calendar ?
          </summary>
          <div style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', marginTop: 'var(--space-3)', display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            <p style={{ margin: 0 }}>
              <strong>Google Calendar (ordinateur) :</strong> Autres agendas → « + » → À partir de l'URL → coller le lien → Ajouter l'agenda.
            </p>
            <p style={{ margin: 0 }}>
              <strong>Apple Calendar (iPhone/Mac) :</strong> Réglages → Calendrier → Comptes → Ajouter un compte → Autre → Calendrier abonné → coller le lien.
            </p>
            <p style={{ margin: 0 }}>
              La mise à jour n'est pas instantanée : Google/Apple rafraîchissent l'agenda toutes les quelques heures, pas en temps réel.
            </p>
          </div>
        </details>
      </div>
    </SettingsPage>
  );
}
