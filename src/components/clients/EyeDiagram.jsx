import styles from './EyeDiagram.module.css';

// Génère N zones réparties le long de l'arc des cils (10%-90% de la largeur), avec un
// décalage vertical qui suit la courbure de l'œil (zones centrales plus hautes, coins plus
// bas) — remplace l'ancien tableau figé à 6 zones pour permettre un nombre variable de cases.
function buildZones(count) {
  const n = Math.max(1, count);
  return Array.from({ length: n }, (_, i) => {
    const t = n === 1 ? 0.5 : 0.1 + 0.8 * (i / (n - 1));
    const d = Math.min(1, Math.abs(t - 0.5) / 0.4);
    return { left: t * 100, top: 2 + 26 * d ** 2, t };
  });
}

// Bornes de conversion mm ↔ pixels : une zone sans valeur garde une longueur par
// défaut "naturelle" (13mm) plutôt que de s'effondrer à zéro.
const MM_MIN = 6;
const MM_MAX = 18;
const PX_MIN = 13;
const PX_MAX = 34;
const DEFAULT_MM = 13;

// Couleur "encre" fixe (cils, trait de cils, liner) : ces éléments représentent une vraie
// pigmentation et ne doivent jamais s'inverser en clair en mode sombre, contrairement à la
// forme de paupière ci-dessous qui, elle, suit la couleur de marque pour rester cohérente
// avec le thème (clair ou sombre).
const INK = '#241a12';

function parseMm(value) {
  const n = parseFloat(value);
  return Number.isFinite(n) && n > 0 ? n : DEFAULT_MM;
}

function mmToPx(mm) {
  const clamped = Math.min(MM_MAX, Math.max(MM_MIN, mm));
  return PX_MIN + ((clamped - MM_MIN) / (MM_MAX - MM_MIN)) * (PX_MAX - PX_MIN);
}

// Longueur du cil dessiné à la position t, interpolée entre les deux zones voisines
// les plus proches — le dessin grandit/rétrécit avec les valeurs saisies par zone.
function lengthAt(t, values, zones) {
  const ts = zones.map((z) => z.t);
  if (t <= ts[0]) return mmToPx(parseMm(values[0]));
  if (t >= ts[ts.length - 1]) return mmToPx(parseMm(values[values.length - 1]));
  for (let i = 0; i < ts.length - 1; i += 1) {
    if (t >= ts[i] && t <= ts[i + 1]) {
      const localT = (t - ts[i]) / (ts[i + 1] - ts[i]);
      const mm = parseMm(values[i]) * (1 - localT) + parseMm(values[i + 1]) * localT;
      return mmToPx(mm);
    }
  }
  return mmToPx(DEFAULT_MM);
}

// Point sur la courbe de Bézier quadratique du bord ciliaire.
function lashLinePoint(t) {
  const p0 = { x: 20, y: 92 };
  const p1 = { x: 140, y: 48 };
  const p2 = { x: 260, y: 92 };
  const x = (1 - t) ** 2 * p0.x + 2 * (1 - t) * t * p1.x + t ** 2 * p2.x;
  const y = (1 - t) ** 2 * p0.y + 2 * (1 - t) * t * p1.y + t ** 2 * p2.y;
  return { x, y };
}

function Lashes({ values, zones }) {
  const lashes = [];
  for (let i = 0; i <= 22; i += 1) {
    const t = 0.04 + (i / 22) * 0.92;
    const { x, y } = lashLinePoint(t);
    const len = lengthAt(t, values, zones);
    const slant = (t - 0.5) * 26;
    lashes.push(
      <line
        key={i}
        x1={x}
        y1={y}
        x2={x + slant}
        y2={y - len}
        stroke={INK}
        strokeWidth="1.6"
        strokeLinecap="round"
        opacity="0.88"
      />
    );
  }
  return lashes;
}

export default function EyeDiagram({ title, zones, onChange, readOnly = false }) {
  const values = zones ?? ['', '', '', '', '', ''];
  const zonePositions = buildZones(values.length);
  const inputWidth = Math.max(22, Math.min(48, Math.floor(300 / values.length) - 4));

  return (
    <div className={styles.wrap}>
      <div className={styles.title}>{title}</div>
      <div className={styles.inputsRow}>
        {zonePositions.map((zone, i) =>
          readOnly ? (
            <span key={i} className={styles.zoneValue} style={{ left: `${zone.left}%`, top: zone.top + 16 }}>
              {values[i] || '·'}
            </span>
          ) : (
            <input
              key={i}
              className={styles.zoneInput}
              style={{ left: `${zone.left}%`, top: zone.top, width: inputWidth, fontSize: inputWidth < 36 ? '0.72rem' : undefined }}
              value={values[i]}
              onChange={(e) => onChange(i, e.target.value)}
              placeholder="–"
              maxLength={5}
              inputMode="decimal"
              aria-label={`${title} zone ${i + 1}`}
            />
          )
        )}
      </div>
      <svg viewBox="0 0 280 150" className={styles.svg} aria-hidden="true">
        <Lashes values={values} zones={zonePositions} />
        <path d="M20 92 Q140 48 260 92" fill="none" stroke={INK} strokeWidth="3" strokeLinecap="round" />
        <path d="M20 92 Q140 48 260 92 Q140 128 20 92 Z" fill="var(--color-rose-light)" opacity="0.65" />
        <path d="M34 138 Q90 118 150 121 Q210 124 252 138 Q200 132 150 131 Q95 130 34 138 Z" fill={INK} opacity="0.9" />
      </svg>
    </div>
  );
}
