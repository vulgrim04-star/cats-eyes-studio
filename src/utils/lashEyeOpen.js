/** Géométrie de la VUE ŒIL OUVERT.
 *
 *  À QUOI ELLE SERT. La planche technique dessine un œil FERMÉ, vu de dessus : c'est la
 *  position de travail, celle où l'on pose, et c'est sur elle qu'on règle les secteurs.
 *  Mais ce n'est pas ce que la cliente verra. Un dégradé 9-13 lu à plat ne dit pas
 *  grand-chose du regard qu'il donne une fois les yeux ouverts, et c'est précisément ce
 *  qu'on veut pouvoir montrer avant de commencer.
 *
 *  UN DESSIN, PAS UNE PHOTO. Il y a de la peau, un iris et du modelé, mais rien n'est
 *  photographique : on ne promet pas une ressemblance qu'on ne pourrait pas tenir — la forme
 *  de l'œil de chaque cliente est différente. Le dessin annonce franchement ce qu'il est.
 *
 *  LA PEAU VIT DANS `lashSkin`, partagée avec la planche fermée, et sous forme d'ELLIPSES à
 *  dégradé et non de formes floutées : la planche part en PNG 4K, et un `feGaussianBlur` s'y
 *  paierait à 3840 px de large, à chaque export.
 *
 *  LE MÊME MOTEUR DE CILS. Cette vue ne redessine pas les cils : elle fournit un `frame`
 *  — d'où part un cil, vers où il se dirige — à `buildExtensionLashes`, qui reste seul à
 *  savoir traduire longueur, courbure, diamètre, densité et technique. Deux moteurs de
 *  dessin finiraient par diverger, et la vue ouverte montrerait autre chose que la fiche.
 *
 *  REPÈRE. Même viewBox que la planche (600 × 480) et même convention : `t` parcourt la
 *  ligne ciliaire de 0 (gauche du dessin) à 1 (droite), le secteur d'index 0 restant
 *  toujours le coin interne — c'est le DESSIN qu'on retourne pour l'œil gauche.
 */

import { LASH_PX_MAX, PALETTE, VIEWBOX, seededRandom, taperedPath } from './lashGeometry';

/** Contour de l'œil ouvert, dans l'orientation NON retournée : coin interne à gauche.
 *
 *  UNE AMANDE, ET NON UNE LENTILLE. La forme précédente était bâtie sur deux quadratiques
 *  entre les deux coins : un seul point de contrôle par paupière, donc une courbe forcément
 *  symétrique, dont le sommet tombait pile au milieu. Aucun œil n'est fait ainsi. Un vrai œil
 *  monte vite depuis le coin interne, culmine vers 40 % de sa largeur, puis file longuement
 *  vers un coin externe légèrement RELEVÉ — c'est ce relèvement qui rend lisible un Cat Eye.
 *  Et sa paupière inférieure est bien plus plate que la supérieure : l'ouverture n'est
 *  symétrique ni de gauche à droite, ni de haut en bas.
 *
 *  Il faut deux points de contrôle par paupière pour décrire ça, donc des CUBIQUES. Tout le
 *  reste du module en découle : les surfaces dérivées — muqueuse, renflement du bord
 *  ciliaire, ombre portée, pli — s'expriment comme de simples DÉCALAGES VERTICAUX de ces
 *  mêmes points de contrôle, ce qui garantit qu'elles épousent l'amande au lieu de la
 *  contredire.
 */
const OPEN = {
  inner: { x: 70, y: 272 },
  outer: { x: 532, y: 232 },
  /** Paupière supérieure. `upperA` tire la montée tout près du coin interne, `upperB` étale
   *  la fuite loin vers le coin externe : c'est ce déséquilibre — et lui seul — qui place le
   *  sommet dans le tiers interne au lieu du milieu. */
  upperA: { x: 112, y: 80 },
  upperB: { x: 430, y: 170 },
  /** Paupière inférieure, franchement plus plate : un creux large et peu profond. Sa flèche
   *  vaut environ les deux tiers de celle du haut — si les deux se creusaient pareil, on
   *  retrouverait la lentille symétrique par un autre chemin. */
  lowerA: { x: 196, y: 345 },
  lowerB: { x: 404, y: 327 },
  /** Pli de la paupière : la même courbe, remontée d'une quarantaine d'unités. */
  creaseA: { x: 112, y: 50 },
  creaseB: { x: 430, y: 104 },
  creaseInset: 20,
  creaseLift: 28,
};

