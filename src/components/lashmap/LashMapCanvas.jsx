import { forwardRef } from 'react';
import LashMapEye from './LashMapEye';
import { PALETTE, VIEWBOX } from '../../utils/lashGeometry';
import { SIDE_LABEL, getEye, lengthRange } from '../../utils/lashModel';
import styles from './styles/LashMap.module.css';

/** Surface de dessin : la « planche » papier et son SVG.
 *
 * Le SVG est exposé par `ref` — c'est lui que `lashExport` sérialise pour l'export
 * SVG, la rastérisation PNG et la fiche PDF. Il porte donc son propre fond papier
 * (`<rect>`) : un SVG transparent donnerait un PNG à fond noir chez la moitié des
 * visionneuses.
 */
const LashMapCanvas = forwardRef(function LashMapCanvas(
  { map, side, compact = false, readOnly = false, ...eyeProps },
  ref
) {
  const eye = getEye(map, side);
  const mirrored = side === 'left';

  return (
    <div className={`${styles.plate} ${compact ? styles.plateCompact : ''}`}>
      <svg
        ref={ref}
        className={styles.svg}
        viewBox={`0 0 ${VIEWBOX.width} ${VIEWBOX.height}`}
        xmlns="http://www.w3.org/2000/svg"
        // `role="img"` réduirait tout le sous-arbre à une image : les secteurs, qui sont
        // les commandes du schéma, disparaîtraient des technologies d'assistance. On ne
        // l'emploie donc que sur une planche en lecture seule.
        role={readOnly ? 'img' : 'group'}
        aria-label={`${SIDE_LABEL[side]} — ${eye.zones.length} secteurs, ${lengthRange(eye)}`}
      >
        <rect x="0" y="0" width={VIEWBOX.width} height={VIEWBOX.height} fill={PALETTE.paper} />
        <LashMapEye eye={eye} mirrored={mirrored} readOnly={readOnly} {...eyeProps} />
      </svg>
    </div>
  );
});

export default LashMapCanvas;
