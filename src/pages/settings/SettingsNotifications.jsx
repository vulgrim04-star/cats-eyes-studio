import { useCallback, useEffect, useState } from 'react';
import SettingsPage from '../../components/settings/SettingsPage';
import Icon from '../../components/common/Icon';
import Toggle from '../../components/common/Toggle';
import { useSettings } from '../../hooks/useSettings';
import { useToast } from '../../hooks/useToast';
import { useAuthStore } from '../../store/useAuthStore';
import { clientVapidKey, localPushState, pushReasonText, sendTestPush, subscribeToPush } from '../../utils/push';
import styles from '../Settings.module.css';

const NOTIFICATION_ROWS = [
  { key: 'newBookingAlert', title: 'Notification nouvelle réservation', subtitle: "Notification sur ton téléphone dès qu'une cliente réserve via le lien en ligne, même app fermée" },
  { key: 'newBookingEmail', title: 'E-mail nouvelle réservation', subtitle: "Recevoir un e-mail à l'adresse du salon dès qu'une cliente réserve via le lien en ligne" },
  { key: 'autoConfirm', title: 'Confirmation automatique', subtitle: "Envoyer un e-mail de confirmation à la cliente dès qu'un RDV est créé (si son adresse e-mail est enregistrée)" },
  // Ces deux réglages étaient enregistrés mais lus nulle part : aucun rappel n'a jamais été
  // envoyé. Les laisser activables faisait compter sur une fonctionnalité inexistante.
  { key: 'reminder24h', title: 'Rappel 24h avant', subtitle: 'Envoyer un rappel automatique la veille du rendez-vous.', comingSoon: true },
  { key: 'reminder2h', title: 'Rappel 2h avant', subtitle: 'Envoyer un rappel automatique quelques heures avant le rendez-vous.', comingSoon: true },
];

/** Une ligne du diagnostic. `state` vaut true (OK), false (bloquant) ou null (inconnu). */
function CheckRow({ state, label, hint }) {
  const icon = state === true ? 'check-circle' : state === false ? 'alert-triangle' : 'clock';
  const color = state === true ? 'var(--color-success)' : state === false ? 'var(--color-warning)' : 'var(--color-text-muted)';
  return (
    <div className={styles.checkRow}>
      <span style={{ color, flexShrink: 0, display: 'flex' }}>
        <Icon name={icon} size={16} />
      </span>
      <div>
        <div className={styles.checkLabel}>{label}</div>
        {hint && <div className={styles.checkHint}>{hint}</div>}
      </div>
    </div>
  );
}

