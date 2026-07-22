import styles from './EyeDiagram.module.css';

// Positions horizontales des 6 zones (en % de la largeur) et décalage vertical
// pour suivre l'arc des cils (zones centrales plus hautes).
const ZONES = [
  { left: 10, top: 28 },
  { left: 26, top: 12 },
  { left: 42, top: 2 },
  { left: 58, top: 2 },
  { left: 74, top: 12 },
  { left: 90, top: 28 },
];

// Point sur la courbe de Bézier quadratique du bord ciliaire.
function lashLinePoint(t) {
  const p0 = { x: 20, y: 92 };
  const p1 = { x: 140, y: 48 };
  const p2 = { x: 260, y: 92 };
  const x = (1 - t) ** 2 * p0.x + 2 * (1 - t) * t * p1.x + t ** 2 * p2.x;
  const y = (1 - t) ** 2 * p0.y + 2 * (1 - t) * t * p1.y + t ** 2 * p2.y;
  return { x, y };
}

function Lashes() {
  const lashes = [];
  for (let i = 0; i <= 22; i += 1) {
    const t = 0.04 + (i / 22) * 0.92;
    const { x, y } = lashLinePoint(t);
    // Cils plus longs au centre, légèrement inclinés vers l'extérieur
    const len = 16 + Math.sin(Math.PI * t) * 14;
    const slant = (t - 0.5) * 26;
    lashes.push(
      <line
        key={i}
        x1={x}
        y1={y}
        x2={x + slant}
        y2={y - len}
        stroke="var(--color-text)"
        strokeWidth="1.6"
        strokeLinecap="round"
        opacity="0.85"
      />
    );
  }
  return lashes;
}

export default function EyeDiagram({ title, zones, onChange, readOnly = false }) {
  const values = zones ?? ['', '', '', '', '', ''];

  return (
    <div className={styles.wrap}>
      <div className={styles.title}>{title}</div>
      <div className={styles.inputsRow}>
        {ZONES.map((zone, i) =>
          readOnly ? (
            <span key={i} className={styles.zoneValue} style={{ left: `${zone.left}%`, top: zone.top + 14 }}>
              {values[i] || '·'}
            </span>
          ) : (
            <input
              key={i}
              className={styles.zoneInput}
              style={{ left: `${zone.left}%`, top: zone.top }}
              value={values[i]}
              onChange={(e) => onChange(i, e.target.value)}
              placeholder="–"
              maxLength={4}
              aria-label={`${title} zone ${i + 1}`}
            />
          )
        )}
      </div>
      <svg viewBox="0 0 280 150" className={styles.svg} aria-hidden="true">
        <Lashes />
        <path d="M20 92 Q140 48 260 92" fill="none" stroke="var(--color-text)" strokeWidth="3" strokeLinecap="round" />
        <path d="M20 92 Q140 48 260 92 Q140 128 20 92 Z" fill="var(--color-rose-light)" opacity="0.65" />
        <path d="M34 138 Q90 118 150 121 Q210 124 252 138 Q200 132 150 131 Q95 130 34 138 Z" fill="var(--color-text)" opacity="0.9" />
      </svg>
    </div>
  );
}