/** Foyer des cils supérieurs, SOUS l'œil : la frange s'en éloigne, donc elle monte et
 *  s'évase vers les coins. Même construction que sur la planche fermée, où le foyer est
 *  au-dessus et les cils descendent — un seul principe, deux positions. */
const UPPER_FOCUS = { x: 300, y: 620 };

/** Foyer des cils inférieurs, au-dessus : ils descendent. */
const LOWER_FOCUS = { x: 300, y: -120 };

/** Cils du bas : courts, clairsemés, décoratifs. Ils ne portent aucune donnée de la fiche
 *  — on ne pose pas d'extensions dessus — mais sans eux l'œil a l'air amputé. */
export const LOWER_LASH_COUNT = 46;

const round = (n) => Math.round(n * 100) / 100;

/** Point d'une cubique de Bézier. */
function cubic(p0, a, b, p3, t) {
  const u = 1 - t;
  const w0 = u * u * u;
  const w1 = 3 * u * u * t;
  const w2 = 3 * u * t * t;
  const w3 = t * t * t;
  return {
    x: w0 * p0.x + w1 * a.x + w2 * b.x + w3 * p3.x,
    y: w0 * p0.y + w1 * a.y + w2 * b.y + w3 * p3.y,
  };
}

/** Tangente d'une cubique, normalisée. Elle sert à orienter les cils : sur une amande, la
 *  paupière n'a pas la même pente au coin interne et au coin externe, et une frange qui
 *  l'ignorerait retomberait à plat d'un côté. */
function cubicTangent(p0, a, b, p3, t) {
  const u = 1 - t;
  const d = {
    x: 3 * u * u * (a.x - p0.x) + 6 * u * t * (b.x - a.x) + 3 * t * t * (p3.x - b.x),
    y: 3 * u * u * (a.y - p0.y) + 6 * u * t * (b.y - a.y) + 3 * t * t * (p3.y - b.y),
  };
  const length = Math.hypot(d.x, d.y) || 1;
  return { x: d.x / length, y: d.y / length };
}

/** Décale un point de contrôle vers le bas. Toutes les surfaces de l'œil se décrivent ainsi,
 *  à partir des contrôles d'une paupière : c'est ce qui les fait épouser l'amande. */
const lower = (point, dy) => ({ x: point.x, y: point.y + dy });

function unit(from, to) {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const length = Math.hypot(dx, dy) || 1;
  return { x: dx / length, y: dy / length };
}

/** Réflexion autour de l'axe vertical du cadre. Les deux yeux d'une même fiche sont le
 *  même dessin retourné, jamais deux dessins. */
const flipPoint = (p) => ({ x: VIEWBOX.width - p.x, y: p.y });
const flipVector = (v) => ({ x: -v.x, y: v.y });

const creaseStart = () => ({ x: OPEN.inner.x + OPEN.creaseInset, y: OPEN.inner.y - OPEN.creaseLift });
const creaseEnd = () => ({ x: OPEN.outer.x - OPEN.creaseInset, y: OPEN.outer.y - OPEN.creaseLift });

// --- Lignes de l'œil --------------------------------------------------------------

/** Point de la paupière supérieure — la LIGNE CILIAIRE — à la position `t`. */
export function upperLidPoint(t) {
  return cubic(OPEN.inner, OPEN.upperA, OPEN.upperB, OPEN.outer, t);
}

