import { memo, useMemo } from 'react';
import {
  PALETTE,
  buildBrow,
  buildNaturalLashes,
  lidLinePath,
  lidSurfacePath,
} from '../../utils/lashGeometry';

/** Partie purement graphique du schéma : sourcil, paupière, cils naturels.
 *
 * Elle ne dépend que du côté de l'œil, jamais des longueurs saisies — d'où la
 * mémoïsation stricte : pendant qu'on ajuste un secteur, ces quelque 250 tracés ne sont
 * pas recalculés une seule fois. Le tirage est déterministe (générateur à graine), donc
 * deux exports de la même fiche sont rigoureusement identiques.
 */
function LashArtwork({ mirrored = false }) {
  const brow = useMemo(() => buildBrow({ mirrored }), [mirrored]);
  const naturalLashes = useMemo(() => buildNaturalLashes({ mirrored }), [mirrored]);

  return (
    <g aria-hidden="true">
      <path d={lidSurfacePath()} fill={PALETTE.lidTint} opacity="0.5" />

      <g fill="none" stroke={PALETTE.ink} strokeLinecap="round">
        {brow.map((hair) => (
          <path key={`brow-${hair.key}`} d={hair.d} strokeWidth={hair.width} opacity={hair.opacity} />
        ))}
      </g>

      <g fill="none" stroke={PALETTE.ink} strokeLinecap="round">
        {naturalLashes.map((lash) => (
          <path key={`nat-${lash.key}`} d={lash.d} strokeWidth={lash.width} opacity={lash.opacity} />
        ))}
      </g>
    </g>
  );
}

/** Trait de la paupière, dessiné par-dessus la frange pour la « fermer ». */
export const LidLine = memo(function LidLine() {
  return (
    <path
      d={lidLinePath()}
      fill="none"
      stroke={PALETTE.ink}
      strokeWidth="3.4"
      strokeLinecap="round"
      // Posé par-dessus les secteurs : sans cela, il intercepterait les clics sur une
      // bande de trois pixels au bas de chacun d'eux.
      pointerEvents="none"
      aria-hidden="true"
    />
  );
});

export default memo(LashArtwork);
