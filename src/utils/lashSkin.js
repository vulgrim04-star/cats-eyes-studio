/** La PEAU des deux vues du schéma.
 *
 *  POURQUOI CE MODULE EXISTE. Un œil détouré sur du papier se lit toujours comme un
 *  pictogramme, si soigné soit-il : c'est l'arcade, le creux de l'orbite et la pommette qui
 *  en font un regard. Les deux vues — la planche fermée et l'aperçu ouvert — ont désormais
 *  besoin du même modelé, et il vit ici plutôt qu'en double.
 *
 *  PAS UN SEUL FLOU, ET C'EST LA DÉCISION QUI COMMANDE TOUT LE RESTE.
 *
 *  La vue ouverte posait ses surfaces de peau et les passait à un `feGaussianBlur`. Tant
 *  qu'elle seule s'en servait, c'était sans conséquence : elle n'est jamais exportée, la
 *  sérialisation emporte toujours la planche. Mais la planche porte maintenant la peau elle
 *  aussi — et un flou s'y retrouverait rastérisé À 3840 PX DE LARGE dans le PNG 4K et dans le
 *  PDF, à chaque export, sur un téléphone.
 *
 *  D'où la forme retenue : chaque zone de modelé est une ELLIPSE remplie par un dégradé
 *  radial qui s'éteint en transparence sur son bord. Deux dégradés partagés suffisent — un
 *  clair, un sombre — parce qu'ils sont définis en `objectBoundingBox` et s'adaptent donc à
 *  n'importe quelle ellipse. Deux définitions, zéro filtre : un dégradé ne coûte rien à
 *  rastériser, un flou si.
 *
 *  DEUX JEUX DE ZONES, ET NON UN SEUL PARAMÉTRÉ. Les deux vues n'ont pas la même anatomie :
 *  l'une est un œil de face, l'autre une paupière baissée vue de dessus. Un jeu unique nous
 *  ferait tordre la géométrie pour n'économiser que quelques lignes.
 */

import { VIEWBOX } from './lashGeometry';

/** Les deux seules teintes que le modelé emploie. `light` prend la lumière — arcade,
 *  pommette — `shade` la retient : creux de l'orbite, racine du nez, sillon lacrymal. */
export const SKIN_TONES = ['light', 'shade'];

/** Champ de peau : un dégradé radial centré sur l'œil qui SE DISSOUT DANS LE PAPIER sur ses
 *  bords. Sans ce fondu on aurait un rectangle de peau en travers de la planche, et un
 *  cadrage photographique là où l'on veut un dessin. */
export const SKIN_VIGNETTE = {
  cx: VIEWBOX.width / 2,
  cy: 250,
  r: 340,
  /** Jusqu'où la peau reste pleine avant de partir vers le papier. */
  solid: 0.5,
};

/**
 * Modelé de la VUE ŒIL OUVERT — un œil de face.
 *
 * L'ordre compte : les zones se peignent dans l'ordre du tableau, du fond vers l'avant.
 */
export const SKIN_ZONES_OPEN = [
  /** Racine du nez, côté coin interne. L'ombre verticale qui donne au visage son relief
   *  central — et le repère le plus sûr pour dire si le dessin est du bon côté. */
  { id: 'noseBridge', cx: 24, cy: 250, rx: 132, ry: 250, angle: 0, tone: 'shade', opacity: 0.3 },
  /** Tempe, côté coin externe : le pendant du nez, plus léger. */
  { id: 'temple', cx: 588, cy: 236, rx: 108, ry: 220, angle: 0, tone: 'shade', opacity: 0.18 },
  /** Arcade sourcilière : la saillie osseuse sous le sourcil, plus claire car elle prend la
   *  lumière. C'est elle qui creuse l'orbite en dessous, par contraste. */
  { id: 'browBone', cx: 300, cy: 118, rx: 232, ry: 74, angle: 0, tone: 'light', opacity: 0.62 },
  /** Creux de l'orbite, juste au-dessus du pli. */
  { id: 'socket', cx: 300, cy: 182, rx: 210, ry: 52, angle: 0, tone: 'shade', opacity: 0.22 },
  /** Haut de la pommette : une clarté large sous l'œil, qui referme le modelé. */
  { id: 'cheek', cx: 300, cy: 424, rx: 250, ry: 108, angle: 0, tone: 'light', opacity: 0.5 },
  /** Sillon lacrymal. Discret : marqué, il donnerait un regard fatigué — l'exact contraire
   *  de ce qu'une planche de pose doit montrer. */
  { id: 'tearTrough', cx: 300, cy: 356, rx: 214, ry: 40, angle: 0, tone: 'shade', opacity: 0.2 },
];

/**
 * Modelé de la PLANCHE FERMÉE — une paupière baissée, vue de dessus.
 *
 * Les zones ne sont pas les mêmes et ne peuvent pas l'être : ici le globe ne se voit pas, la
 * paupière occupe tout le milieu du cadre, et c'est son bombé qu'il faut rendre. Le sillon
 * lacrymal, lui, n'a plus de sens — il n'y a pas de paupière inférieure à creuser.
 */
export const SKIN_ZONES_CLOSED = [
  { id: 'noseBridge', cx: 18, cy: 250, rx: 126, ry: 260, angle: 0, tone: 'shade', opacity: 0.28 },
  { id: 'temple', cx: 592, cy: 240, rx: 104, ry: 230, angle: 0, tone: 'shade', opacity: 0.17 },
  { id: 'browBone', cx: 300, cy: 128, rx: 236, ry: 68, angle: 0, tone: 'light', opacity: 0.55 },
  /** Creux de l'orbite : sur un œil fermé il est plus haut et plus large que sur un œil
   *  ouvert, la paupière ayant glissé vers le bas. */
  { id: 'socket', cx: 300, cy: 214, rx: 224, ry: 62, angle: 0, tone: 'shade', opacity: 0.2 },
  /** Bombé du globe sous la paupière close : la clarté qui dit qu'il y a un œil dessous. */
  { id: 'dome', cx: 300, cy: 322, rx: 196, ry: 84, angle: 0, tone: 'light', opacity: 0.42 },
  /** Pommette, tout en bas du cadre, sous la frange. */
  { id: 'cheek', cx: 300, cy: 470, rx: 254, ry: 84, angle: 0, tone: 'light', opacity: 0.38 },
];

/**
 * Réflexion d'une zone autour de l'axe vertical du cadre.
 *
 * LE POINT OÙ UNE ERREUR NE SE VERRAIT PAS. Une racine de nez posée du mauvais côté ombre la
 * tempe : le dessin s'affiche normalement, mais le visage se lit de travers, et on met des
 * jours à comprendre pourquoi l'œil gauche « fait bizarre ». L'angle s'inverse avec la
 * position — une ellipse inclinée à +12° devient une ellipse à −12°.
 *
 * @param {{cx:number, angle?:number}} zone
 */
export function mirrorZone(zone) {
  // `-(0)` vaut `-0`, qui partirait tel quel dans un `rotate(-0 …)` du fichier exporté.
  const angle = zone.angle ? -zone.angle : 0;
  return { ...zone, cx: VIEWBOX.width - zone.cx, angle };
}

/**
 * Les zones d'une vue, dans l'orientation demandée.
 *
 * @param {Array} zones `SKIN_ZONES_OPEN` ou `SKIN_ZONES_CLOSED`
 * @param {boolean} [mirrored]
 */
export function skinZones(zones, mirrored = false) {
  return mirrored ? zones.map(mirrorZone) : zones;
}
