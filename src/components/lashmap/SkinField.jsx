import { memo } from 'react';
import { VIEWBOX } from '../../utils/lashGeometry';
import { skinZones } from '../../utils/lashSkin';

/** Le champ de peau et son modelé — les mêmes pour la planche fermée et l'aperçu ouvert.
 *
 *  UN RECTANGLE PLEIN, PUIS DES ELLIPSES. Le rectangle porte un dégradé radial qui se
 *  dissout dans le papier sur ses bords : l'œil est installé dans un visage qui s'efface,
 *  pas découpé dans une photo. Chaque ellipse par-dessus prend l'un des deux seuls dégradés
 *  du modelé — un clair, un sombre — définis en `objectBoundingBox`, donc valables à
 *  n'importe quelle taille.
 *
 *  ZÉRO `feGaussianBlur`, ET C'EST LA RAISON D'ÊTRE DE CETTE FORME. La planche est ce qui
 *  part en PNG 4K et en PDF : un flou s'y retrouverait rastérisé à 3840 px de large, à
 *  chaque export, sur un téléphone. Un dégradé, lui, ne coûte rien.
 */
function SkinField({ prefix, zones, mirrored = false }) {
  return (
    <g aria-hidden="true">
      <rect x="0" y="0" width={VIEWBOX.width} height={VIEWBOX.height} fill={`url(#${prefix}-skin-field)`} />
      {skinZones(zones, mirrored).map((zone) => (
        <ellipse
          key={zone.id}
          cx={zone.cx}
          cy={zone.cy}
          rx={zone.rx}
          ry={zone.ry}
          fill={`url(#${prefix}-skin-${zone.tone})`}
          opacity={zone.opacity}
          transform={zone.angle ? `rotate(${zone.angle} ${zone.cx} ${zone.cy})` : undefined}
        />
      ))}
    </g>
  );
}

export default memo(SkinField);
