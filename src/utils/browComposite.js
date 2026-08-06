import { LM, isUsable } from './faceLandmarks';

/** Géométrie de la simulation composée : effacer le sourcil, puis en poser un autre.
 *
 *  CE QUE FAISAIT L'ANCIENNE SIMULATION : un seul dessin, portant les deux sourcils, posé à
 *  plat au milieu de la photo. Ni incliné, ni ajusté côté par côté — et le sourcil naturel
 *  de la cliente restait dessous, si bien qu'on lui montrait deux sourcils superposés.
 *
 *  CE QU'IL FAUT POUR FAIRE MIEUX, et que ce fichier calcule :
 *
 *   1. la SURFACE du sourcil, pour savoir quoi effacer — l'arête supérieure seule, tout ce
 *      que connaissait `faceLandmarks`, ne donnait qu'une ligne ;
 *   2. le REPÈRE ORIENTÉ de chaque sourcil — centre, angle, longueur, épaisseur — parce
 *      que les deux arcades d'un visage n'ont ni la même inclinaison ni la même hauteur ;
 *   3. où LIRE LA PEAU pour reboucher, sans jamais tomber dans l'œil ;
 *   4. la TRANSFORMATION qui amène le dessin sur l'arcade.
 *
 *  TOUT EST PUR. Pas de canvas, pas de DOM, pas de MediaPipe : des points en fractions de
 *  l'image (0–1) entrent, des nombres sortent. C'est ce qui rend testable la partie où une
 *  erreur ne se verrait pas — un angle inversé donne un sourcil qui pointe vers le bas, et
 *  on le corrige ici, pas en tâtonnant sur une photo.
 */

const SIDES = { left: 'left', right: 'right' };

const at = (points, index) => points?.[index] ?? null;

function indicesFor(side) {
  return side === SIDES.left
    ? { upper: LM.browLeft, lower: LM.browLeftLower }
    : { upper: LM.browRight, lower: LM.browRightLower };
}

/** Les repères de l'arête inférieure sont-ils présents ? Ils viennent du même modèle que
 *  le reste, mais un jeu de points tronqué ou un modèle plus ancien n'en aurait pas — et
 *  mieux vaut retomber sur le calque à plat que composer sur une surface inventée. */
export function hasBrowOutline(points) {
  if (!isUsable(points)) return false;
  return [...LM.browLeftLower, ...LM.browRightLower].every((i) => {
    const p = at(points, i);
    return p && Number.isFinite(p.x) && Number.isFinite(p.y);
  });
}

/**
 * Contour FERMÉ d'un sourcil, en fractions de l'image.
 *
 * L'arête supérieure va de la queue vers la tête, l'inférieure de la tête vers la queue :
 * mises bout à bout elles se referment sans se croiser, ce qui est la condition pour que le
 * remplissage d'un canvas donne la surface du sourcil et non un nœud.
 *
 * @param {Array} points repères normalisés
 * @param {'left'|'right'} side côté DE L'IMAGE
 * @returns {{x:number,y:number}[]|null}
 */
export function browPolygon(points, side) {
  if (!hasBrowOutline(points)) return null;
  const { upper, lower } = indicesFor(side);
  return [...upper, ...lower].map((i) => ({ x: at(points, i).x, y: at(points, i).y }));
}

/** Centre de gravité d'un contour. */
export function centroid(polygon) {
  if (!polygon?.length) return null;
  const sum = polygon.reduce((acc, p) => ({ x: acc.x + p.x, y: acc.y + p.y }), { x: 0, y: 0 });
  return { x: sum.x / polygon.length, y: sum.y / polygon.length };
}

/** Rectangle englobant d'un contour. */
export function polygonBounds(polygon) {
  if (!polygon?.length) return null;
  const xs = polygon.map((p) => p.x);
  const ys = polygon.map((p) => p.y);
  const minX = Math.min(...xs);
  const minY = Math.min(...ys);
  const maxX = Math.max(...xs);
  const maxY = Math.max(...ys);
  return { minX, minY, maxX, maxY, width: maxX - minX, height: maxY - minY };
}

