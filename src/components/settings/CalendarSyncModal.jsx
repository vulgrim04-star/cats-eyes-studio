import { useCallback, useEffect, useState } from 'react';
import Modal from '../common/Modal';
import Icon from '../common/Icon';
import { useCalendarSync } from '../../hooks/useCalendarSync';
import { APPLE, GOOGLE } from '../../utils/calendarSync';
import { useToast } from '../../hooks/useToast';
import styles from './CalendarSyncModal.module.css';

const REASON_TEXT = {
  'signed-out': 'Session expirée — reconnecte-toi puis réessaie.',
  demo: "La synchronisation d'agenda n'est pas disponible en mode démonstration : rien n'y est enregistré, il n'y aurait donc aucun rendez-vous à afficher.",
  'not-published':
    "Tes paramètres n'ont pas pu être enregistrés dans le cloud — sans ça, l'agenda refuserait l'abonnement. Vérifie ta connexion, puis réessaie.",
};

const reasonText = (reason) =>
  REASON_TEXT[reason] ?? "La synchronisation n'a pas pu être préparée. Réessaie dans un instant.";

const CHOICES = [
  {
    key: APPLE,
    title: 'Apple Calendrier',
    subtitle: 'iPhone, iPad, Mac — la fenêtre « S’abonner au calendrier » s’ouvre directement.',
  },
  {
    key: GOOGLE,
    title: 'Google Agenda',
    subtitle: 'Android, ordinateur — Google demande simplement de confirmer l’ajout.',
  },
];

/** « Synchroniser mon agenda » : choisir sa plateforme, et c'est fait.
 *
 *  Le flux `.ics` existait déjà, mais il fallait copier son adresse et aller la coller dans
 *  les réglages de Google ou d'iOS — une manipulation que personne ne fait spontanément, et
 *  la fonctionnalité restait donc inutilisée. Ici, un bouton ouvre directement la fenêtre
 *  d'abonnement du système ; il ne reste qu'à confirmer.
 *
 *  Toute la préparation (créer le jeton d'accès, s'assurer que le serveur le connaît) a lieu
 *  à L'OUVERTURE de la fenêtre, jamais au clic. Ce n'est pas un détail d'ergonomie : ouvrir
 *  un onglet depuis un gestionnaire qui a déjà attendu une promesse n'est plus considéré
 *  comme une action de l'utilisatrice, et Safari comme Firefox bloquent alors purement et
 *  simplement l'ouverture de Google Agenda. Au clic, il ne doit rester qu'une navigation.
 *
 *  Le lien à coller à la main reste accessible juste en dessous : c'est le seul recours sur
 *  les plateformes qui n'ont ni l'un ni l'autre (Outlook de bureau, Thunderbird…).
 *
 *  `onDownloadFile`, quand l'appelant le fournit, ajoute au même endroit l'export d'un
 *  fichier `.ics` figé. Les deux se ressemblent assez pour qu'on les confonde, et ils sont
 *  pourtant opposés — l'un se met à jour, l'autre est un instantané ; les réunir ici est le
 *  seul moyen de dire lequel fait quoi au moment où la question se pose. */
