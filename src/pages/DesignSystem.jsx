import { useEffect, useState } from 'react';
import styles from './DesignSystem.module.css';

/* Guide de style interne. Les valeurs ne sont jamais recopiées à la main : elles sont lues
   sur le document via getComputedStyle, donc cette page ne peut pas se désynchroniser de
   styles/variables.css. Elle sert à valider la charte d'un coup d'œil, en clair et en sombre. */

const GROUPS = [
  {
    title: 'Accent doré',
    note: "L'or est un accent — aplats, icônes, valorisation — jamais un fond dominant.",
    tokens: ['--color-accent', '--color-accent-dark', '--color-accent-light', '--color-accent-light-hover'],
  },
  {
    title: 'Fonds et surfaces',
    tokens: ['--color-cream', '--color-white', '--color-sand', '--color-border'],
  },
  {
    title: 'Texte',
    note: 'Le ratio est calculé sur le fond principal. AA exige 4,5:1 pour le texte courant.',
    tokens: ['--color-text', '--color-text-soft', '--color-text-muted', '--color-taupe'],
    contrast: true,
  },
  {
    title: 'Sémantique',
    tokens: ['--color-success', '--color-warning', '--color-danger', '--color-info'],
  },
  {
    title: 'Statuts de rendez-vous',
    tokens: ['--status-confirmed', '--status-pending', '--status-completed', '--status-cancelled', '--status-noshow'],
  },
];

const BADGES = [
  ['Confirmé', '--status-confirmed', '--color-success-bg'],
  ['En attente', '--status-pending', '--color-warning-bg'],
  ['Terminé', '--status-completed', '--color-info-bg'],
  ['Annulé', '--status-cancelled', '--color-neutral-bg'],
  ['Absence', '--status-noshow', '--color-danger-bg'],
];

const RADII = ['--radius-sm', '--radius-md', '--radius-lg', '--radius-xl', '--radius-pill'];
const SHADOWS = ['--shadow-sm', '--shadow-md', '--shadow-lg'];
const SPACES = ['--space-1', '--space-2', '--space-3', '--space-4', '--space-5', '--space-6', '--space-8', '--space-10', '--space-12'];

