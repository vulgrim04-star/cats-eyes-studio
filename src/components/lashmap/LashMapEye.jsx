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
import { effectiveZone, eyeLengths, sectorLabel } from '../../utils/lashModel';
import styles from './styles/LashMap.module.css';

/** Un œil complet : le dessin, la frange qui suit les longueurs saisies, et les
 *  secteurs manipulables posés par-dessus.
 *
 * Le secteur d'index 0 est toujours le coin interne ; `mirrored` ne retourne que le
 * DESSIN (œil gauche), jamais l'ordre des données.
 */
function LashMapEye({
  eye,
  mirrored = false,
  selectedIndex = null,
  changedIndexes = null,
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

  // Signature textuelle des longueurs : évite de régénérer la frange quand c'est une
  // autre propriété du secteur (courbure, densité…) qui a changé.
  const lengthKey = lengths.join('|');
  const extensions = useMemo(
    () => buildExtensionLashes(lengthKey.split('|').map(Number), sectors, { mirrored }),
    [lengthKey, sectors, mirrored]
  );

  const peak = Math.max(...lengths);
  const axis = axisLabelPoints(mirrored);

  return (
    <g>
      <LashArtwork mirrored={mirrored} />

      <g fill="none" stroke={PALETTE.ink} strokeLinecap="round" aria-hidden="true">
        {extensions.map((lash) => (
          <path key={`ext-${lash.key}`} d={lash.d} strokeWidth={lash.width} opacity={lash.opacity} />
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
            peak={lengths[sector.index] === peak}
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