export default function CalendarSyncModal({ open, onClose, onDownloadFile }) {
  const { target, prepare, subscribeUrls } = useCalendarSync();
  const { showToast } = useToast();

  const [ready, setReady] = useState(null); // null = préparation en cours
  const [notice, setNotice] = useState(null);

  const run = useCallback(async () => {
    setReady(null);
    setNotice(null);
    const result = await prepare();
    setReady(result);
    if (!result.ok) setNotice(reasonText(result.reason));
  }, [prepare]);

  useEffect(() => {
    if (!open) return;
    run();
  }, [open, run]);

  // La plateforme détectée passe en tête. Sur un appareil non reconnu, l'ordre d'origine
  // convient : aucune des deux n'est alors plus probable que l'autre.
  const choices = [...CHOICES.filter((c) => c.key === target), ...CHOICES.filter((c) => c.key !== target)];

  const subscribe = (kind) => {
    if (!ready?.ok) return;
    const urls = subscribeUrls(ready.feedUrl);

    if (kind === GOOGLE) {
      // Une vraie page web : on sait qu'elle s'ouvre, on peut refermer derrière nous.
      window.open(urls.google, '_blank', 'noopener,noreferrer');
      showToast('Confirme l’ajout dans l’onglet Google Agenda qui vient de s’ouvrir', 'success');
      onClose?.();
      return;
    }

    // `webcal:` n'est pas une page mais un schéma pris en charge par le SYSTÈME : navigation
    // directe, un nouvel onglet resterait vide à l'écran. Et on ne referme pas la fenêtre :
    // là où aucune application ne réclame ce schéma — un Windows sans logiciel de calendrier,
    // un Android — il ne se passe rigoureusement rien, et refermer sur un message de succès
    // laisserait croire que l'abonnement est fait. Le repli reste donc sous les yeux.
    window.location.href = urls.apple;
    setNotice(
      'Confirme l’abonnement dans la fenêtre qui vient de s’ouvrir. Si rien ne s’est ouvert, cet appareil ne gère pas ' +
        'les abonnements Apple : utilise le lien à copier juste en dessous.'
    );
  };

  const copyLink = async () => {
    if (!ready?.ok) return;
    try {
      await navigator.clipboard.writeText(ready.feedUrl);
      showToast('Lien de calendrier copié', 'success');
    } catch {
      showToast('Impossible de copier — sélectionne le lien et copie-le à la main', 'error');
    }
  };

  const preparing = ready === null;
  const usable = ready?.ok === true;

  return (
    <Modal open={open} onClose={onClose} title="Synchroniser mon agenda" maxWidth="520px">
      <p className={styles.intro}>
        Tes rendez-vous apparaissent dans ton agenda personnel et s’y mettent à jour tout seuls. Rien à installer :
        choisis ton agenda, confirme, c’est terminé.
      </p>

      <div className={styles.choices}>
        {choices.map((choice) => (
          <button
            key={choice.key}
            type="button"
            className={`${styles.choice} ${choice.key === target ? styles.choiceRecommended : ''}`}
            onClick={() => subscribe(choice.key)}
            disabled={!usable}
          >
            <span className={styles.choiceIcon}>
              <Icon name="calendar" size={22} />
            </span>
            <span className={styles.choiceText}>
              <span className={styles.choiceTitle}>
                {choice.title}
                {choice.key === target && <span className={styles.badge}>Recommandé</span>}
              </span>
              <span className={styles.choiceSubtitle}>{preparing ? 'Préparation…' : choice.subtitle}</span>
            </span>
            <Icon name="chevron-right" size={16} />
          </button>
        ))}
      </div>

      {notice && (
        <p className={`${styles.message} ${styles.messageNotice}`} role="alert">
          {notice}{' '}
          {!usable && !preparing && (
            <button type="button" className={styles.retry} onClick={run}>
              Réessayer
            </button>
          )}
        </p>
      )}

      <p className={styles.note}>
        Google et Apple relisent l’agenda toutes les quelques heures : un rendez-vous ajouté à l’instant n’y apparaît
        donc pas immédiatement. La synchronisation va dans un seul sens — l’application reste la référence, et rien de
        ce que tu écris dans Google ou Apple ne revient ici.
      </p>

      <details className={styles.manual}>
        <summary className={styles.manualSummary}>Un autre agenda (Outlook, Thunderbird…) ?</summary>
        <div className={styles.manualBody}>
          <p>
            Colle ce lien privé dans la fonction « s’abonner à un calendrier » de ton logiciel. Ne le partage avec
            personne : il donne accès en lecture à ton planning.
          </p>
          <div className={styles.linkRow}>
            <input
              className="input-field"
              readOnly
              value={ready?.feedUrl ?? ''}
              aria-label="Lien d’abonnement au calendrier"
              onFocus={(e) => e.target.select()}
            />
            <button type="button" className="btn btn-secondary btn-sm" onClick={copyLink} disabled={!usable}>
              <Icon name="clipboard" size={14} /> Copier
            </button>
          </div>
          {onDownloadFile && (
            <>
              <p>
                Ou télécharge un fichier <strong>.ics</strong> à importer une fois. Attention à la différence : c’est un
                instantané, il ne se mettra jamais à jour. Pour un agenda qui suit tes rendez-vous, prends le lien
                ci-dessus.
              </p>
              <div className={styles.linkRow}>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => {
                    onDownloadFile();
                    onClose?.();
                  }}
                >
                  <Icon name="download" size={14} /> Télécharger le fichier .ics
                </button>
              </div>
            </>
          )}
        </div>
      </details>
    </Modal>
  );
}
