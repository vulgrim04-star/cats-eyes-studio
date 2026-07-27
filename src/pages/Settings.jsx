import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import PageHeader from '../components/common/PageHeader';
import Icon from '../components/common/Icon';
import BrandMark from '../components/common/BrandMark';
import Toggle from '../components/common/Toggle';
import { useSettings, WEEK_DAYS } from '../hooks/useSettings';
import { useClients } from '../hooks/useClients';
import { useToast } from '../hooks/useToast';
import { countInlinePhotos, migrateInlinePhotos } from '../utils/photoStorage';
import { fileToResizedDataUrl } from '../utils/image';
import { CURRENCIES } from '../utils/format';
import { downloadBackup, restoreBackup, BackupSyncError } from '../utils/backup';
import { subscribeToPush, isPushSupported } from '../utils/push';
import { signOut, useAuthStore } from '../store/useAuthStore';
import DeleteAccountModal from '../components/settings/DeleteAccountModal';
import ResetDataModal from '../components/settings/ResetDataModal';
import FeedbackModal from '../components/settings/FeedbackModal';
import styles from './Settings.module.css';

const DAY_LABELS = { lun: 'Lun', mar: 'Mar', mer: 'Mer', jeu: 'Jeu', ven: 'Ven', sam: 'Sam', dim: 'Dim' };

const NOTIFICATION_ROWS = [
  { key: 'newBookingAlert', title: 'Notification nouvelle réservation', subtitle: "Notification sur ton téléphone/ordinateur dès qu'une cliente réserve via le lien en ligne, même app fermée (nécessite d'activer les notifications ci-dessus)" },
  { key: 'newBookingEmail', title: 'E-mail nouvelle réservation', subtitle: "Recevoir un e-mail à l'adresse du salon dès qu'une cliente réserve via le lien en ligne" },
  { key: 'autoConfirm', title: 'Confirmation automatique', subtitle: "Envoyer un e-mail de confirmation à la cliente dès qu'un RDV est créé (si son adresse e-mail est enregistrée)" },
  // Ces deux réglages étaient enregistrés mais lus nulle part : aucun rappel n'a jamais été
  // envoyé. Les laisser activables faisait compter sur une fonctionnalité inexistante, et le
  // problème ne se découvrait qu'au premier rendez-vous manqué. Ils restent visibles, parce
  // que c'est une attente légitime, mais annoncés pour ce qu'ils sont.
  { key: 'reminder24h', title: 'Rappel 24h avant', subtitle: 'Envoyer un rappel automatique la veille du rendez-vous.', comingSoon: true },
  { key: 'reminder2h', title: 'Rappel 2h avant', subtitle: 'Envoyer un rappel automatique quelques heures avant le rendez-vous.', comingSoon: true },
];