export default function SettingsNotifications() {
  const { notifications, toggleNotification } = useSettings();
  const { showToast } = useToast();
  const ownerId = useAuthStore((s) => s.session?.user?.id);

  const [pushState, setPushState] = useState({ supported: true, permission: 'default', subscribed: false });
  const [server, setServer] = useState(null); // null = pas encore lu
  const [message, setMessage] = useState(null);
  const [testing, setTesting] = useState(false);

  const refresh = useCallback(async () => {
    setPushState(await localPushState());
  }, []);

  useEffect(() => {
    refresh();
    // Le diagnostic serveur est affiché d'emblée, sans attendre un clic : la cause la plus
    // fréquente (une clé absente du déploiement) se voit alors sans rien avoir à chercher.
    fetch('/api/health')
      .then((r) => r.json())
      .then((data) => setServer(data?.checks ?? null))
      .catch(() => setServer({}));
  }, [refresh]);

  const requestPermission = async () => {
    if (typeof Notification === 'undefined') return;
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      await refresh();
      setMessage({ ok: false, text: pushReasonText(permission === 'denied' ? 'permission-denied' : 'permission-missing') });
      return;
    }
    const result = await subscribeToPush(ownerId);
    await refresh();
    setMessage({ ok: result.ok, text: pushReasonText(result.reason) });
    if (result.ok) showToast('Notifications activées sur cet appareil', 'success');
  };

  const handleTest = async () => {
    setTesting(true);
    setMessage(null);
    // On réabonne d'abord : le test doit dire si ça marche MAINTENANT, pas si ça marchait le
    // jour où la permission a été accordée.
    const local = await subscribeToPush(ownerId);
    await refresh();
    if (!local.ok) {
      setTesting(false);
      setMessage({ ok: false, text: pushReasonText(local.reason) });
      return;
    }
    const result = await sendTestPush();
    setTesting(false);
    setMessage({
      ok: result.ok,
      text: result.ok
        ? "Notification envoyée. Si rien n'apparaît d'ici quelques secondes, vérifie que les notifications de l'app ne sont pas coupées dans les réglages du téléphone."
        : pushReasonText(result.reason),
    });
  };

  const hasClientKey = Boolean(clientVapidKey());

  return (
    <SettingsPage title="Notifications" subtitle="Ce que l'application t'envoie, et sur quels appareils">
      <div className="card">
        <h3 className="card-title" style={{ marginBottom: 'var(--space-3)' }}>Notifications sur cet appareil</h3>

        <div className={styles.checkList}>
          <CheckRow
            state={pushState.supported ? true : false}
            label={pushState.supported ? 'Navigateur compatible' : 'Navigateur incompatible'}
            hint={pushState.supported ? null : "Sur iPhone/iPad : ajoute l'app à l'écran d'accueil (Partager → « Sur l'écran d'accueil ») et ouvre-la depuis cette icône."}
          />
          <CheckRow
            state={pushState.permission === 'granted' ? true : false}
            label={pushState.permission === 'granted' ? 'Autorisation accordée' : 'Autorisation à donner'}
            hint={pushState.permission === 'denied' ? 'Bloquée dans les réglages du navigateur ou du téléphone — à réautoriser à la main.' : null}
          />
          <CheckRow
            state={hasClientKey}
            label={hasClientKey ? "Clé de notification présente dans l'app" : "Clé de notification absente de l'app"}
            hint={hasClientKey ? null : 'Variable VITE_VAPID_PUBLIC_KEY à ajouter dans Vercel, puis redéployer (une variable VITE_ est figée à la construction).'}
          />
          <CheckRow
            state={server === null ? null : Boolean(server.vapidConfigured)}
            label={server === null ? 'Vérification du serveur…' : server.vapidConfigured ? 'Serveur prêt à envoyer' : "Clés absentes côté serveur"}
            hint={server && !server.vapidConfigured ? 'VAPID_PUBLIC_KEY et VAPID_PRIVATE_KEY à ajouter dans Vercel.' : null}
          />
          <CheckRow
            state={pushState.subscribed}
            label={pushState.subscribed ? 'Cet appareil est abonné' : "Cet appareil n'est pas abonné"}
            hint={pushState.subscribed ? 'Tu seras alertée même app fermée.' : null}
          />
        </div>

        <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap', marginTop: 'var(--space-4)' }}>
          {pushState.supported && !pushState.subscribed && pushState.permission !== 'denied' && (
            <button type="button" className="btn btn-primary btn-sm" onClick={requestPermission}>
              <Icon name="bell" size={14} /> Activer sur cet appareil
            </button>
          )}
          {pushState.supported && pushState.permission === 'granted' && (
            <button type="button" className="btn btn-secondary btn-sm" onClick={handleTest} disabled={testing}>
              {testing ? 'Envoi…' : 'Envoyer une notification de test'}
            </button>
          )}
        </div>

        {message && (
          <p
            style={{
              fontSize: '0.78rem',
              lineHeight: 1.45,
              margin: 'var(--space-3) 0 0',
              color: message.ok ? 'var(--color-success)' : 'var(--color-warning)',
            }}
          >
            {message.text}
          </p>
        )}
      </div>

      <div className="card" style={{ marginTop: 'var(--space-5)' }}>
        <h3 className="card-title" style={{ marginBottom: 'var(--space-2)' }}>Ce que tu reçois</h3>
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
    </SettingsPage>
  );
}
