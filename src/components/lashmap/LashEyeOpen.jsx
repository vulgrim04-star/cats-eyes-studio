import { memo, useMemo } from 'react';
import SkinField from './SkinField';
import {
  OPEN_PALETTE,
  buildLowerLashes,
  irisFibres,
  openEyeIris,
  openEyePaths,
  openGlobeSheen,
  lashShadowBands,
  openLashFrame,
} from '../../utils/lashEyeOpen';
import { PALETTE, buildBrow, buildExtensionLashes, buildSectors } from '../../utils/lashGeometry';
import { SKIN_ZONES_OPEN } from '../../utils/lashSkin';
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
 *  PAS UN SEUL TRAIT DE CONTOUR. Les deux paupières étaient cernées de noir ; la maquette
 *  ne l'est pas, et c'est ce qui faisait le plus « dessiné » dans le nôtre. Tout le sombre
 *  du haut vient désormais des RACINES DE CILS massées, comme sur un vrai œil ; en bas, du
 *  ressaut de la muqueuse et des cils inférieurs.
 *
 *  L'ORDRE DES PLANS EST LE SUJET. Peau, puis globe et ce qui lui appartient, puis les
 *  paupières, puis la frange, puis son ombre — un œil se dessine de l'arrière vers l'avant,
 *  et la moindre inversion se voit immédiatement : une ombre de frange posée avant la
 *  frange, et les cils flottent au-dessus de l'image.
 */
function LashEyeOpen({ eye, mirrored = false, prefix }) {
  const paths = useMemo(() => openEyePaths(mirrored), [mirrored]);
  const iris = useMemo(() => openEyeIris(mirrored), [mirrored]);
  const fibres = useMemo(() => irisFibres({ mirrored }), [mirrored]);
  const sheen = useMemo(() => openGlobeSheen(mirrored), [mirrored]);
  const shadow = useMemo(() => lashShadowBands(mirrored), [mirrored]);
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
      {/* La découpe fait tout le réalisme du globe : iris, ombre portée et éclat humide la
          débordent volontairement, et c'est elle qui les rogne — comme les paupières
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
      <SkinField prefix={prefix} zones={SKIN_ZONES_OPEN} mirrored={mirrored} />

      <path d={paths.socket} fill={`url(#${prefix}-open-lid)`} />
      <path
        d={paths.crease}
        fill="none"
        stroke={OPEN_PALETTE.crease}
        strokeWidth="1.5"
        strokeLinecap="round"
        opacity="0.7"
      />

      <g fill={`url(#${prefix}-brow)`} stroke="none">
        {brow.map((hair) => (
          <path key={`obrow-${hair.key}`} d={hair.d} opacity={hair.opacity} />
        ))}
      </g>

      {/* --- Globe ----------------------------------------------------------------- */}
      <path d={paths.aperture} fill={`url(#${prefix}-open-sclera)`} />

      <g clipPath={`url(#${clipId})`}>
        <ellipse
          cx={sheen.cx}
          cy={sheen.cy}
          rx={sheen.rx}
          ry={sheen.ry}
          fill={`url(#${prefix}-skin-light)`}
          opacity="0.55"
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

        {/* Anneau limbique : c'est ce cerne, et non la teinte de l'iris, qui fait qu'un œil
            dessiné a l'air d'un œil. Allégé d'un cran — trop appuyé, il cernait l'iris comme
            un trait de contour, exactement ce qu'on vient de retirer aux paupières. */}
        <circle
          cx={iris.cx}
          cy={iris.cy}
          r={iris.r - 2}
          fill="none"
          stroke={OPEN_PALETTE.irisRim}
          strokeWidth="4"
          opacity="0.45"
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
      {/* La muqueuse remplace le trait noir du bas : c'est un liseré CLAIR, et c'est lui qui
          sépare le globe de la paupière sur un vrai œil. */}
      <path
        d={paths.waterline}
        fill="none"
        stroke={OPEN_PALETTE.sclera}
        strokeWidth="3.2"
        strokeLinecap="round"
        opacity="0.9"
      />
      <path d={paths.caruncle} fill={OPEN_PALETTE.caruncle} opacity="0.8" />

      <g fill={`url(#${prefix}-open-lash)`} stroke="none">
        {lower.map((lash) => (
          <path key={`olow-${lash.key}`} d={lash.d} opacity={lash.opacity} />
        ))}
      </g>

      {/* Renflement du bord ciliaire, découpé au globe : c'est de ce ressaut que sortent
          les cils, et il doit donc précéder la frange.
          ÉTROIT ET DISCRET. Large et dense, il ne se lisait plus comme un ressaut mais comme
          une bande grise à bord net posée en travers du blanc de l'œil — un trait de contour
          déguisé, exactement ce qu'on venait de retirer. */}
      <g clipPath={`url(#${clipId})`}>
        <path d={paths.ridge} fill={PALETTE.lashRoot} opacity="0.26" />
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

      {/* L'OMBRE PORTÉE EN DERNIER, par-dessus le globe : une frange dense arrête la
          lumière. Sans elle, les cils sont posés SUR l'image ; avec elle, ils y sont.

          Trois bandes emboîtées, sans filtre ni dégradé : un dégradé vertical s'éteignait à
          la bonne hauteur au centre et restait opaque sur les côtés, où la paupière est plus
          basse — d'où un coin gris à bord net en travers du blanc de l'œil. */}
      <g clipPath={`url(#${clipId})`} fill={PALETTE.ink}>
        {shadow.map((bande) => (
          <path key={`osh-${bande.key}`} d={bande.d} opacity={bande.opacity} />
        ))}
      </g>
    </g>
  );
}

export default memo(LashEyeOpen);