/**
 * Élargit un contour d'une marge constante, chaque sommet s'écartant du centre.
 *
 * La zone à effacer doit DÉBORDER le sourcil. Les repères suivent la masse des poils, pas
 * les quelques-uns qui dépassent : effacer pile le contour laisse un liseré de poils tout
 * autour, et ce liseré se voit davantage que le sourcil entier.
 *
 * @param {{x:number,y:number}[]} polygon
 * @param {number} margin en fractions de l'image
 */
export function dilatePolygon(polygon, margin) {
  const c = centroid(polygon);
  if (!c) return null;
  return polygon.map((p) => {
    const dx = p.x - c.x;
    const dy = p.y - c.y;
    const d = Math.hypot(dx, dy);
    // Un sommet confondu avec le centre n'a pas de direction : le laisser tel quel plutôt
    // que de diviser par zéro.
    if (d === 0) return { ...p };
    return { x: p.x + (dx / d) * margin, y: p.y + (dy / d) * margin };
  });
}

/**
 * Repère orienté d'un sourcil : où il commence, où il finit, comment il penche.
 *
 * `head` est l'extrémité côté nez, `tail` côté tempe — la convention du dessin, pour que
 * les deux se correspondent sans avoir à retourner quoi que ce soit. `angle` est mesuré de
 * la tête vers la queue, en radians, dans le repère de l'image (donc y vers le bas).
 *
 * @returns {{head:object, tail:object, center:object, angle:number, length:number,
 *   thickness:number}|null}
 */
export function browFrame(points, side) {
  const polygon = browPolygon(points, side);
  if (!polygon) return null;
  const { upper, lower } = indicesFor(side);

  // L'arête supérieure est listée de la queue vers la tête : son dernier point est la tête.
  const tail = { x: at(points, upper[0]).x, y: at(points, upper[0]).y };
  const head = { x: at(points, upper[upper.length - 1]).x, y: at(points, upper[upper.length - 1]).y };

  const dx = tail.x - head.x;
  const dy = tail.y - head.y;
  const length = Math.hypot(dx, dy);
  const angle = Math.atan2(dy, dx);

  // Épaisseur : la distance PERPENDICULAIRE à l'axe, moyennée sur les paires haut/bas.
  // Prendre l'écart vertical brut la surestimerait sur une arcade très inclinée.
  const nx = -Math.sin(angle);
  const ny = Math.cos(angle);
  const projections = [...upper, ...lower].map((i) => {
    const p = at(points, i);
    return (p.x - head.x) * nx + (p.y - head.y) * ny;
  });
  const thickness = Math.max(...projections) - Math.min(...projections);

  return { head, tail, center: centroid(polygon), angle, length, thickness };
}

/**
 * Où lire la couleur de peau pour reboucher.
 *
 * TOUTES LES SONDES SONT AU-DESSUS DE L'ARCADE, sur le front. C'est une garantie et non une
 * commodité : en dessous il y a la paupière et l'œil, et une seule sonde tombée dans un cil
 * ou dans un iris peindrait une tache sombre au milieu du front. Le front est aussi la peau
 * la plus proche en teinte de celle qui est sous le sourcil.
 *
 * Six sondes plutôt qu'une : un front n'est pas d'une seule couleur, il est éclairé d'un
 * côté. Quatre le long de l'arcade, deux au-delà des extrémités, pour que le rebouchage
 * suive le dégradé de lumière au lieu de poser un aplat qui se verrait.
 *
 * @param {object} frame repère rendu par `browFrame`
 * @returns {{x:number,y:number}[]|null}
 */
export function skinProbes(frame) {
  if (!frame) return null;
  const { head, angle, length, thickness } = frame;
  const ux = Math.cos(angle);
  const uy = Math.sin(angle);
  // Normale dirigée vers le HAUT DE L'IMAGE, et retournée si besoin.
  //
  // Ce `if` n'est pas une précaution de style : sur l'arcade GAUCHE, l'axe tête → queue
  // pointe vers les x décroissants, donc `angle` vaut π et la perpendiculaire calculée
  // descend — droit dans la paupière et dans l'œil. Sans ce retournement, la moitié des
  // sondes lisait la couleur d'un cil et le rebouchage peignait une tache sombre au milieu
  // du front. Le signe de `ny` est la seule chose qui décide du haut ; on s'y fie.
  let nx = Math.sin(angle);
  let ny = -Math.cos(angle);
  if (ny > 0) {
    nx = -nx;
    ny = -ny;
  }

  const along = [0.15, 0.4, 0.65, 0.9, -0.3, 1.3];
  const lift = [1.5, 1.5, 1.5, 1.5, 1.1, 1.1];

  return along.map((t, i) => ({
    x: head.x + ux * length * t + nx * thickness * lift[i],
    y: head.y + uy * length * t + ny * thickness * lift[i],
  }));
}