/** Luminance relative WCAG d'une couleur CSS résolue en rgb(). */
function luminance(color) {
  const m = color.match(/\d+(\.\d+)?/g);
  if (!m || m.length < 3) return null;
  const [r, g, b] = m.slice(0, 3).map((v) => {
    const c = Number(v) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrastRatio(a, b) {
  const la = luminance(a);
  const lb = luminance(b);
  if (la === null || lb === null) return null;
  const [hi, lo] = la > lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
}

export default function DesignSystem() {
  const [values, setValues] = useState({});
  const [dark, setDark] = useState(() => document.documentElement.getAttribute('data-theme') === 'dark');

  useEffect(() => {
    // Un probe hors écran permet de résoudre une variable en valeur calculée (rgb(...)),
    // ce que getPropertyValue seul ne fait pas pour les couleurs.
    const probe = document.createElement('span');
    probe.style.display = 'none';
    document.body.appendChild(probe);
    const root = getComputedStyle(document.documentElement);
    const all = [
      ...GROUPS.flatMap((g) => g.tokens),
      ...BADGES.flatMap(([, fg, bg]) => [fg, bg]),
      ...RADII,
      ...SHADOWS,
      ...SPACES,
    ];
    const next = {};
    all.forEach((token) => {
      const raw = root.getPropertyValue(token).trim();
      next[token] = { raw, resolved: raw };
      if (raw.startsWith('#') || raw.startsWith('rgb')) {
        probe.style.color = raw;
        next[token].resolved = getComputedStyle(probe).color;
      }
    });
    probe.remove();
    setValues(next);
  }, [dark]);

  const bg = values['--color-cream']?.resolved;

  const badgeRatios = Object.fromEntries(
    BADGES.map(([label, fg, bgToken]) => [
      label,
      values[fg] && values[bgToken] ? contrastRatio(values[fg].resolved, values[bgToken].resolved) : null,
    ])
  );

  const toggleTheme = () => {
    const next = !dark;
    document.documentElement.setAttribute('data-theme', next ? 'dark' : 'light');
    setDark(next);
  };

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <p className={styles.eyebrow}>Guide de style interne</p>
          <h1 className={styles.title}>Cat&apos;s Eyes</h1>
          <p className={styles.lede}>
            L&apos;outil qui sublime votre métier. Or, crème, taupe, noir chaud — luxe discret,
            aucune couleur saturée, aucun dégradé.
          </p>
        </div>
        <button type="button" className="btn btn-secondary btn-sm" onClick={toggleTheme}>
          {dark ? 'Voir en clair' : 'Voir en sombre'}
        </button>
      </header>

      {GROUPS.map((group) => (
        <section key={group.title} className={styles.section}>
          <h2 className={styles.sectionTitle}>{group.title}</h2>
          {group.note && <p className={styles.note}>{group.note}</p>}
          <div className={styles.swatchGrid}>
            {group.tokens.map((token) => {
              const v = values[token];
              const ratio = group.contrast && bg && v ? contrastRatio(v.resolved, bg) : null;
              return (
                <div key={token} className={styles.swatch}>
                  <div className={styles.chip} style={{ background: `var(${token})` }} />
                  <code className={styles.token}>{token}</code>
                  <span className={styles.value}>{v?.raw || '—'}</span>
                  {ratio && (
                    <span className={ratio >= 4.5 ? styles.pass : styles.fail}>
                      {ratio.toFixed(2)}:1 {ratio >= 4.5 ? 'AA' : 'sous AA'}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      ))}

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Typographie</h2>
        <p className={styles.note}>Playfair Display pour les titres et la marque, DM Sans pour l&apos;interface.</p>
        <div className="card">
          <p className={styles.typeTitle}>Sublimer le regard</p>
          <p className={styles.typeH2}>Prochains rendez-vous</p>
          <p className={styles.typeBody}>
            Votre clientèle, votre art, votre studio. Le texte courant reste en DM Sans pour la
            lisibilité ; les titres passent en Playfair Display, sans graisse excessive.
          </p>
          <p className={styles.typeCaption}>Légende et mentions secondaires</p>
        </div>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Boutons</h2>
        <p className={styles.note}>
          Le bouton primaire porte du texte noir chaud, jamais blanc : sur l&apos;or, le blanc
          tombe à 2,2:1.
        </p>
        <div className={styles.row}>
          <button type="button" className="btn btn-primary">Nouveau rendez-vous</button>
          <button type="button" className="btn btn-secondary">Voir le calendrier</button>
          <button type="button" className="btn btn-ghost">Annuler</button>
          <button type="button" className="btn btn-danger">Supprimer</button>
          <button type="button" className="btn btn-primary btn-sm">Petit format</button>
          <button type="button" className="btn btn-primary" disabled>Indisponible</button>
        </div>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Champs et cartes</h2>
        <div className={styles.twoCol}>
          <div className="card">
            <h3 className="card-title">Informations</h3>
            <div className="field-group" style={{ marginTop: 'var(--space-4)' }}>
              <label className="field-label" htmlFor="ds-name">Nom de la cliente</label>
              <input id="ds-name" className="input-field" defaultValue="Emma Dupont" />
            </div>
            <div className="field-group">
              <label className="field-label" htmlFor="ds-note">Préférences</label>
              <input id="ds-note" className="input-field" placeholder="Volume russe léger, courbure D" />
            </div>
          </div>
          <div className="card">
            <h3 className="card-title">Badges de statut</h3>
            <p className={styles.note}>
              Contraste mesuré sur le fond du badge lui-même, pas sur celui de la page.
            </p>
            <div className={styles.badgeList}>
              {BADGES.map(([label, fg, bgToken]) => {
                const ratio = badgeRatios[label];
                return (
                  <div key={label} className={styles.badgeRow}>
                    <span className="badge" style={{ color: `var(${fg})`, background: `var(${bgToken})` }}>
                      {label}
                    </span>
                    {ratio && (
                      <span className={ratio >= 4.5 ? styles.pass : styles.fail}>
                        {ratio.toFixed(2)}:1 {ratio >= 4.5 ? 'AA' : 'sous AA'}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Rayons, ombres, espacements</h2>
        <div className={styles.row}>
          {RADII.map((token) => (
            <div key={token} className={styles.radiusDemo} style={{ borderRadius: `var(${token})` }}>
              {token.replace('--radius-', '')}
            </div>
          ))}
        </div>
        <div className={styles.row} style={{ marginTop: 'var(--space-6)' }}>
          {SHADOWS.map((token) => (
            <div key={token} className={styles.shadowDemo} style={{ boxShadow: `var(${token})` }}>
              {token.replace('--shadow-', '')}
            </div>
          ))}
        </div>
        <div className={styles.spaceRow}>
          {SPACES.map((token) => (
            <div key={token} className={styles.spaceItem}>
              <div className={styles.spaceBar} style={{ width: `var(${token})` }} />
              <code className={styles.token}>{values[token]?.raw || '—'}</code>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
