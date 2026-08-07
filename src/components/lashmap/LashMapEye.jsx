import { memo, useMemo } from 'react';
import LashArtwork, { LidLine } from './LashArtwork';
import LashSector from './LashSector';
import {
  PALETTE,
  axisLabelPoints,
  buildExtensionLashes,
  buildSectors,
  centerGuidePath,
} from '../../utils/lashGeometry';
import { drawableKey, effectiveZone, eyeLengths, sectorLabel, zonesFromKey } from '../../utils/lashModel';
import styles from './styles/LashMap.module.css';

/** Un œil complet : le dessin, la frange qui suit les longueurs saisies, et les
 *  secteurs manipulables posés par-dessus.
 *
 * Le secteur d'index 0 est toujours le coin interne ; `mirrored` ne retourne que le
 * DESSIN (œil gauche), jamais l'ordre des données.
 */
function LashMapEye({
  eye,
  prefix,
  mirrored = false,
  selectedIndex = null,
  changedIndexes = null,
  unsafeIndexes = null,
  dropIndex = null,
  readOnly = false,
  onSelect,
  onActivate,
  onSectorPointerDown,
  onSectorKeyDown,
  onSectorDragOver,
  onSectorDragLeave,
  onSectorDrop,
}) {
  const count = eye.zones.length;
  const sectors = useMemo(() => buildSectors(count, { mirrored }), [count, mirrored]);
  const lengths = eyeLengths(eye);

  // Les secteurs RÉSOLUS — réglage global appliqué — et non les seules longueurs comme
  // auparavant : c'est ce qui fait qu'un passage de C en DD, de 0.03 à 0.15 ou de Classic
  // en Mega Volume se voit enfin sur le dessin.
  const zoneKey = drawableKey(eye);
  const extensions = useMemo(
    () => buildExtensionLashes(zonesFromKey(zoneKey), sectors, { mirrored }),
    [zoneKey, sectors, mirrored]
  );

  // Le sommet du mapping n'est mis en valeur que s'il y en a un : sur une fiche neuve,
  // toutes les longueurs sont égales et tout passerait en doré.
  const longest = Math.max(...lengths);
  const peak = longest > Math.min(...lengths) ? longest : null;
  const axis = axisLabelPoints(mirrored);

  return (
    <g>
      <LashArtwork mirrored={mirrored} prefix={prefix} />

      {/* Les extensions aussi se répartissent sur deux plans : c'est ce qui donne
          l'épaisseur d'un bouquet posé, là où une rangée unique fait peigne. */}
      <g fill={`url(#${prefix}-lash-back)`} stroke="none" filter={`url(#${prefix}-depth)`} aria-hidden="true">
        {extensions.filter((lash) => lash.back).map((lash) => (
          <path key={`ext-b-${lash.key}`} d={lash.d} opacity={lash.opacity * 0.72} />
        ))}
      </g>

      <g fill={`url(#${prefix}-lash)`} stroke="none" aria-hidden="true">
        {extensions.filter((lash) => !lash.back).map((lash) => (
          <path key={`ext-f-${lash.key}`} d={lash.d} opacity={lash.opacity} />
        ))}
      </g>

      <path
        className={styles.centerGuide}
        d={centerGuidePath()}
        fill="none"
        stroke={PALETTE.muted}
        strokeWidth="1.2"
        strokeDasharray="5 5"
        aria-hidden="true"
      />

      {/* Attributs de police en toutes lettres, comme pour les valeurs des secteurs :
          une classe CSS ne suivrait pas le fichier exporté, qui sortirait en serif. */}
      <g
        aria-hidden="true"
        fill={PALETTE.muted}
        textAnchor="middle"
        fontFamily={PALETTE.fontStack}
        fontSize="11"
        fontWeight="700"
        letterSpacing="1.6"
      >
        <text x={axis.inner.x} y={axis.inner.y}>INTERNE</text>
        <text x={axis.center.x} y={axis.center.y - 6}>CENTRE</text>
        <text x={axis.outer.x} y={axis.outer.y}>EXTERNE</text>
      </g>

      <g className={styles.sectors}>
        {sectors.map((sector) => (
          <LashSector
            key={sector.id}
            sector={sector}
            zone={effectiveZone(eye, sector.index)}
            label={sectorLabel(sector.index, count)}
            selected={selectedIndex === sector.index}
            changed={Boolean(changedIndexes?.has(sector.index))}
            unsafe={Boolean(unsafeIndexes?.has(sector.index))}
            peak={peak !== null && lengths[sector.index] === peak}
            dropActive={dropIndex === sector.index}
            readOnly={readOnly}
            onSelect={onSelect}
            onActivate={onActivate}
            onPointerDown={onSectorPointerDown}
            onKeyDown={onSectorKeyDown}
            onDragOver={onSectorDragOver}
            onDragLeave={onSectorDragLeave}
            onDrop={onSectorDrop}
          />
        ))}
      </g>

      {/* Le trait de paupière passe APRÈS les secteurs : leur bord inférieur suit la
          même courbe et, surligné en doré, il effacerait l'anatomie du dessin. */}
      <LidLine />
    </g>
  );
}

export default memo(LashMapEye);