/** Point de la paupière inférieure à la position `t`. */
export function lowerLidPoint(t) {
  return cubic(OPEN.inner, OPEN.lowerA, OPEN.lowerB, OPEN.outer, t);
}

/** Point du pli de la paupière. Les bornes de dégradé s'en déduisent, plutôt que d'être
 *  écrites à la main : si l'ouverture de l'œil bouge un jour, le relief suit. */
export function creasePoint(t) {
  return cubic(creaseStart(), OPEN.creaseA, OPEN.creaseB, creaseEnd(), t);
}

/** Part de la NORMALE dans l'orientation d'un cil. Le reste vient du foyer.
 *
 *  Le foyer seul suffisait sur une lentille symétrique : la courbe y avait la même pente de
 *  part et d'autre, et l'éventail tombait juste. Sur une amande il donnerait le même
 *  éventail des deux côtés, là où un vrai œil évase nettement plus vers le coin externe — la
 *  paupière y est presque horizontale, et les cils qui en sortent partent franchement de
 *  côté. La normale apporte cette pente ; le foyer garde l'évasement d'ensemble. */
const NORMAL_SHARE = 0.45;

function blendDirection(normal, focal) {
  const x = normal.x * NORMAL_SHARE + focal.x * (1 - NORMAL_SHARE);
  const y = normal.y * NORMAL_SHARE + focal.y * (1 - NORMAL_SHARE);
  const length = Math.hypot(x, y) || 1;
  return { x: x / length, y: y / length };
}

/** Direction d'un cil supérieur : vers le haut, et d'autant plus vers l'extérieur qu'on
 *  s'approche d'un coin. */
export function upperLashDirection(t) {
  const tangent = cubicTangent(OPEN.inner, OPEN.upperA, OPEN.upperB, OPEN.outer, t);
  // La normale sortante d'une paupière parcourue de gauche à droite pointe vers le haut.
  const normal = { x: tangent.y, y: -tangent.x };
  return blendDirection(normal, unit(UPPER_FOCUS, upperLidPoint(t)));
}

/** Direction d'un cil inférieur : vers le bas, même construction inversée. */
export function lowerLashDirection(t) {
  const tangent = cubicTangent(OPEN.inner, OPEN.lowerA, OPEN.lowerB, OPEN.outer, t);
  const normal = { x: -tangent.y, y: tangent.x };
  return blendDirection(normal, unit(LOWER_FOCUS, lowerLidPoint(t)));
}

/**
 * Repère de pose des extensions sur l'œil ouvert, prêt pour `buildExtensionLashes`.
 *
 * `x` croît avec `t` dans les deux orientations : c'est ce qui permet aux secteurs —
 * découpés une seule fois, en coordonnées de la planche — de tomber au bon endroit sur
 * l'œil retourné comme sur l'autre.
 *
 * @param {{mirrored?: boolean}} [options]
 * @returns {{point: (t:number) => {x:number,y:number}, direction: (t:number) => {x:number,y:number}}}
 */
export function openLashFrame({ mirrored = false } = {}) {
  if (!mirrored) return { point: upperLidPoint, direction: upperLashDirection };
  return {
    point: (t) => flipPoint(upperLidPoint(1 - t)),
    direction: (t) => flipVector(upperLashDirection(1 - t)),
  };
}

// --- Tracés -----------------------------------------------------------------------

/** Rédacteur de tracés conscient du retournement : `p(point)` sort « x,y » déjà réfléchi
 *  si besoin. Une cubique retournée reste une cubique — il suffit de réfléchir ses quatre
 *  points. On émet donc de vraies courbes, et non des polylignes échantillonnées qui
 *  alourdiraient le fichier exporté. */
function writer(mirrored) {
  return (point) => {
    const q = mirrored ? flipPoint(point) : point;
    return `${round(q.x)},${round(q.y)}`;
  };
}

/** Une courbe simple, d'un coin à l'autre. */
function curvePath(start, a, b, end, mirrored) {
  const p = writer(mirrored);
  return `M${p(start)} C${p(a)} ${p(b)} ${p(end)}`;
}

