import { Link } from 'react-router-dom';
import BrandMark from './BrandMark';
import { LAST_UPDATED, SUBPROCESSORS } from '../../data/legalText';
import styles from './LegalDocument.module.css';

/** Mise en page commune aux documents juridiques publics (confidentialité, conditions).
 * Accessible sans être connectée : ces pages doivent être consultables avant de créer
 * un compte. */
export default function LegalDocument({ title, intro, sections, otherLink }) {
  return (
    <div className={styles.wrap}>
      <div className={styles.sheet}>
        <header className={styles.header}>
          <BrandMark size={44} radius="var(--radius-md)" iconSize={20} />
          <div>
            <h1 className={styles.title}>{title}</h1>
            <p className={styles.updated}>Dernière mise à jour : {LAST_UPDATED}</p>
          </div>
        </header>

        {intro && <p className={styles.intro}>{intro}</p>}

        {sections.map((section) => (
          <section key={section.title} className={section.highlight ? styles.sectionHighlight : styles.section}>
            <h2 className={styles.sectionTitle}>{section.title}</h2>

            {section.paragraphs?.map((text, i) => (
              <p key={i} className={styles.paragraph}>{text}</p>
            ))}

            {section.bullets && (
              <ul className={styles.list}>
                {section.bullets.map((item, i) => (
                  <li key={i}>{item}</li>
                ))}
              </ul>
            )}

            {section.subprocessors && (
              <ul className={styles.subList}>
                {SUBPROCESSORS.map((sp) => (
                  <li key={sp.name}>
                    <strong>{sp.name}</strong> — {sp.role}
                    <span className={styles.spLocation}>{sp.location}</span>
                  </li>
                ))}
              </ul>
            )}

            {section.afterParagraphs?.map((text, i) => (
              <p key={i} className={styles.paragraph}>{text}</p>
            ))}
          </section>
        ))}

        <footer className={styles.footer}>
          <Link to={otherLink.to} className={styles.footerLink}>{otherLink.label}</Link>
          <Link to="/" className={styles.footerLink}>Retour à l'application</Link>
        </footer>
      </div>
    </div>
  );
}
