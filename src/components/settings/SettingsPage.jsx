import { Link } from 'react-router-dom';
import PageHeader from '../common/PageHeader';
import Icon from '../common/Icon';
import styles from '../../pages/Settings.module.css';

/** Enveloppe commune aux sous-pages de réglages : un retour vers l'index, puis le titre.
 *
 *  Le lien de retour est indispensable ici : la barre de navigation pointe sur l'index des
 *  Paramètres, pas sur la rubrique ouverte — sans lui, on ne saurait pas comment remonter
 *  d'un cran sur téléphone. */
export default function SettingsPage({ title, subtitle, children }) {
  return (
    <>
      <Link to="/parametres" className={styles.backLink}>
        <Icon name="arrow-left" size={16} /> Paramètres
      </Link>
      <PageHeader title={title} subtitle={subtitle} />
      {children}
    </>
  );
}