/**
 * BANDE entre deux courbes qui partagent leurs extrémités — le motif de presque toutes les
 * surfaces de l'œil : ouverture, muqueuse, ombre portée, renflement du bord ciliaire,
 * paupière mobile.
 *
 * L'aller suit la première paire de contrôles, le retour la seconde, prise à l'envers.
 */
function bandPath(start, end, outA, outB, backA, backB, mirrored) {
  const p = writer(mirrored);
  return (
    `M${p(start)} C${p(outA)} ${p(outB)} ${p(end)} ` +
    `C${p(backB)} ${p(backA)} ${p(start)} Z`
  );
}

/** L'ouverture : paupière haute à l'aller, paupière basse au retour. */
function aperturePath(mirrored) {
  return bandPath(
    OPEN.inner,
    OPEN.outer,
    OPEN.upperA,
    OPEN.upperB,
    OPEN.lowerA,
    OPEN.lowerB,
    mirrored
  );
}

/**
 * Tous les tracés de la vue, dans l'orientation demandée.
 *
 * @param {boolean} [mirrored]
 */
export function openEyePaths(mirrored = false) {
  const p = writer(mirrored);
  const band = (outA, outB, backA, backB) =>
    bandPath(OPEN.inner, OPEN.outer, outA, outB, backA, backB, mirrored);

  return {
    /** L'ouverture elle-même : le blanc de l'œil, et la découpe qui borne tout ce qui
     *  appartient au globe — iris, ombre de la frange, éclat humide. */
    aperture: aperturePath(mirrored),
    upperLid: curvePath(OPEN.inner, OPEN.upperA, OPEN.upperB, OPEN.outer, mirrored),
    lowerLid: curvePath(OPEN.inner, OPEN.lowerA, OPEN.lowerB, OPEN.outer, mirrored),

    /** RENFLEMENT DU BORD CILIAIRE — le « tightline ». La peau y est la plus épaisse et
     *  c'est de là que sortent réellement les cils : sans ce ressaut, la frange semble
     *  poussée à même le blanc de l'œil. */
    ridge: band(OPEN.upperA, OPEN.upperB, lower(OPEN.upperA, 13), lower(OPEN.upperB, 15)),

    /** MUQUEUSE du bas, le liseré humide juste au-dessus de la paupière inférieure. */
    waterline: curvePath(
      OPEN.inner,
      lower(OPEN.lowerA, -13),
      lower(OPEN.lowerB, -13),
      OPEN.outer,
      mirrored
    ),

    crease: curvePath(creaseStart(), OPEN.creaseA, OPEN.creaseB, creaseEnd(), mirrored),

    /** Paupière mobile : la peau entre le pli et la ligne ciliaire. */
    socket: bandPath(
      creaseStart(),
      creaseEnd(),
      OPEN.creaseA,
      OPEN.creaseB,
      OPEN.upperA,
      OPEN.upperB,
      mirrored
    ),

    /** CARONCULE, la petite masse rosée du coin interne. C'est l'un des détails dont
     *  l'absence trahit le plus un œil dessiné : sans elle, le coin se referme en pointe
     *  nette, ce qu'aucun œil ne fait. */
    caruncle:
      `M${p({ x: OPEN.inner.x + 2, y: OPEN.inner.y - 1 })} ` +
      `C${p({ x: OPEN.inner.x + 20, y: OPEN.inner.y - 22 })} ${p({ x: OPEN.inner.x + 40, y: OPEN.inner.y - 18 })} ` +
      `${p({ x: OPEN.inner.x + 42, y: OPEN.inner.y + 1 })} ` +
      `C${p({ x: OPEN.inner.x + 40, y: OPEN.inner.y + 18 })} ${p({ x: OPEN.inner.x + 20, y: OPEN.inner.y + 20 })} ` +
      `${p({ x: OPEN.inner.x + 2, y: OPEN.inner.y - 1 })} Z`,
  };
}

