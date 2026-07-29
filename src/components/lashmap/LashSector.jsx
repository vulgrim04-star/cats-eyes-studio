import { memo } from 'react';
import { PALETTE } from '../../utils/lashGeometry';
import { formatMm } from '../../utils/lashCalculations';
import styles from './styles/LashMap.module.css';

/** Aspect d'un secteur selon son état. Ces valeurs sont posées en ATTRIBUTS SVG et non
 *  en CSS : le schéma doit s'exporter tel quel (SVG, PNG, PDF), or une feuille de style
 *  de l'application ne suit pas le fichier exporté. Le CSS ne sert qu'aux états
 *  éphémères — survol et focus — qui n'ont aucune raison d'apparaître dans un export. */
function appearanceOf({ selected, changed, dropActive }) {
  if (dropActive) return { fillOpacity: 0.9, stroke: PALETTE.accentDark, strokeWidth: 2.6 };
  if (selected) return { fillOpacity: 0.8, stroke: PALETTE.accent, strokeWidth: 2.4 };
  if (changed) return { fillOpacity: 0.42, stroke: PALETTE.accent, strokeWidth: 2 };
  return { fillOpacity: 0.001, stroke: PALETTE.sectorStroke, strokeWidth: 1.1 };
}

/** Un secteur du schéma : un `<path>` indépendant, sa longueur, et ses marques d'état
 *  (sélection, surcharge, écart avec la séance comparée).
 *
 * Mémoïsé : sur douze secteurs, ajuster une longueur ne doit redessiner qu'un seul
 * `<g>`. Les callbacks reçus sont stabilisés par le parent, sans quoi la mémoïsation
 * n'aurait aucun effet.
 */
function LashSector({
  sector,
  zone,
  label,
  selected = false,
  changed = false,
  peak = false,
  dropActive = false,
  readOnly = false,
  onSelect,
  onActivate,
  onPointerDown,
  onKeyDown,
  onDragOver,
  onDragLeave,
  onDrop,
}) {
  const appearance = appearanceOf({ selected, changed, dropActive });

  const description = [
    label,
    `${formatMm(zone.length)} millimètres`,
    `courbure ${zone.curl}`,
    `épaisseur ${zone.diameter}`,
    zone.density,
    zone.overrides.length > 0 ? 'réglages personnalisés' : '',
  ]
    .filter(Boolean)
    .join(', ');

  return (
    <g
      className={`${styles.sector} ${readOnly ? styles.sectorStatic : ''}`}
      role={readOnly ? 'presentation' : 'button'}
      tabIndex={readOnly ? undefined : 0}
      aria-label={readOnly ? undefined : description}
      aria-pressed={readOnly ? undefined : selected}
      onClick={readOnly ? undefined : () => onSelect?.(sector.index)}
      // Le focus vaut sélection : au clavier, le panneau et les raccourcis
      // copier/coller doivent porter sur le secteur qu'on est en train de parcourir.
      onFocus={readOnly ? undefined : () => onSelect?.(sector.index)}
      onDoubleClick={readOnly ? undefined : () => onActivate?.(sector.index)}
      onPointerDown={readOnly ? undefined : (event) => onPointerDown?.(sector.index, event)}
      onKeyDown={readOnly ? undefined : (event) => onKeyDown?.(event, sector.index)}
      onDragOver={readOnly ? undefined : (event) => onDragOver?.(event, sector.index)}
      onDragLeave={readOnly ? undefined : (event) => onDragLeave?.(event, sector.index)}
      onDrop={readOnly ? undefined : (event) => onDrop?.(event, sector.index)}
    >
      <path
        className={styles.sectorShape}
        d={sector.path}
        fill={PALETTE.sectorFill}
        fillOpacity={appearance.fillOpacity}
        stroke={appearance.stroke}
        strokeWidth={appearance.strokeWidth}
        strokeLinejoin="round"
      />

      <text
        x={sector.labelPoint.x}
        y={sector.labelPoint.y}
        textAnchor="middle"
        fontFamily={PALETTE.fontStack}
        fontSize="19"
        fontWeight="600"
        fill={peak ? PALETTE.accentDark : PALETTE.text}
        pointerEvents="none"
      >
        {formatMm(zone.length)}
      </text>
      <text
        x={sector.labelPoint.x}
        y={sector.labelPoint.y + 14}
        textAnchor="middle"
        fontFamily={PALETTE.fontStack}
        fontSize="9.5"
        fontWeight="500"
        letterSpacing="0.4"
        fill={PALETTE.muted}
        pointerEvents="none"
      >
        mm
      </text>

      {zone.overrides.length > 0 && (
        <circle
          cx={sector.labelPoint.x}
          cy={sector.labelPoint.y - 24}
          r="3.2"
          fill={PALETTE.accent}
          pointerEvents="none"
        />
      )}
    </g>
  );
}

export default memo(LashSector);