/**
 * Transformation qui amène un segment sur un autre : rotation, échelle uniforme,
 * translation. C'est elle qui pose le dessin sur l'arcade.
 *
 * On fait correspondre DEUX POINTS et non un cadre : la tête du dessin sur la tête réelle,
 * la queue sur la queue. L'inclinaison et la longueur en découlent, donc rien n'est estimé.
 * L'échelle reste uniforme — étirer un sourcil dans un seul sens le déformerait, et une
 * cliente le verrait tout de suite.
 *
 * @returns {{scale:number, angle:number, tx:number, ty:number}|null}
 */
export function similarityTransform(sourceA, sourceB, destA, destB) {
  if (!sourceA || !sourceB || !destA || !destB) return null;
  const sdx = sourceB.x - sourceA.x;
  const sdy = sourceB.y - sourceA.y;
  const ddx = destB.x - destA.x;
  const ddy = destB.y - destA.y;
  const sourceLength = Math.hypot(sdx, sdy);
  const destLength = Math.hypot(ddx, ddy);
  // Un segment source de longueur nulle ne peut définir ni échelle ni angle.
  if (sourceLength === 0) return null;

  const scale = destLength / sourceLength;
  const angle = Math.atan2(ddy, ddx) - Math.atan2(sdy, sdx);
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  return {
    scale,
    angle,
    tx: destA.x - scale * (cos * sourceA.x - sin * sourceA.y),
    ty: destA.y - scale * (sin * sourceA.x + cos * sourceA.y),
  };
}

/** Applique une transformation à un point — surtout utile pour la vérifier. */
export function applyTransform(transform, point) {
  if (!transform || !point) return null;
  const { scale, angle, tx, ty } = transform;
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  return {
    x: tx + scale * (cos * point.x - sin * point.y),
    y: ty + scale * (sin * point.x + cos * point.y),
  };
}

/**
 * Le même repère, mais EN PIXELS.
 *
 * Pourquoi une seconde version plutôt qu'une conversion au vol : les repères sont en
 * fractions de l'image, où une unité en x et une unité en y ne mesurent pas la même chose
 * dès que la photo n'est pas carrée. Sur un portrait 700 × 900, une « épaisseur » de 0,03
 * vaut 27 pixels verticalement mais 21 horizontalement. Tant qu'on ne fait que placer des
 * points, l'écart ne se voit pas ; dès qu'on construit une forme inclinée — la zone à
 * effacer — il la déforme. Tout ce qui touche à des DISTANCES passe donc par ici.
 */
export function browFramePx(points, side, width, height) {
  const frame = browFrame(points, side);
  if (!frame) return null;
  const polygon = browPolygon(points, side);
  const head = { x: frame.head.x * width, y: frame.head.y * height };
  const tail = { x: frame.tail.x * width, y: frame.tail.y * height };
  const angle = Math.atan2(tail.y - head.y, tail.x - head.x);
  const nx = -Math.sin(angle);
  const ny = Math.cos(angle);
  const projections = polygon.map((p) => (p.x * width - head.x) * nx + (p.y * height - head.y) * ny);
  return {
    head,
    tail,
    angle,
    length: Math.hypot(tail.x - head.x, tail.y - head.y),
    thickness: Math.max(...projections) - Math.min(...projections),
    center: { x: frame.center.x * width, y: frame.center.y * height },
  };
}

/** Proportions d'un sourcil réel : son épaisseur avoisine le sixième de sa longueur. */
const THICKNESS_RATIO = 0.16;