/** OMBRE PORTÉE DE LA FRANGE sur le globe, en BANDES EMBOÎTÉES.
 *
 *  Une frange dense arrête réellement la lumière ; sans cette ombre, les cils sont posés SUR
 *  l'image au lieu d'y être.
 *
 *  POURQUOI DES BANDES ET NON UN DÉGRADÉ, qui serait pourtant plus court à écrire : un
 *  dégradé SVG est linéaire dans l'espace du dessin, alors que la paupière, elle, monte et
 *  descend. Une ombre calée sur un dégradé vertical s'éteint donc à la bonne hauteur au
 *  centre et reste opaque sur les côtés, où la paupière est plus basse — on obtient un coin
 *  gris à bord net en travers du blanc de l'œil. C'est exactement ce qui s'est produit, et
 *  ça ne se voit qu'à l'écran.
 *
 *  Trois bandes qui suivent la courbe de la paupière, chacune un peu plus large et un peu
 *  plus pâle, donnent une extinction correcte PARTOUT. Elles se superposent : sous la
 *  paupière l'encre s'additionne, plus bas il n'en reste qu'une. Trois tracés, aucun filtre.
 */
/** Profondeur de l'ombre sous la ligne ciliaire, et son opacité juste sous la paupière. */
export const LASH_SHADOW_DEPTH = 58;
export const LASH_SHADOW_PEAK = 0.2;

/** COMBIEN DE BANDES, et pourquoi autant. Trois suffisaient sur le papier, pas à l'écran :
 *  chaque bande fait une marche d'opacité, et une marche de 4 % d'encre sur un fond clair se
 *  voit comme un contour. Douze bandes ramènent la marche sous 2 %, où l'œil ne la distingue
 *  plus d'un dégradé — pour douze tracés, c'est-à-dire rien. */
export const LASH_SHADOW_STEPS = 12;

export function lashShadowBands(mirrored = false) {
  // Quatre décimales, et non les deux du reste du module : arrondie au centième, une opacité
  // de 0,0167 remonterait à 0,02 — soit 20 % d'ombre en plus, et la marche repasserait
  // au-dessus du seuil où elle se voit.
  const opacity = Math.round((LASH_SHADOW_PEAK / LASH_SHADOW_STEPS) * 1e4) / 1e4;
  return Array.from({ length: LASH_SHADOW_STEPS }, (_, i) => {
    // Exposant supérieur à 1 : les bandes se resserrent près de la paupière, où l'ombre est
    // dense, et s'espacent en s'éloignant. Une répartition régulière donnerait une
    // extinction linéaire, qu'aucune ombre ne suit.
    const share = ((i + 1) / LASH_SHADOW_STEPS) ** 1.4;
    return {
      key: i,
      opacity,
      d: bandPath(
        OPEN.inner,
        OPEN.outer,
        OPEN.upperA,
        OPEN.upperB,
        lower(OPEN.upperA, LASH_SHADOW_DEPTH * share),
        lower(OPEN.upperB, LASH_SHADOW_DEPTH * 1.1 * share),
        mirrored
      ),
    };
  });
}

/**
 * ÉCLAT HUMIDE du globe : la lueur diffuse sur le blanc de l'œil, du côté externe.
 *
 * Distincte des reflets de l'iris, qui sont des points nets : celle-ci est large et
 * fondue. C'est ce qui distingue un œil vivant d'un œil dessiné à plat.
 */
export function openGlobeSheen(mirrored = false) {
  const center = mirrored ? flipPoint({ x: 432, y: 272 }) : { x: 432, y: 272 };
  return { cx: round(center.x), cy: round(center.y), rx: 40, ry: 14 };
}

/**
 * FIBRES DE L'IRIS : les stries radiales entre la pupille et le limbe.
 *
 * C'est le détail qui fait passer l'iris de la pastille au tissu. Elles alternent claires
 * et sombres autour de la teinte de base, et s'arrêtent avant l'anneau limbique — dans un
 * vrai iris, la trame se referme sous le limbe.
 *
 * @param {{mirrored?:boolean, count?:number, seed?:number}} [options]
 * @returns {Array<{key:number, d:string, width:number, opacity:number, light:boolean}>}
 */
