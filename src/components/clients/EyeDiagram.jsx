import { useId } from 'react';
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

// Couleur "encre" fixe (cils, eye-liner, sourcil) : ces éléments représentent une vraie
// pigmentation et ne doivent jamais s'inverser en clair en mode sombre, contrairement au
// reste de l'illustration qui, lui, suit var(--color-text) pour rester subtil sur les deux thèmes.
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

// Point sur la courbe de Bézier quadratique du bord ciliaire (approxime la paupière
// supérieure de l'illustration ci-dessous, qui elle est dessinée en courbes cubiques).
function lashLinePoint(t) {
  const p0 = { x: 38, y: 89 };
  const p1 = { x: 146, y: 40 };
  const p2 = { x: 252, y: 81 };
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

// Forme de la sclère (blanc de l'œil), réutilisée pour le remplissage et pour découper
// l'iris — la paupière supérieure a une pointe externe plus relevée que le coin interne,
// plus rond, comme sur un œil réel.
const SCLERA_D =
  'M40 88 C55 62 95 48 145 46 C193 44 228 58 250 80 C254 82 254 85 250 85 ' +
  'C224 100 186 109 145 109 C98 109 58 100 42 90 C39 88.5 38 89 40 88 Z';

const IRIS_SPOKE_ANGLES = Array.from({ length: 12 }, (_, i) => i * 30);

// Illustration de l'œil (sourcil, sclère, iris texturé, eye-liner effilé, cils du bas) —
// purement décorative, sans donnée cliente. Les identifiants de gradient/découpe sont
// uniques par instance (useId) car ce composant est monté plusieurs fois sur une même page
// (gauche/droite × plusieurs Lash Maps dans l'onglet), et des id SVG dupliqués provoqueraient
// des références croisées entre instances.
function EyeIllustration() {
  const uid = useId();
  const irisGradId = `iris-${uid}`;
  const shadeId = `shade-${uid}`;
  const scleraClipId = `sclera-clip-${uid}`;

  return (
    <>
      <defs>
        <radialGradient id={irisGradId} cx="42%" cy="35%" r="65%">
          <stop offset="0%" stopColor="#b08a5f" />
          <stop offset="45%" stopColor="#7a5636" />
          <stop offset="80%" stopColor="#4a3220" />
          <stop offset="100%" stopColor="#241812" />
        </radialGradient>
        <radialGradient id={shadeId} cx="50%" cy="0%" r="70%">
          <stop offset="0%" stopColor="var(--color-text)" stopOpacity="0.14" />
          <stop offset="100%" stopColor="var(--color-text)" stopOpacity="0" />
        </radialGradient>
        <clipPath id={scleraClipId}>
          <path d={SCLERA_D} />
        </clipPath>
      </defs>

      {/* sourcil, doux */}
      <path
        d="M50 28 C78 16 118 12 150 13 C185 14 210 19 232 30 C210 22 182 18 150 18 C120 18 82 21 50 28 Z"
        fill={INK}
        opacity="0.55"
      />

      {/* ombre douce de la paupière mobile */}
      <path d="M40 88 C55 60 95 44 145 42 C195 40 228 56 250 80 Z" fill={`url(#${shadeId})`} />

      {/* sclère */}
      <path d={SCLERA_D} fill="var(--color-cream)" stroke="var(--color-text)" strokeOpacity="0.15" strokeWidth="1" />

      {/* iris texturé + pupille + reflets, découpés à la forme de la sclère */}
      <g clipPath={`url(#${scleraClipId})`}>
        <circle cx="150" cy="80" r="24" fill={`url(#${irisGradId})`} />
        <circle cx="150" cy="80" r="24" fill="none" stroke="#1c120d" strokeWidth="1.5" opacity="0.6" />
        <g stroke="#3d2a1a" strokeWidth="0.6" opacity="0.35">
          {IRIS_SPOKE_ANGLES.map((angle) => (
            <line key={angle} x1="150" y1="80" x2="150" y2="58" transform={`rotate(${angle} 150 80)`} />
          ))}
        </g>
        <circle cx="150" cy="80" r="11" fill="#0f0906" />
        <circle cx="142" cy="70" r="4.5" fill="#fff" opacity="0.9" />
        <circle cx="156" cy="86" r="2" fill="#fff" opacity="0.5" />
      </g>

      {/* paupière inférieure, discrète */}
      <path
        d="M42 90 C70 104 100 110 145 110 C188 110 220 102 248 85"
        fill="none"
        stroke="var(--color-text)"
        strokeWidth="1"
        opacity="0.25"
      />

      {/* cils naturels du bas */}
      <path
        d="M50 122 Q90 112 145 114 Q195 116 232 124 Q195 120 145 120 Q95 119 50 122 Z"
        fill={INK}
        opacity="0.8"
      />
    </>
  );
}

// Eye-liner effilé, en pointe vers le coin externe — rendu séparément de EyeIllustration
// et placé APRÈS <Lashes> dans le SVG parent pour bien capter la base des cils générés
// par les données (sinon les cils dessineraient par-dessus le liner).
function EyeLiner() {
  return (
    <path
      d="M40 88 C55 62 95 48 145 46 C193 44 228 58 250 80 L262 74 C240 54 195 38 145 40 C93 42 52 58 36 86 Z"
      fill={INK}
    />
  );
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
        <EyeIllustration />
        <Lashes values={values} zones={zonePositions} />
        <EyeLiner />
      </svg>
    </div>
  );
}