export default function Settings() {
  const { salon, notifications, appearance, updateSalon, updateDayHours, toggleNotification, toggleDarkMode, calendarToken, ensureCalendarToken } = useSettings();
  const { showToast } = useToast();
  const email = useAuthStore((s) => s.session?.user?.email);
  const ownerId = useAuthStore((s) => s.session?.user?.id);

  useEffect(() => {
    ensureCalendarToken();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const [form, setForm] = useState(salon);
  const [dirty, setDirty] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [resetModalOpen, setResetModalOpen] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [migrating, setMigrating] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const { clients, updatePhotoSession } = useClients();
  const inlinePhotoCount = countInlinePhotos(clients);

  const handleMigratePhotos = async () => {
    setMigrating(true);
    const { migrated, failed } = await migrateInlinePhotos(clients, updatePhotoSession);
    setMigrating(false);
    if (failed > 0) {
      showToast(`${migrated} photo(s) optimisée(s), ${failed} en échec. Réessaie plus tard.`, 'warning');
    } else {
      showToast(`${migrated} photo(s) optimisée(s).`, 'success');
    }
  };
  const [notifPermission, setNotifPermission] = useState(
    typeof Notification !== 'undefined' ? Notification.permission : 'unsupported'
  );

  const requestNotifPermission = async () => {
    if (typeof Notification === 'undefined') return;
    const result = await Notification.requestPermission();
    setNotifPermission(result);
    if (result === 'granted') {
      const subscribed = ownerId && (await subscribeToPush(ownerId));
      showToast(
        subscribed
          ? 'Notifications activées — tu les recevras même app fermée'
          : 'Notifications activées (uniquement app ouverte sur cet appareil)',
        'success'
      );
    }
  };

  const bookingLink = ownerId ? `${window.location.origin}/r/${ownerId}` : '';
  const calendarLink = ownerId && calendarToken ? `${window.location.origin}/api/ics?u=${ownerId}&t=${calendarToken}` : '';

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(bookingLink);
      showToast('Lien de réservation copié', 'success');
    } catch {
      showToast('Impossible de copier le lien', 'error');
    }
  };

  const handleCopyCalendarLink = async () => {
    try {
      await navigator.clipboard.writeText(calendarLink);
      showToast('Lien de calendrier copié', 'success');
    } catch {
      showToast('Impossible de copier le lien', 'error');
    }
  };

  const handleLogoFile = async (file) => {
    try {
      const dataUrl = await fileToResizedDataUrl(file, 300);
      updateSalon({ logoUrl: dataUrl });
    } catch {
      showToast("Impossible de lire cette image", 'error');
    }
  };

  const update = (patch) => {
    setForm((f) => ({ ...f, ...patch }));
    setDirty(true);
  };

  const handleSave = (e) => {
    e.preventDefault();
    updateSalon(form);
    setDirty(false);
  };

  const handleImportFile = (file) => {
    if (!window.confirm('Importer cette sauvegarde remplacera toutes les données actuelles (clientes, RDV, stock, catalogue…). Continuer ?')) {
      return;
    }
    const reader = new FileReader();
    reader.onload = async () => {
      setRestoring(true);
      try {
        await restoreBackup(reader.result);
        showToast('Sauvegarde restaurée, rechargement…', 'success');
        setTimeout(() => window.location.reload(), 800);
      } catch (err) {
        setRestoring(false);
        // Distinguer les deux échecs : un fichier illisible se corrige en choisissant le
        // bon fichier, une synchronisation qui échoue se corrige en réessayant plus tard.
        if (err instanceof BackupSyncError) {
          showToast(
            "La restauration a échoué : vos données actuelles n'ont pas été modifiées. Vérifiez votre connexion et réessayez.",
            'error'
          );
        } else {
          showToast('Fichier de sauvegarde invalide', 'error');
        }
      }
    };
    reader.readAsText(file);
  };

  return (
    <>
      <PageHeader title="Paramètres" subtitle="Configurez les informations et préférences du salon" />

      <div className={styles.grid}>
        <form className="card" onSubmit={handleSave}>
          <h3 className="card-title" style={{ marginBottom: 'var(--space-4)' }}>Informations du salon</h3>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="field-group">
              <label className="field-label" htmlFor="st-name">Nom du salon</label>
              <input id="st-name" className="input-field" value={form.name} onChange={(e) => update({ name: e.target.value })} />
            </div>
            <div className="field-group">
              <label className="field-label" htmlFor="st-manager">Nom de la gérante</label>
              <input id="st-manager" className="input-field" value={form.managerName} onChange={(e) => update({ managerName: e.target.value })} />
            </div>
          </div>

          <div className="field-group">
            <label className="field-label" htmlFor="st-address">Adresse</label>
            <input id="st-address" className="input-field" value={form.address} onChange={(e) => update({ address: e.target.value })} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="field-group">
              <label className="field-label" htmlFor="st-phone">Téléphone</label>
              <input id="st-phone" className="input-field" value={form.phone} onChange={(e) => update({ phone: e.target.value })} />
            </div>
            <div className="field-group">
              <label className="field-label" htmlFor="st-email">Email</label>
              <input id="st-email" type="email" className="input-field" value={form.email} onChange={(e) => update({ email: e.target.value })} />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
            <div className="field-group">
              <label className="field-label" htmlFor="st-currency">Devise</label>
              <select id="st-currency" className="input-field" value={form.currency} onChange={(e) => update({ currency: e.target.value })}>
                {CURRENCIES.map((c) => (
                  <option key={c.code} value={c.code}>{c.label}</option>
                ))}
              </select>
            </div>
            <div className="field-group">
              <label className="field-label" htmlFor="st-vat">TVA (%)</label>
              <input id="st-vat" type="number" min={0} max={100} step={0.1} className="input-field" value={form.vatRate} onChange={(e) => update({ vatRate: Number(e.target.value) })} />
            </div>
            <div className="field-group">
              <label className="field-label" htmlFor="st-buffer">Tampon entre RDV (min)</label>
              <input id="st-buffer" type="number" min={0} max={60} step={5} className="input-field" value={form.bufferMinutes} onChange={(e) => update({ bufferMinutes: Number(e.target.value) })} />
            </div>
          </div>

          <div className="field-group" style={{ marginBottom: 0 }}>
            <label className="field-label" htmlFor="st-cancellation">Politique d'annulation</label>
            <textarea
              id="st-cancellation"
              className="input-field"
              rows={3}
              value={form.cancellationPolicy}
              onChange={(e) => update({ cancellationPolicy: e.target.value })}
            />
            <p style={{ fontSize: '0.74rem', color: 'var(--color-text-muted)', marginTop: 8 }}>
              Affichée aux clientes dans l'espace de réservation en ligne.
            </p>
          </div>

          {dirty && (
            <button type="submit" className="btn btn-primary btn-sm" style={{ marginTop: 'var(--space-4)' }}>
              <Icon name="check" size={14} /> Enregistrer les modifications
            </button>
          )}
        </form>

        <div className="card">
          <h3 className="card-title" style={{ marginBottom: 'var(--space-2)' }}>Apparence</h3>

          <div className="field-group">
            <label className="field-label">Logo du salon</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
              <BrandMark size={56} radius="var(--radius-md)" iconSize={26} />
              <label htmlFor="logo-upload" className="btn btn-secondary btn-sm" style={{ cursor: 'pointer' }}>
                <Icon name="camera" size={13} /> {salon.logoUrl ? 'Changer le logo' : 'Ajouter un logo'}
              </label>
              <input
                id="logo-upload"
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleLogoFile(file);
                  e.target.value = '';
                }}
              />
            </div>
            <p style={{ fontSize: '0.74rem', color: 'var(--color-text-muted)', marginTop: 8 }}>
              Remplace l'icône ciseaux dans le menu, la barre du haut et l'espace de réservation.
            </p>
          </div>

          <div className={styles.prefRow} style={{ marginTop: 'var(--space-4)', paddingTop: 'var(--space-4)', borderTop: '1px solid var(--color-border)' }}>
            <div className={styles.prefText}>
              <div className={styles.prefTitle}>Mode sombre</div>
              <div className={styles.prefSubtitle}>Interface à fond sombre, plus confortable en soirée</div>
            </div>
            <Toggle active={appearance.darkMode} onChange={toggleDarkMode} label="Mode sombre" />
          </div>
        </div>
      </div>

      <div className="card" style={{ marginTop: 'var(--space-5)' }}>
        <h3 className="card-title" style={{ marginBottom: 'var(--space-2)' }}>Horaires d'ouverture</h3>
        <p style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', marginBottom: 'var(--space-4)' }}>
          Ces horaires déterminent les créneaux proposés dans l'espace de réservation en ligne.
        </p>
        <div className={styles.hoursTable}>
          {WEEK_DAYS.map((day) => {
            const sched = salon.hours[day];
            return (
              <div key={day} className={styles.hoursRow}>
                <span className={styles.hoursDay}>{DAY_LABELS[day]}</span>
                <input
                  type="time"
                  className={styles.hoursInput}
                  value={sched.open}
                  disabled={sched.closed}
                  onChange={(e) => updateDayHours(day, { open: e.target.value })}
                />
                <input
                  type="time"
                  className={styles.hoursInput}
                  value={sched.close}
                  disabled={sched.closed}
                  onChange={(e) => updateDayHours(day, { close: e.target.value })}
                />
                <Toggle
                  active={!sched.closed}
                  onChange={(active) => updateDayHours(day, { closed: !active })}
                  label={sched.closed ? 'Ouvrir ce jour' : 'Fermer ce jour'}
                />
              </div>
            );
          })}
        </div>
      </div>

      <div className="card" style={{ marginTop: 'var(--space-5)' }}>
        <h3 className="card-title" style={{ marginBottom: 'var(--space-2)' }}>Lien de réservation en ligne</h3>
        <p style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', marginBottom: 'var(--space-4)' }}>
          Une page de réservation autonome (sans connexion, sans redirection vers le logiciel) à partager où tu veux
          — bio Instagram, site web, SMS… Les demandes de RDV arrivent dans "Demandes en attente" sur le tableau de bord,
          à toi de les valider.
        </p>
        <div style={{ display: 'flex', gap: 'var(--space-3)', flexWrap: 'wrap', alignItems: 'center' }}>
          <input className="input-field" readOnly value={bookingLink} style={{ flex: '1 1 260px' }} onFocus={(e) => e.target.select()} />
          <button type="button" className="btn btn-primary btn-sm" onClick={handleCopyLink} disabled={!bookingLink}>
            <Icon name="clipboard" size={14} /> Copier le lien
          </button>
        </div>
      </div>

      <div className="card" style={{ marginTop: 'var(--space-5)' }}>
        <h3 className="card-title" style={{ marginBottom: 'var(--space-2)' }}>Synchronisation avec Google / Apple Agenda</h3>
        <p style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', marginBottom: 'var(--space-4)' }}>
          Un lien privé à coller une seule fois dans Google Calendar ou Apple Calendar ("s'abonner à un calendrier").
          Tes rendez-vous y apparaissent automatiquement et se mettent à jour tout seuls, sans rien reconfigurer.
          Ne partage ce lien avec personne : il donne accès en lecture à ton planning.
        </p>
        <div style={{ display: 'flex', gap: 'var(--space-3)', flexWrap: 'wrap', alignItems: 'center', marginBottom: 'var(--space-4)' }}>
          <input className="input-field" readOnly value={calendarLink} style={{ flex: '1 1 260px' }} onFocus={(e) => e.target.select()} />
          <button type="button" className="btn btn-primary btn-sm" onClick={handleCopyCalendarLink} disabled={!calendarLink}>
            <Icon name="clipboard" size={14} /> Copier le lien
          </button>
        </div>
        <details>
          <summary style={{ fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer', color: 'var(--color-accent-dark)' }}>
            Comment l'ajouter à Google Calendar ou Apple Calendar ?
          </summary>
          <div style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', marginTop: 'var(--space-3)', display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            <p style={{ margin: 0 }}>
              <strong>Google Calendar (ordinateur) :</strong> Autres agendas → "+" → À partir de l'URL → coller le lien → Ajouter l'agenda.
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

      <div className="card" style={{ marginTop: 'var(--space-5)' }}>
        <h3 className="card-title" style={{ marginBottom: 'var(--space-2)' }}>Préférences de notifications</h3>
        <div className={styles.prefRow}>
          <div className={styles.prefText}>
            <div className={styles.prefTitle}>Alertes nouvelles demandes de réservation</div>
            <div className={styles.prefSubtitle}>
              {notifPermission === 'granted'
                ? "Activées — tu reçois une alerte dès qu'une cliente demande un rendez-vous depuis le lien en ligne, même app fermée sur cet appareil."
                : notifPermission === 'denied'
                  ? 'Bloquées dans les réglages de ton navigateur/téléphone — réactive-les manuellement pour les recevoir.'
                  : notifPermission === 'unsupported'
                    ? "Non disponibles sur ce navigateur. Tu verras quand même les demandes en attente sur le tableau de bord."
                    : "Active-les pour être alerté(e) même sans avoir l'app ouverte sous les yeux."}
            </div>
          </div>
          {notifPermission !== 'granted' && notifPermission !== 'unsupported' && (
            <button type="button" className="btn btn-secondary btn-sm" onClick={requestNotifPermission} disabled={notifPermission === 'denied'}>
              Activer
            </button>
          )}
        </div>
        {!isPushSupported() && (
          <p style={{ fontSize: '0.76rem', color: 'var(--color-text-soft)', margin: '0 0 var(--space-3)' }}>
            Sur iPhone/iPad : ajoute d'abord l'app à l'écran d'accueil (bouton Partager → "Sur l'écran
            d'accueil") et ouvre-la depuis cette icône — Safari seul ne permet pas les notifications
            app fermée.
          </p>
        )}
        {NOTIFICATION_ROWS.map((row) => (
          <div key={row.key} className={styles.prefRow} style={row.comingSoon ? { opacity: 0.55 } : undefined}>
            <div className={styles.prefText}>
              <div className={styles.prefTitle}>
                {row.title}
                {row.comingSoon && <span className={styles.soonBadge}>Bientôt disponible</span>}
              </div>
              <div className={styles.prefSubtitle}>{row.subtitle}</div>
            </div>
            <Toggle
              active={row.comingSoon ? false : notifications[row.key]}
              onChange={() => toggleNotification(row.key)}
              label={row.title}
              disabled={row.comingSoon}
            />
          </div>
        ))}
      </div>

      <div className="card" style={{ marginTop: 'var(--space-5)' }}>
        <h3 className="card-title" style={{ marginBottom: 'var(--space-2)' }}>Compte</h3>
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
          <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
            <Link to="/confidentialite" className="btn btn-secondary btn-sm">Confidentialité</Link>
            <Link to="/conditions" className="btn btn-secondary btn-sm">Conditions</Link>
          </div>
        </div>
      </div>

      {inlinePhotoCount > 0 && (
        <div className="card" style={{ marginTop: 'var(--space-5)' }}>
          <h3 className="card-title" style={{ marginBottom: 'var(--space-2)' }}>Optimisation des photos</h3>
          <p style={{ fontSize: '0.82rem', color: 'var(--color-text-soft)', marginBottom: 'var(--space-4)' }}>
            {inlinePhotoCount} photo{inlinePhotoCount > 1 ? 's' : ''} {inlinePhotoCount > 1 ? 'sont' : 'est'} encore
            stockée{inlinePhotoCount > 1 ? 's' : ''} dans la fiche cliente elle-même. Les déplacer vers l'espace
            photo dédié rend l'application nettement plus rapide, surtout sur mobile. Vos photos restent privées et
            accessibles exactement comme aujourd'hui.
          </p>
          <button type="button" className="btn btn-primary btn-sm" onClick={handleMigratePhotos} disabled={migrating}>
            {migrating ? 'Optimisation en cours…' : 'Optimiser maintenant'}
          </button>
        </div>
      )}

      <div className="card" style={{ marginTop: 'var(--space-5)' }}>
        <h3 className="card-title" style={{ marginBottom: 'var(--space-2)' }}>Sauvegarde des données</h3>
        <p style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', marginBottom: 'var(--space-2)' }}>
          Vos données sont synchronisées sur votre compte cloud et retrouvées automatiquement à chaque connexion. Téléchargez aussi une sauvegarde régulièrement par sécurité.
        </p>
        <p style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', marginBottom: 'var(--space-4)' }}>
          Le fichier contient vos clientes, rendez-vous, prestations, stock, dépenses et
          paramètres, ainsi que les signatures et le logo. <strong>Les photos avant/après n'y
          sont pas incluses</strong> : elles restent stockées sur votre espace cloud privé.
        </p>
        <div style={{ display: 'flex', gap: 'var(--space-3)', flexWrap: 'wrap' }}>
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => downloadBackup(salon.name)}>
            <Icon name="download" size={14} /> Télécharger la sauvegarde
          </button>
          <label
            htmlFor="backup-import"
            className="btn btn-ghost btn-sm"
            style={{ cursor: restoring ? 'default' : 'pointer', opacity: restoring ? 0.5 : 1 }}
          >
            <Icon name="upload" size={14} /> {restoring ? 'Restauration…' : 'Importer une sauvegarde'}
          </label>
          <input
            id="backup-import"
            type="file"
            accept="application/json"
            disabled={restoring}
            style={{ display: 'none' }}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleImportFile(file);
              e.target.value = '';
            }}
          />
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
    </>
  );
}
