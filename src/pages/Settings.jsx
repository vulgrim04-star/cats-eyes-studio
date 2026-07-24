import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import PageHeader from '../components/common/PageHeader';
import Icon from '../components/common/Icon';
import BrandMark from '../components/common/BrandMark';
import Toggle from '../components/common/Toggle';
import { useSettings, WEEK_DAYS } from '../hooks/useSettings';
import { useToast } from '../hooks/useToast';
import { fileToResizedDataUrl } from '../utils/image';
import { CURRENCIES } from '../utils/format';
import { downloadBackup, restoreBackup } from '../utils/backup';
import { subscribeToPush, isPushSupported } from '../utils/push';
import { signOut, useAuthStore } from '../store/useAuthStore';
import DeleteAccountModal from '../components/settings/DeleteAccountModal';
import ResetDataModal from '../components/settings/ResetDataModal';
import styles from './Settings.module.css';

const DAY_LABELS = { lun: 'Lun', mar: 'Mar', mer: 'Mer', jeu: 'Jeu', ven: 'Ven', sam: 'Sam', dim: 'Dim' };

const NOTIFICATION_ROWS = [
  { key: 'newBookingAlert', title: 'Notification nouvelle réservation', subtitle: "Notification sur ton téléphone/ordinateur dès qu'une cliente réserve via le lien en ligne, même app fermée (nécessite d'activer les notifications ci-dessus)" },
  { key: 'newBookingEmail', title: 'E-mail nouvelle réservation', subtitle: "Recevoir un e-mail à l'adresse du salon dès qu'une cliente réserve via le lien en ligne" },
  { key: 'autoConfirm', title: 'Confirmation automatique', subtitle: "Envoyer un e-mail de confirmation à la cliente dès qu'un RDV est créé (si son adresse e-mail est enregistrée)" },
  { key: 'reminder24h', title: 'Rappel 24h avant', subtitle: 'Envoyer un rappel automatique la veille du rendez-vous (simulation)' },
  { key: 'reminder2h', title: 'Rappel 2h avant', subtitle: 'Envoyer un rappel automatique quelques heures avant le rendez-vous (simulation)' },
];

const COLOR_SWATCHES = ['#C8718A', '#8B5CF6', '#4F9DDE', '#4CA97A', '#D9A441', '#C6667A'];

export default function Settings() {
  const { salon, notifications, appearance, updateSalon, updateDayHours, toggleNotification, setThemeColor, toggleDarkMode, calendarToken, ensureCalendarToken } = useSettings();
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
    reader.onload = () => {
      try {
        restoreBackup(reader.result);
        showToast('Sauvegarde restaurée, rechargement…', 'success');
        setTimeout(() => window.location.reload(), 800);
      } catch {
        showToast('Fichier de sauvegarde invalide', 'error');
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

          <p style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', marginBottom: 'var(--space-4)' }}>
            Couleur principale de l'interface.
          </p>
          <div className={styles.colorRow}>
            <input
              type="color"
              className={styles.colorPicker}
              value={appearance.themeColor}
              onChange={(e) => setThemeColor(e.target.value)}
              aria-label="Couleur principale"
            />
            <div className={styles.swatches}>
              {COLOR_SWATCHES.map((color) => (
                <button
                  key={color}
                  type="button"
                  className={styles.swatch}
                  style={{ background: color }}
                  onClick={() => setThemeColor(color)}
                  aria-label={color}
                />
              ))}
            </div>
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
          <summary style={{ fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer', color: 'var(--color-rose-dark)' }}>
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
          <div key={row.key} className={styles.prefRow}>
            <div className={styles.prefText}>
              <div className={styles.prefTitle}>{row.title}</div>
              <div className={styles.prefSubtitle}>{row.subtitle}</div>
            </div>
            <Toggle active={notifications[row.key]} onChange={() => toggleNotification(row.key)} label={row.title} />
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
            <div className={styles.prefTitle}>Informations légales</div>
            <div className={styles.prefSubtitle}>Politique de confidentialité et conditions d'utilisation</div>
          </div>
          <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
            <Link to="/confidentialite" className="btn btn-secondary btn-sm">Confidentialité</Link>
            <Link to="/conditions" className="btn btn-secondary btn-sm">Conditions</Link>
          </div>
        </div>
      </div>

      <div className="card" style={{ marginTop: 'var(--space-5)' }}>
        <h3 className="card-title" style={{ marginBottom: 'var(--space-2)' }}>Sauvegarde des données</h3>
        <p style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', marginBottom: 'var(--space-4)' }}>
          Vos données sont synchronisées sur votre compte cloud et retrouvées automatiquement à chaque connexion. Téléchargez aussi une sauvegarde régulièrement par sécurité.
        </p>
        <div style={{ display: 'flex', gap: 'var(--space-3)', flexWrap: 'wrap' }}>
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => downloadBackup(salon.name)}>
            <Icon name="download" size={14} /> Télécharger la sauvegarde
          </button>
          <label htmlFor="backup-import" className="btn btn-ghost btn-sm" style={{ cursor: 'pointer' }}>
            <Icon name="upload" size={14} /> Importer une sauvegarde
          </label>
          <input
            id="backup-import"
            type="file"
            accept="application/json"
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
    </>
  );
}
