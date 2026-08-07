import { memo, useMemo } from 'react';
import {
  OPEN_PALETTE,
  buildLowerLashes,
  globeVeins,
  irisFibres,
  openEyeIris,
  openEyePaths,
  openGlobeSheen,
  openLashFrame,
  skinPaths,
} from '../../utils/lashEyeOpen';
import { PALETTE, VIEWBOX, buildBrow, buildExtensionLashes, buildSectors } from '../../utils/lashGeometry';
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
 *
 *  L'ORDRE DES PLANS EST LE SUJET. Peau, puis globe et ce qui lui appartient, puis les
 *  paupières, puis la frange, puis son ombre — un œil se dessine de l'arrière vers l'avant,
 *  et la moindre inversion se voit immédiatement : une ombre de frange posée avant la
 *  frange, et les cils flottent au-dessus de l'image.
 */
function LashEyeOpen({ eye, mirrored = false, prefix }) {
  const paths = useMemo(() => openEyePaths(mirrored), [mirrored]);
  const skin = useMemo(() => skinPaths(mirrored), [mirrored]);
  const iris = useMemo(() => openEyeIris(mirrored), [mirrored]);
  const fibres = useMemo(() => irisFibres({ mirrored }), [mirrored]);
  const veins = useMemo(() => globeVeins({ mirrored }), [mirrored]);
  const sheen = useMemo(() => openGlobeSheen(mirrored), [mirrored]);
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
  const soft = `url(#${prefix}-open-soft)`;

  return (
    <g aria-hidden="true">
      {/* La découpe fait tout le réalisme du globe : iris, ombre portée, éclat et veinules
          la débordent volontairement, et c'est elle qui les rogne — comme les paupières
          rognent un vrai œil. */}
      <clipPath id={clipId}>
        <path d={paths.aperture} />
      </clipPath>
      {/* Seconde découpe, au disque de l'iris : une strie qui déborderait sur le blanc de
          l'œil se verrait immédiatement. */}
      <clipPath id={`${prefix}-open-iris-disc`}>
        <circle cx={iris.cx} cy={iris.cy} r={iris.r - 6} />
      </clipPath>

      {/* --- Peau ------------------------------------------------------------------ */}
      {/* Le champ de peau couvre la planche mais se dissout dans le papier sur ses bords :
          l'œil est installé dans un visage qui s'efface, pas découpé dans une photo. */}
      <rect x="0" y="0" width={VIEWBOX.width} height={VIEWBOX.height} fill={`url(#${prefix}-open-skin)`} />
      <path d={skin.noseBridge} fill={OPEN_PALETTE.skinLow} opacity="0.22" filter={soft} />
      <path d={skin.cheek} fill={OPEN_PALETTE.skinHigh} opacity="0.5" filter={soft} />
      <path d={skin.browBone} fill={OPEN_PALETTE.skinHigh} opacity="0.6" filter={soft} />
      <path d={skin.tearTrough} fill={OPEN_PALETTE.skinLow} opacity="0.26" filter={soft} />

      <path d={paths.socket} fill={`url(#${prefix}-open-lid)`} />
      <path
        d={paths.crease}
        fill="none"
        stroke={OPEN_PALETTE.crease}
        strokeWidth="1.6"
        strokeLinecap="round"
        opacity="0.85"
      />

      <g fill={`url(#${prefix}-brow)`} stroke="none">
        {brow.map((hair) => (
          <path key={`obrow-${hair.key}`} d={hair.d} opacity={hair.opacity} />
        ))}
      </g>

      {/* --- Globe ----------------------------------------------------------------- */}
      <path d={paths.aperture} fill={`url(#${prefix}-open-sclera)`} />

      <g clipPath={`url(#${clipId})`}>
        {/* Veinules AVANT l'iris : elles courent sur le blanc, elles ne le traversent pas. */}
        <g fill="none" stroke={OPEN_PALETTE.vein} strokeLinecap="round">
          {veins.map((vein) => (
            <path key={`ovein-${vein.key}`} d={vein.d} strokeWidth={vein.width} opacity={vein.opacity} />
          ))}
        </g>
        <ellipse
          cx={sheen.cx}
          cy={sheen.cy}
          rx={sheen.rx}
          ry={sheen.ry}
          fill={OPEN_PALETTE.highlight}
          opacity="0.4"
          filter={soft}
        />

        <circle cx={iris.cx} cy={iris.cy} r={iris.r} fill={`url(#${prefix}-open-iris)`} />

        {/* Les fibres font passer l'iris de la pastille au tissu. */}
        <g clipPath={`url(#${prefix}-open-iris-disc)`} fill="none" strokeLinecap="round">
          {fibres.map((fibre) => (
            <path
              key={`ofib-${fibre.key}`}
              d={fibre.d}
              stroke={fibre.light ? OPEN_PALETTE.irisFibreLight : OPEN_PALETTE.irisFibreDark}
              strokeWidth={fibre.width}
              opacity={fibre.opacity}
            />
          ))}
        </g>

        {/* Anneau limbique : c'est ce cerne sombre, et non la teinte de l'iris, qui fait
            qu'un œil dessiné a l'air d'un œil. */}
        <circle
          cx={iris.cx}
          cy={iris.cy}
          r={iris.r - 3}
          fill="none"
          stroke={OPEN_PALETTE.irisRim}
          strokeWidth="5"
          opacity="0.6"
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
      </g>

      {/* --- Paupières -------------------------------------------------------------- */}
      <path
        d={paths.waterline}
        fill="none"
        stroke={OPEN_PALETTE.sclera}
        strokeWidth="3.4"
        strokeLinecap="round"
        opacity="0.95"
      />
      <path d={paths.caruncle} fill={OPEN_PALETTE.caruncle} opacity="0.85" />

      {/* Cils du bas avant le trait de paupière inférieure : ils en sortent, ils ne s'y
          posent pas. */}
      <g fill={`url(#${prefix}-open-lash)`} stroke="none">
        {lower.map((lash) => (
          <path key={`olow-${lash.key}`} d={lash.d} opacity={lash.opacity} />
        ))}
      </g>
      <path
        d={paths.lowerLid}
        fill="none"
        stroke={OPEN_PALETTE.lidLine}
        strokeWidth="2.2"
        strokeLinecap="round"
        opacity="0.72"
      />

      {/* Renflement du bord ciliaire, découpé au globe : c'est de ce ressaut que sortent
          les cils, et il doit donc précéder la frange. */}
      <g clipPath={`url(#${clipId})`}>
        <path d={paths.ridge} fill={PALETTE.lashRoot} opacity="0.3" />
      </g>

      {/* --- Frange, et son ombre --------------------------------------------------- */}
      <g fill={`url(#${prefix}-open-lash-back)`} stroke="none" filter={`url(#${prefix}-depth)`}>
        {extensions.filter((lash) => lash.back).map((lash) => (
          <path key={`oext-b-${lash.key}`} d={lash.d} opacity={lash.opacity * 0.72} />
        ))}
      </g>

      <g fill={`url(#${prefix}-open-lash)`} stroke="none">
        {extensions.filter((lash) => !lash.back).map((lash) => (
          <path key={`oext-f-${lash.key}`} d={lash.d} opacity={lash.opacity} />
        ))}
      </g>

      {/* L'OMBRE PORTÉE EN DERNIER, par-dessus le globe mais sous rien : une frange dense
          arrête la lumière. Sans elle, les cils sont posés SUR l'image ; avec elle, ils y
          sont — et c'est ce qui met le mieux en valeur ce qu'on vient regarder. */}
      <g clipPath={`url(#${clipId})`}>
        <path d={paths.lashShadow} fill={`url(#${prefix}-open-shadow)`} filter={soft} />
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
