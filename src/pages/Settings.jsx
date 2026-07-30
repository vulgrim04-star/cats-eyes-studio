import { Link } from 'react-router-dom';
import PageHeader from '../components/common/PageHeader';
import Icon from '../components/common/Icon';
import { useSettings } from '../hooks/useSettings';
import { useAuthStore } from '../store/useAuthStore';
import { formatVersionLabel } from '../utils/appVersion';
import styles from './Settings.module.css';

/** Index des réglages.
 *
 *  Les onze cartes se succédaient auparavant sur un seul écran : pour atteindre la zone
 *  dangereuse il fallait faire défiler tout le reste, et rien n'indiquait où l'on était.
 *  Chaque rubrique a maintenant sa page — le premier écran tient en un coup d'œil. */
export default function Settings() {
  const { salon } = useSettings();
  const email = useAuthStore((s) => s.session?.user?.email);

  const sections = [
    { to: '/parametres/salon', icon: 'sparkles', title: 'Salon', subtitle: salon.name || 'Coordonnées, devise, horaires' },
    { to: '/parametres/notifications', icon: 'bell', title: 'Notifications', subtitle: "Alertes sur le téléphone et par e-mail" },
    { to: '/parametres/reservation', icon: 'calendar', title: 'Réservation en ligne', subtitle: 'Lien public et synchronisation d’agenda' },
    { to: '/parametres/apparence', icon: 'camera', title: 'Apparence', subtitle: 'Logo et mode sombre' },
    { to: '/parametres/donnees', icon: 'download', title: 'Données', subtitle: 'Sauvegarde, restauration, photos' },
    { to: '/parametres/compte', icon: 'users', title: 'Compte', subtitle: email || 'Connexion, aide, mentions légales' },
  ];

  return (
    <>
      <PageHeader title="Paramètres" subtitle="Configurez les informations et préférences du salon" />

      <div className={styles.sections}>
        {sections.map((section) => (
          <Link key={section.to} to={section.to} className={styles.sectionCard}>
            <span className={styles.sectionIcon}>
              <Icon name={section.icon} size={20} />
            </span>
            <span className={styles.sectionText}>
              <span className={styles.sectionTitle}>{section.title}</span>
              <span className={styles.sectionSubtitle}>{section.subtitle}</span>
            </span>
            <span className={styles.sectionChevron}>
              <Icon name="chevron-right" size={18} />
            </span>
          </Link>
        ))}
      </div>

      {/* Rend vérifiable ce qui ne l'était pas : « est-ce que ma mise à jour est arrivée ? »
          se répond en lisant cette ligne, au lieu de chercher à l'œil ce qui a changé. */}
      <p className={styles.version}>Version {formatVersionLabel()}</p>
    </>
  );
}
