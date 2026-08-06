import { useId, useMemo } from 'react';
import LashDefs from './LashDefs';
import { VIEWBOX, buildExtensionLashes, buildSectors } from '../../utils/lashGeometry';
import { eyeLengths } from '../../utils/lashModel';
import styles from './styles/LashMap.module.css';

/** La frange d'extensions SEULE, pour être posée sur une photo.
 *
 *  POURQUOI PAS LA PLANCHE ENTIÈRE. `LashMapCanvas` dessine aussi la paupière modelée, son
 *  pli, le sourcil, les cils naturels, les secteurs et leurs étiquettes. Tout cela a sa
 *  raison d'être sur une planche de travail, et aucune sur un vrai visage : une paupière
 *  dessinée posée sur une vraie paupière, ce n'est pas une simulation, c'est un autocollant.
 *
 *  Ne restent donc que les extensions — ce qu'on va réellement poser — et elles suivent les
 *  longueurs saisies secteur par secteur. Les cils naturels de la cliente restent visibles
 *  dessous, ce qui est exactement ce qui se passe en cabine : une extension s'ajoute à un
 *  cil, elle ne le remplace pas.
 */
export default function LashOverlayArt({ eye, mirrored = false }) {
  const prefix = `lo${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  const count = eye.zones.length;
  const sectors = useMemo(() => buildSectors(count, { mirrored }), [count, mirrored]);
  const lengths = eyeLengths(eye);
  const lengthKey = lengths.join('|');
  const extensions = useMemo(
    () => buildExtensionLashes(lengthKey.split('|').map(Number), sectors, { mirrored }),
    [lengthKey, sectors, mirrored]
  );

  return (
    <svg
      className={styles.svg}
      viewBox={`0 0 ${VIEWBOX.width} ${VIEWBOX.height}`}
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="Frange d’extensions à poser"
    >
      <LashDefs prefix={prefix} />
      {/* Aucun fond : ce tracé est fait pour se poser sur une photo. */}
      <g fill={`url(#${prefix}-lash)`} stroke="none">
        {extensions.map((lash) => (
          <path key={lash.key} d={lash.d} opacity={lash.opacity} />
        ))}
      </g>
    </svg>
  );
}
