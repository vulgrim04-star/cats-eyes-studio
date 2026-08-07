import { memo, useMemo } from 'react';
import SkinField from './SkinField';
import {
  PALETTE,
  buildBrow,
  buildNaturalLashes,
  lidCreasePath,
  lidLinePath,
  lidRidgePath,
  lidSurfacePath,
} from '../../utils/lashGeometry';
import { SKIN_ZONES_CLOSED } from '../../utils/lashSkin';

/** Partie purement graphique du schéma : paupière, sourcil, cils naturels.
 *
 * Elle ne dépend que du côté de l'œil et du préfixe des définitions, jamais des longueurs
 * saisies — d'où la mémoïsation stricte : pendant qu'on ajuste un secteur, ces quelque 250
 * tracés ne sont pas recalculés une seule fois. Le tirage est déterministe (générateur à
 * graine), donc deux exports de la même fiche sont rigoureusement identiques.
 *
 * Le relief tient à trois choses, dans cet ordre d'importance : la frange dédoublée en un
 * plan arrière flouté et un plan avant net, le dégradé racine → pointe de chaque cil, et
 * le modelé de la paupière (creux de l'orbite, pli, renflement du bord ciliaire).
 */
function LashArtwork({ mirrored = false, prefix }) {
  const brow = useMemo(() => buildBrow({ mirrored }), [mirrored]);
  const naturalLashes = useMemo(() => buildNaturalLashes({ mirrored }), [mirrored]);

  // Deux passes sur la même liste plutôt que deux générations : la frange doit rester
  // celle du tirage à graine, simplement répartie sur deux plans.
  const back = naturalLashes.filter((lash) => lash.back);
  const front = naturalLashes.filter((lash) => !lash.back);

  return (
    <g aria-hidden="true">
      {/* La planche est posée sur un visage elle aussi, comme la vue ouverte : c'est ce qui
          fait qu'en basculant de l'une à l'autre on reconnaît le même œil, et non deux
          dessins d'écoles différentes. */}
      <SkinField prefix={prefix} zones={SKIN_ZONES_CLOSED} mirrored={mirrored} />

      <path d={lidSurfacePath()} fill={`url(#${prefix}-lid)`} />
      <path d={lidRidgePath()} fill={PALETTE.lidLow} opacity="0.34" />
      <path
        d={lidCreasePath()}
        fill="none"
        stroke={PALETTE.creaseLine}
        strokeWidth="1.5"
        strokeLinecap="round"
        opacity="0.75"
      />

      <g fill={`url(#${prefix}-brow)`} stroke="none">
        {brow.map((hair) => (
          <path key={`brow-${hair.key}`} d={hair.d} opacity={hair.opacity} />
        ))}
      </g>

      {/* Les cils sont des silhouettes fuselées : on les REMPLIT. Les tracer au trait
          leur rendrait l'épaisseur constante qu'on vient justement de leur retirer. */}
      <g fill={`url(#${prefix}-lash-back)`} stroke="none" filter={`url(#${prefix}-depth)`}>
        {back.map((lash) => (
          <path key={`nat-b-${lash.key}`} d={lash.d} opacity={lash.opacity * 0.8} />
        ))}
      </g>

      <g fill={`url(#${prefix}-lash)`} stroke="none">
        {front.map((lash) => (
          <path key={`nat-f-${lash.key}`} d={lash.d} opacity={lash.opacity} />
        ))}
      </g>
    </g>
  );
}

/** Trait du bord ciliaire, dessiné par-dessus la frange pour la « fermer ».
 *  Épaissi au centre par un second passage : un liner d'épaisseur constante fait plat. */
export const LidLine = memo(function LidLine() {
  return (
    <g pointerEvents="none" aria-hidden="true" fill="none" strokeLinecap="round">
      {/* Posé par-dessus les secteurs : sans `pointerEvents="none"`, ce trait
          intercepterait les clics sur une bande de trois pixels au bas de chacun d'eux. */}
      <path d={lidLinePath()} stroke={PALETTE.ink} strokeWidth="3.4" />
      <path d={lidLinePath()} stroke={PALETTE.lashRoot} strokeWidth="5.2" opacity="0.5" />
    </g>
  );
});

export default memo(LashArtwork);
