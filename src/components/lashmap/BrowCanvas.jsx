import { memo, useId, useMemo } from 'react';
import {
  BROW_VIEWBOX,
  browGloss,
  browOutline,
  buildBrowHairs,
  zoneHandles,
} from '../../utils/browGeometry';
import { BROW_ZONES, lookSummary, renderedTone } from '../../utils/browShapes';
import { PALETTE } from '../../utils/lashGeometry';
import styles from './styles/BrowStudio.module.css';

const SIDES = ['left', 'right'];

/** Aperçu des DEUX sourcils, dessinés depuis les réglages en cours.
 *
 *  Les deux plutôt qu'un seul, parce que l'essentiel du métier est là : la symétrie. Un
 *  sourcil isolé se juge toujours réussi ; c'est la paire qui dit la vérité.
 *
 *  Chaque zone porte une pastille cliquable — tête, milieu, arche, queue — pour la
 *  retoucher seule. La pastille est posée AU-DESSUS du tracé, jamais dessus : sur un
 *  sourcil fin, une cible centrée serait plus grande que le dessin qu'elle recouvre.
 */
function BrowCanvas({ look, selectedZone = null, onSelectZone, readOnly = false }) {
  const prefix = `bw${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  const tone = renderedTone(look);

  const brows = useMemo(
    () =>
      SIDES.map((side) => ({
        side,
        outline: browOutline(look, side),
        hairs: buildBrowHairs(look, side, { seed: side === 'left' ? 4409 : 7311 }),
        gloss: browGloss(look, side),
        handles: zoneHandles(look, side),
      })),
    [look]
  );

  return (
    <svg
      className={styles.canvas}
      viewBox={`0 0 ${BROW_VIEWBOX.width} ${BROW_VIEWBOX.height}`}
      role="img"
      aria-label={`Aperçu des sourcils — ${lookSummary(look)}`}
    >
      <defs>
        {/* Un dégradé unique partagé par les deux sourcils : la racine est plus dense que
            la pointe, comme sur un vrai poil. */}
        <linearGradient id={`${prefix}-hair`} gradientUnits="userSpaceOnUse" x1="0" y1={BROW_VIEWBOX.height} x2="0" y2="0">
          <stop offset="0%" stopColor={tone.hex} />
          <stop offset="100%" stopColor={tone.hex} stopOpacity="0.55" />
        </linearGradient>
      </defs>

      <rect x="0" y="0" width={BROW_VIEWBOX.width} height={BROW_VIEWBOX.height} fill={PALETTE.paper} />

      {brows.map(({ side, outline, hairs, gloss, handles }) => (
        <g key={side}>
          {/* Aplat sous les poils : c'est lui qui porte la couleur de teinture, les poils
              ne font que la texture. */}
          <path d={outline} fill={tone.hex} opacity={tone.opacity * 0.82} />

          <g fill={`url(#${prefix}-hair)`} stroke="none" opacity={tone.opacity}>
            {hairs.map((hair) => (
              <path key={`${side}-${hair.key}`} d={hair.d} opacity={hair.opacity} />
            ))}
          </g>

          {gloss && (
            <path
              d={gloss.d}
              fill="none"
              stroke="#FFFFFF"
              strokeWidth="3"
              strokeLinecap="round"
              opacity={gloss.opacity * 0.7}
            />
          )}

          {!readOnly &&
            handles.map((handle) => {
              const zone = BROW_ZONES.find((z) => z.id === handle.id);
              const active = selectedZone === handle.id;
              return (
                <g
                  key={`${side}-${handle.id}`}
                  className={styles.handle}
                  role="button"
                  tabIndex={0}
                  aria-label={`${zone.label} — ${zone.hint}`}
                  aria-pressed={active}
                  onClick={() => onSelectZone?.(handle.id)}
                  onFocus={() => onSelectZone?.(handle.id)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      onSelectZone?.(handle.id);
                    }
                  }}
                >
                  <circle
                    cx={handle.x}
                    cy={handle.y}
                    r={active ? 11 : 9}
                    fill={active ? PALETTE.accent : PALETTE.paper}
                    stroke={active ? PALETTE.accentDark : PALETTE.sectorStroke}
                    strokeWidth="1.6"
                  />
                  <text
                    x={handle.x}
                    y={handle.y + 3.5}
                    textAnchor="middle"
                    fontFamily={PALETTE.fontStack}
                    fontSize="9"
                    fontWeight="700"
                    fill={active ? PALETTE.paper : PALETTE.muted}
                    pointerEvents="none"
                  >
                    {zone.label[0]}
                  </text>
                </g>
              );
            })}
        </g>
      ))}
    </svg>
  );
}

export default memo(BrowCanvas);