export function irisFibres({ mirrored = false, count = 104, seed = 1789 } = {}) {
  const iris = openEyeIris(false);
  const random = seededRandom(seed);
  return Array.from({ length: count }, (_, i) => {
    const angle = (i / count) * Math.PI * 2 + (random() - 0.5) * 0.06;
    const from = iris.pupilR + 1 + random() * 7;
    const to = iris.r - 5 - random() * 18;
    const at = (radius) => {
      const point = { x: iris.cx + Math.cos(angle) * radius, y: iris.cy + Math.sin(angle) * radius };
      return mirrored ? flipPoint(point) : point;
    };
    const a = at(from);
    const b = at(to);
    return {
      key: i,
      d: `M${round(a.x)},${round(a.y)} L${round(b.x)},${round(b.y)}`,
      width: round(0.8 + random() * 1.4),
      // Assez pour que le tissu se devine, pas assez pour faire un soleil : des stries
      // trop marquées se lisent comme un motif imprimé sur l'iris, pas comme sa trame.
      opacity: round(0.11 + random() * 0.24),
      light: random() < 0.46,
    };
  });
}

/**
 * Iris, pupille et reflets.
 *
 * Le cercle DÉBORDE volontairement l'ouverture en haut et en bas : c'est la découpe par
 * `aperture` qui le rogne, exactement comme la paupière rogne un vrai iris. Un iris
 * entièrement visible, posé entre les deux paupières sans les toucher, donne le regard fixe
 * d'un dessin animé.
 *
 * @param {boolean} [mirrored]
 */
export function openEyeIris(mirrored = false) {
  // Légèrement nasal, comme un vrai iris — le centre géométrique de l'ouverture donnerait un
  // regard de face un peu figé.
  const center = mirrored ? flipPoint({ x: 300, y: 240 }) : { x: 300, y: 240 };
  const offset = (dx, dy) => ({ x: center.x + dx, y: center.y + dy });
  return {
    cx: round(center.x),
    cy: round(center.y),
    // CE QUI FAISAIT « TROP GROS » N'ÉTAIT PAS LE DIAMÈTRE. On visait le tiers de la largeur
    // de l'ouverture, en croyant le lire ainsi sur la maquette ; en mesurant, son iris en
    // occupe près de 40 %, comme le nôtre. Ce qui l'alourdissait, c'était l'ouverture trop
    // COURTE — l'iris la remplissait d'un bord à l'autre, sans un filet de blanc au-dessus
    // ni en dessous — et un anneau limbique très appuyé. L'amande, plus haute, et un limbe
    // allégé règlent l'un et l'autre ; le diamètre ne bouge presque pas.
    r: 86,
    pupilR: 32,
    // Deux reflets, pas un : un seul point blanc fait bille de verre. Le grand marque la
    // source de lumière, le petit, à l'opposé et bien plus discret, la renvoie.
    //
    // ILS NE SE RETOURNENT PAS AVEC L'ŒIL, et c'est volontaire : une pièce n'a qu'une
    // lampe, elle éclaire les deux yeux du même côté. Les faire basculer donnerait deux
    // sources contradictoires — et surtout, elles contrediraient le dégradé de l'iris, dont
    // la lumière, elle, reste en haut à gauche.
    // Le grand reflet est tenu à l'ÉCART DE LA PUPILLE : à cheval sur son bord, il en
    // mangeait le haut-gauche et la pupille semblait décentrée — un défaut qu'on impute
    // au dessin de l'œil alors qu'il vient du reflet.
    highlights: [
      { ...offset(-41, -39), r: 15, opacity: 0.82 },
      { ...offset(38, 33), r: 8, opacity: 0.48 },
    ],
  };
}