/** Étendue de la zone à effacer, en multiples de la longueur et de l'épaisseur. */
export const ERASE_ZONE = {
  /** Débordement à chaque extrémité. */
  along: 0.16,
  /** Vers le front. Généreux : on n'y risque que de la peau. */
  above: 1.5,
  /** Vers l'œil. Plus mesuré — au-delà commencent la paupière et les cils. */
  below: 1.25,
};

/**
 * Zone à effacer autour d'une arcade, en pixels.
 *
 * CONSTRUITE SUR LE REPÈRE ET NON SUR LE CONTOUR DES REPÈRES, et c'est le correctif
 * central : l'anneau de points que rend le modèle serre le sourcil de très près, plus haut
 * que son bord inférieur réel. Effacer ce contour, même dilaté, laissait intacte la moitié
 * basse du sourcil de la cliente — une dalle sombre bien visible sous le nouveau tracé.
 *
 * L'épaisseur retenue ne descend jamais sous le sixième de la longueur, proportion d'un
 * vrai sourcil : c'est ce qui rattrape un anneau trop serré.
 *
 * @returns {{x:number,y:number}[]|null} quadrilatère orienté
 */
export function eraseZone(framePx, options = {}) {
  if (!framePx) return null;
  const { along, above, below } = { ...ERASE_ZONE, ...options };
  const { head, tail, angle, length } = framePx;
  const thickness = Math.max(framePx.thickness, length * THICKNESS_RATIO);

  const ux = Math.cos(angle);
  const uy = Math.sin(angle);
  // Normale tournée vers le HAUT de l'image, quel que soit le sens de l'axe : sur l'arcade
  // gauche il va vers les x décroissants, et sans ce retournement la zone déborderait du
  // mauvais côté — sur l'œil.
  let nx = Math.sin(angle);
  let ny = -Math.cos(angle);
  if (ny > 0) { nx = -nx; ny = -ny; }

  const a = length * along;
  const start = { x: head.x - ux * a, y: head.y - uy * a };
  const end = { x: tail.x + ux * a, y: tail.y + uy * a };
  const up = { x: nx * thickness * above, y: ny * thickness * above };
  const down = { x: -nx * thickness * below, y: -ny * thickness * below };

  return [
    { x: start.x + up.x, y: start.y + up.y },
    { x: end.x + up.x, y: end.y + up.y },
    { x: end.x + down.x, y: end.y + down.y },
    { x: start.x + down.x, y: start.y + down.y },
  ];
}

/**
 * La composition est-elle possible sur ces repères ?
 *
 * À interroger AVANT de peindre : la scène choisit entre le rendu composé et le calque à
 * plat, et doit pouvoir le faire sans avoir monté un canvas pour rien.
 */
export function canCompose(points) {
  return browFrame(points, SIDES.left) !== null && browFrame(points, SIDES.right) !== null;
}

/**
 * Zone de recadrage pour le zoom sur les yeux et les sourcils.
 *
 * C'est là que se juge le résultat : à taille réelle, sur un visage entier, un sourcil fait
 * quelques dizaines de pixels et personne ne voit ce qui a changé.
 *
 * @param {Array} points repères
 * @param {number} [pad] marge autour de la zone, en fraction de sa largeur
 * @returns {{x:number,y:number,width:number,height:number}|null} en fractions de l'image
 */
export function eyeRegion(points, pad = 0.22) {
  if (!hasBrowOutline(points)) return null;
  const all = [
    ...(browPolygon(points, SIDES.left) ?? []),
    ...(browPolygon(points, SIDES.right) ?? []),
    ...[LM.eyeLeftOuter, LM.eyeLeftInner, LM.eyeRightInner, LM.eyeRightOuter]
      .map((i) => at(points, i))
      .filter(Boolean),
  ];
  const bounds = polygonBounds(all);
  if (!bounds) return null;

  const padX = bounds.width * pad;
  const padY = bounds.height * pad;
  const x = Math.max(0, bounds.minX - padX);
  const y = Math.max(0, bounds.minY - padY);
  return {
    x,
    y,
    width: Math.min(1 - x, bounds.width + padX * 2),
    height: Math.min(1 - y, bounds.height + padY * 2),
  };
}
