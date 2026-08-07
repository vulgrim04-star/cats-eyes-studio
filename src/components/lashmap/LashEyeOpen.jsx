import { memo, useMemo } from 'react';
import {
  OPEN_PALETTE,
  buildLowerLashes,
  openEyeIris,
  openEyePaths,
  openLashFrame,
} from '../../utils/lashEyeOpen';
import { PALETTE, buildBrow, buildExtensionLashes, buildSectors } from '../../utils/lashGeometry';
import { drawableKey, zonesFromKey } from '../../utils/lashModel';

/** L'œil OUVERT : ce que la pose donnera, une fois la cliente relevée.
 *
 *  CE N'EST PAS UN SECOND DESSIN DE CILS. Les extensions viennent du même
 *  `buildExtensionLashes` que la planche technique, avec les mêmes secteurs et la même
 *  graine ; seul change le REPÈRE de pose — ici les cils remontent au lieu de descendre.
 *  Deux moteurs de dessin auraient fini par diverger, et l'aperçu aurait alors montré autre
 *  chose que la fiche : exactement ce qu'un aperçu ne doit jamais faire.
 *
 *  AUCUN SECTEUR CLIQUABLE. Sur l'œil fermé, les secteurs s'ouvrent en éventail au-dessus
 *  de la paupière ; ici cette place est occupée par le globe. La vue ouverte se REGARDE, le
 *  réglage se fait sur la planche — c'est aussi ce qui la garde lisible.
 */
function LashEyeOpen({ eye, mirrored = false, prefix }) {
  const paths = useMemo(() => openEyePaths(mirrored), [mirrored]);
  const iris = useMemo(() => openEyeIris(mirrored), [mirrored]);
  const brow = useMemo(() => buildBrow({ mirrored }), [mirrored]);
  const lower = useMemo(() => buildLowerLashes({ mirrored }), [mirrored]);
  const frame = useMemo(() => openLashFrame({ mirrored }), [mirrored]);

  const count = eye.zones.length;
  const sectors = useMemo(() => buildSectors(count, { mirrored }), [count, mirrored]);
  const zoneKey = drawableKey(eye);
  const extensions = useMemo(
    () => buildExtensionLashes(zonesFromKey(zoneKey), sectors, { mirrored, frame }),
    [zoneKey, sectors, mirrored, frame]
  );

  const clipId = `${prefix}-open-aperture`;

  return (
    <g aria-hidden="true">
      <defs>
        {/* La découpe fait tout le réalisme du globe : l'iris et l'ombre de paupière la
            débordent volontairement, et c'est elle qui les rogne — comme une vraie
            paupière rogne un vrai iris. */}
        <clipPath id={clipId}>
          <path d={paths.aperture} />
        </clipPath>
      </defs>

      {/* Creux de l'orbite, puis pli : la peau AVANT l'œil, sinon elle le recouvrirait. */}
      <path d={paths.socket} fill={`url(#${prefix}-open-lid)`} />
      <path
        d={paths.crease}
        fill="none"
        stroke={OPEN_PALETTE.crease}
        strokeWidth="1.6"
        strokeLinecap="round"
        opacity="0.8"
      />

      <g fill={`url(#${prefix}-brow)`} stroke="none">
        {brow.map((hair) => (
          <path key={`obrow-${hair.key}`} d={hair.d} opacity={hair.opacity} />
        ))}
      </g>

      <path d={paths.aperture} fill={OPEN_PALETTE.sclera} />

      <g clipPath={`url(#${clipId})`}>
        <circle cx={iris.cx} cy={iris.cy} r={iris.r} fill={`url(#${prefix}-open-iris)`} />
        {/* Anneau limbique : c'est ce cerne sombre, et non la teinte de l'iris, qui fait
            qu'un œil dessiné a l'air d'un œil. */}
        <circle
          cx={iris.cx}
          cy={iris.cy}
          r={iris.r - 3}
          fill="none"
          stroke={OPEN_PALETTE.irisRim}
          strokeWidth="6"
          opacity="0.75"
        />
        <circle cx={iris.cx} cy={iris.cy} r={iris.pupilR} fill={OPEN_PALETTE.pupil} />
        {iris.highlights.map((spot, i) => (
          <circle
            key={`hl-${i}`}
            cx={spot.x}
            cy={spot.y}
            r={spot.r}
            fill={OPEN_PALETTE.highlight}
            opacity={spot.opacity}
          />
        ))}

        {/* Ombre portée de la paupière sur le globe : le modelé tient à elle. */}
        <path d={paths.upperShade} fill={OPEN_PALETTE.scleraShade} opacity="0.5" />
      </g>

      <path
        d={paths.waterline}
        fill="none"
        stroke={OPEN_PALETTE.sclera}
        strokeWidth="3"
        strokeLinecap="round"
        opacity="0.9"
      />

      {/* Cils du bas d'abord : ils passent SOUS le trait de paupière inférieure. */}
      <g fill={`url(#${prefix}-open-lash)`} stroke="none">
        {lower.map((lash) => (
          <path key={`olow-${lash.key}`} d={lash.d} opacity={lash.opacity} />
        ))}
      </g>

      <path
        d={paths.lowerLid}
        fill="none"
        stroke={OPEN_PALETTE.lidLine}
        strokeWidth="2.4"
        strokeLinecap="round"
        opacity="0.8"
      />

      <g
        fill={`url(#${prefix}-open-lash-back)`}
        stroke="none"
        filter={`url(#${prefix}-depth)`}
      >
        {extensions.filter((lash) => lash.back).map((lash) => (
          <path key={`oext-b-${lash.key}`} d={lash.d} opacity={lash.opacity * 0.72} />
        ))}
      </g>

      <g fill={`url(#${prefix}-open-lash)`} stroke="none">
        {extensions.filter((lash) => !lash.back).map((lash) => (
          <path key={`oext-f-${lash.key}`} d={lash.d} opacity={lash.opacity} />
        ))}
      </g>

      {/* Le trait de la ligne ciliaire ferme la frange par-dessus, comme sur la planche. */}
      <path
        d={paths.upperLid}
        fill="none"
        stroke={PALETTE.lashRoot}
        strokeWidth="5"
        strokeLinecap="round"
        opacity="0.55"
      />
      <path
        d={paths.upperLid}
        fill="none"
        stroke={OPEN_PALETTE.lidLine}
        strokeWidth="3.2"
        strokeLinecap="round"
      />
    </g>
  );
}

export default memo(LashEyeOpen);