/** Bornes des dégradés propres à la vue ouverte.
 *
 *  Elles ne sont PAS celles de la planche : là-bas les cils descendent, ici ils montent.
 *  Réutiliser les mêmes bornes teindrait toute la frange de la seule couleur de racine —
 *  un noir uni, sans le moindre relief — et rien ne le signalerait, puisque le dessin
 *  s'afficherait normalement. D'où ce calcul, déduit de la géométrie plutôt qu'écrit à la
 *  main : si l'ouverture de l'œil bouge, le relief suit.
 *
 *  `y0` est toujours le DÉBUT du dégradé au sens de la planche — la racine pour les cils,
 *  le creux de l'orbite pour la paupière — afin que les définitions SVG des deux vues
 *  s'écrivent exactement de la même façon.
 */
export const OPEN_GRADIENT_BOUNDS = {
  lash: {
    y0: Math.max(OPEN.inner.y, OPEN.outer.y) + 8,
    y1: round(upperLidPoint(0.5).y - LASH_PX_MAX * 1.15),
  },
  lid: {
    y0: round(creasePoint(0.5).y - 26),
    y1: Math.max(OPEN.inner.y, OPEN.outer.y) + 4,
  },
};

// --- Cils du bas ------------------------------------------------------------------

/**
 * Frange inférieure : courte, clairsemée, purement décorative.
 *
 * Elle ne lit AUCUNE valeur de la fiche, et c'est voulu — on ne pose pas d'extensions sur
 * la paupière inférieure. Elle est là pour que l'œil se lise comme un œil ; la lui retirer
 * donnerait un regard amputé qui détournerait l'attention de ce qu'on vient regarder.
 *
 * @param {{mirrored?:boolean, count?:number, seed?:number}} [options]
 * @returns {Array<{key:number, d:string, opacity:number}>}
 */
export function buildLowerLashes({ mirrored = false, count = LOWER_LASH_COUNT, seed = 613 } = {}) {
  const random = seededRandom(seed);
  return Array.from({ length: count }, (_, i) => {
    const t = 0.08 + (i / Math.max(1, count - 1)) * 0.84 + (random() - 0.5) * 0.01;
    const base = mirrored ? flipPoint(lowerLidPoint(t)) : lowerLidPoint(t);
    const raw = lowerLashDirection(t);
    const dir = mirrored ? flipVector(raw) : raw;
    const perp = { x: -dir.y, y: dir.x };
    // Plus courts au centre qu'aux coins, comme la frange du haut mais dans un rapport
    // beaucoup plus resserré : des cils du bas trop longs font faux cils.
    const length = (8 + random() * 7) * (0.7 + 0.5 * Math.abs(t - 0.5) * 2);
    const bend = (0.5 - t) * 2 * (3 + random() * 3) * (mirrored ? -1 : 1);
    const tip = { x: base.x + dir.x * length, y: base.y + dir.y * length };
    const control = {
      x: base.x + dir.x * length * 0.5 + perp.x * bend,
      y: base.y + dir.y * length * 0.5 + perp.y * bend,
    };
    return {
      key: i,
      d: taperedPath(base, control, tip, round(0.7 + random() * 0.5)),
      opacity: round(0.32 + random() * 0.26),
    };
  });
}

/** Couleurs de la vue, reprises telles quelles de la palette de la planche : les deux vues
 *  sortent du même papier, et une seconde palette finirait par s'en écarter. */
export const OPEN_PALETTE = {
  sclera: PALETTE.sclera,
  scleraShade: PALETTE.scleraShade,
  irisRim: PALETTE.irisRim,
  irisFibreLight: PALETTE.irisFibreLight,
  irisFibreDark: PALETTE.irisFibreDark,
  pupil: PALETTE.pupil,
  highlight: PALETTE.highlight,
  lidLine: PALETTE.ink,
  crease: PALETTE.creaseLine,
  skinHigh: PALETTE.skinHigh,
  skinLow: PALETTE.skinLow,
  caruncle: PALETTE.caruncle,
};
