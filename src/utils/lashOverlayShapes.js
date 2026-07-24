// Styles d'effet partagés entre la Lash Map (saisie technique) et le Simulateur de pose
// (aperçu visuel) — une seule liste pour ne pas les faire diverger.
export const EFFECTS = ['Cat Eye', 'Open Eye', 'Squirrel', 'Rounded', 'Wispy'];

// Repère local centré sur l'œil, indépendant du composant qui l'affiche (SVG ou canvas) :
// x de -150 (coin interne) à 150 (coin externe), y négatif vers le haut.
export const LOCAL_WIDTH = 300;

function pseudoRandom(t) {
  return Math.sin(t * 97.13) * 0.5 + 0.5;
}

// Multiplicateur de longueur (0..1 environ) à la position t (0 = coin interne, 1 = coin externe).
function profileFor(style, t) {
  switch (style) {
    case 'Cat Eye':
      return 0.32 + 0.68 * t ** 1.6; // s'allonge vers le coin externe
    case 'Squirrel':
      return 0.22 + 0.95 * t ** 2.4; // flick plus marqué encore que Cat Eye
    case 'Open Eye':
      return 0.4 + 0.6 * Math.sin(Math.PI * t); // pic au centre
    case 'Rounded':
      return 0.55 + 0.45 * Math.sin(Math.PI * t ** 0.8); // plus plein et rond
    case 'Wispy':
    default:
      return 0.35 + 0.5 * Math.sin(Math.PI * t) + 0.18 * pseudoRandom(t); // irrégulier
  }
}

// Point sur la courbe de bord ciliaire, en repère local centré.
function lashLinePoint(t) {
  const p0 = { x: -140, y: 20 };
  const p1 = { x: 0, y: -34 };
  const p2 = { x: 140, y: 20 };
  const x = (1 - t) ** 2 * p0.x + 2 * (1 - t) * t * p1.x + t ** 2 * p2.x;
  const y = (1 - t) ** 2 * p0.y + 2 * (1 - t) * t * p1.y + t ** 2 * p2.y;
  return { x, y };
}

export const LASH_LINE_ARC = { p0: { x: -140, y: 20 }, p1: { x: 0, y: -34 }, p2: { x: 140, y: 20 } };

/** Génère les segments de cils (x1,y1,x2,y2) pour un style donné, en repère local centré. */
export function buildLashLines(style, count = 26) {
  const lines = [];
  for (let i = 0; i <= count; i += 1) {
    const t = i / count;
    const { x, y } = lashLinePoint(t);
    const lenMul = profileFor(style, t);
    const len = 16 + lenMul * 44;
    const slant = (t - 0.5) * 46;
    lines.push({ x1: x, y1: y, x2: x + slant, y2: y - len });
  }
  return lines;
}
