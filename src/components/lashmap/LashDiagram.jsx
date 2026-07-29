import { memo, useCallback, useMemo, useRef } from 'react';
import { useLashDiagramState, pointToViewBox } from '../../hooks/useLashDiagramState';
import { zoneLabel } from './LashDiagramInteraction';
import {
  MM_MAX,
  MM_MIN,
  VIEWBOX,
  buildLashLines,
  formatMm,
  handleAnchor,
  isSafeForNaturalLash,
  parseMm,
  validateLashLength,
} from '../../utils/lashCalculations';
import styles from './styles/LashMap.module.css';

/** Couleur « encre » fixe (cils, trait de cils, liner) : ces éléments représentent une
 *  vraie pigmentation et ne doivent jamais s'inverser en clair en mode sombre,
 *  contrairement à la forme de paupière qui suit la couleur de marque. */
const INK = '#241a12';

const LID_FILL = 'M20 92 Q140 48 260 92 Q140 128 20 92 Z';
const LASH_LINE_PATH = 'M20 92 Q140 48 260 92';
const LOWER_LINER = 'M34 138 Q90 118 150 121 Q210 124 252 138 Q200 132 150 131 Q95 130 34 138 Z';

/** Position CSS (%) d'un point du viewBox, en tenant compte du miroir. */
function toPercent({ x, y }, mirrored) {
  const px = mirrored ? VIEWBOX.width - x : x;
  return { left: `${(px / VIEWBOX.width) * 100}%`, top: `${(y / VIEWBOX.height) * 100}%` };
}

const Lashes = memo(function Lashes({ values, zones }) {
  const lines = useMemo(() => buildLashLines(values, zones), [values, zones]);
  return lines.map((line) => (
    <line
      key={line.key}
      x1={line.x1}
      y1={line.y1}
      x2={line.x2}
      y2={line.y2}
      stroke={INK}
      strokeWidth="1.6"
      strokeLinecap="round"
      opacity="0.88"
    />
  ));
});

/** Diagramme d'un œil : dessin SVG + pastilles de longueur manipulables au doigt.
 *
 * Le geste principal est le drag vertical sur une pastille (vers le haut = cil plus
 * long) ; un tap ouvre la saisie clavier, un second tap rapide réinitialise la zone.
 * Le dessin est recalculé à chaque mouvement, ce qui donne le retour temps réel.
 */
function LashDiagram({
  title,
  values,
  onChange,
  onFeedback,
  readOnly = false,
  mirrored = false,
  lashHealth = '',
  compact = false,
}) {
  const stageRef = useRef(null);
  const innerCorner = mirrored ? 'right' : 'left';

  const {
    zones,
    activeIndex,
    editingIndex,
    draft,
    setDraft,
    draftValidation,
    dragging,
    tooltip,
    startDrag,
    startDragAtPoint,
    commitEdit,
    cancelEdit,
    handleEditorTap,
    stepZone,
    resetZone,
    setActiveIndex,
    blur,
  } = useLashDiagramState({ values, onChange, disabled: readOnly, onFeedback });

  const handleStagePointerDown = useCallback(
    (event) => {
      if (readOnly || !stageRef.current) return;
      const point = pointToViewBox(stageRef.current, event, mirrored);
      startDragAtPoint(point, event.clientY);
    },
    [readOnly, mirrored, startDragAtPoint]
  );

  const handleKeyDown = useCallback(
    (event, index) => {
      const steps = { ArrowUp: 1, ArrowRight: 1, ArrowDown: -1, ArrowLeft: -1, PageUp: 2, PageDown: -2 };
      if (steps[event.key] !== undefined) {
        event.preventDefault();
        stepZone(index, steps[event.key]);
        return;
      }
      if (event.key === 'Delete' || event.key === 'Backspace') {
        event.preventDefault();
        resetZone(index);
      }
    },
    [stepZone, resetZone]
  );

  const anchors = useMemo(
    () => zones.map((zone) => ({ zone, anchor: handleAnchor(zone, values) })),
    [zones, values]
  );

  return (
    <figure className={`${styles.diagram} ${compact ? styles.diagramCompact : ''}`}>
      {title && <figcaption className={styles.diagramTitle}>{title}</figcaption>}

      <div
        className={[
          styles.stage,
          readOnly ? styles.stageStatic : '',
          dragging ? styles.stageDragging : '',
        ].join(' ')}
        ref={stageRef}
        onPointerDown={readOnly ? undefined : handleStagePointerDown}
      >
        <svg viewBox={`0 0 ${VIEWBOX.width} ${VIEWBOX.height}`} className={styles.svg} aria-hidden="true">
          <g transform={mirrored ? `translate(${VIEWBOX.width},0) scale(-1,1)` : undefined}>
            <Lashes values={values} zones={zones} />
            <path d={LASH_LINE_PATH} fill="none" stroke={INK} strokeWidth="3" strokeLinecap="round" />
            <path d={LID_FILL} fill="var(--color-accent-light)" opacity="0.65" />
            <path d={LOWER_LINER} fill={INK} opacity="0.9" />
          </g>
          {!readOnly &&
            anchors.map(({ zone, anchor }) => {
              const x = mirrored ? VIEWBOX.width - anchor.x : anchor.x;
              const base = mirrored ? VIEWBOX.width - zone.x : zone.x;
              return (
                <line
                  key={zone.id}
                  x1={base}
                  y1={zone.y}
                  x2={x}
                  y2={anchor.y}
                  stroke="var(--color-accent)"
                  strokeWidth="1"
                  strokeDasharray="2 3"
                  opacity={activeIndex === zone.index ? 0.9 : 0.25}
                />
              );
            })}
        </svg>

        <div className={styles.handles}>
          {anchors.map(({ zone, anchor }) => {
            const position = toPercent(anchor, mirrored);
            const raw = values[zone.index] ?? '';

            if (readOnly) {
              return (
                <span key={zone.id} className={styles.readValue} style={position}>
                  {raw === '' ? '·' : raw}
                </span>
              );
            }

            const label = zoneLabel(zone.index, zones.length, innerCorner);
            const validation = validateLashLength(raw);
            const unsafe = !validation.empty && !isSafeForNaturalLash(raw, lashHealth);

            if (editingIndex === zone.index) {
              return (
                <div
                  key={zone.id}
                  className={styles.zoneEditor}
                  style={position}
                  onPointerDown={(event) => {
                    // Le champ recouvre le dessin : sans cette coupure, l'appui
                    // redescendrait sur la surface et relancerait un ajustement.
                    event.stopPropagation();
                    // Deuxième appui rapide au même endroit : c'est un double-tap sur la
                    // zone (le champ ayant déjà pris la place de la pastille).
                    if (handleEditorTap(zone.index)) event.preventDefault();
                  }}
                >
                  {/* eslint-disable-next-line jsx-a11y/no-autofocus */}
                  <input
                    className={`${styles.zoneInput} ${draftValidation.valid ? '' : styles.zoneInputError}`}
                    value={draft}
                    onChange={(event) => setDraft(event.target.value)}
                    // Sélection totale à l'ouverture : on tape une longueur, on ne
                    // complète pas la précédente (« 13 » puis « 16 » donnait « 1316 »).
                    onFocus={(event) => event.target.select()}
                    onBlur={commitEdit}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') { event.preventDefault(); commitEdit(); }
                      // `stopPropagation` : sans elle, Échap remonte jusqu'à la modale,
                      // qui se fermerait alors que l'on voulait seulement fermer le champ.
                      if (event.key === 'Escape') {
                        event.preventDefault();
                        event.stopPropagation();
                        cancelEdit();
                      }
                    }}
                    inputMode="decimal"
                    maxLength={5}
                    autoFocus
                    aria-label={`${label} — longueur en millimètres`}
                  />
                  <span className={styles.zoneHint}>
                    {draftValidation.warning ?? `${MM_MIN}–${MM_MAX} mm`}
                  </span>
                </div>
              );
            }

            return (
              <button
                key={zone.id}
                type="button"
                role="slider"
                aria-orientation="vertical"
                aria-valuemin={MM_MIN}
                aria-valuemax={MM_MAX}
                aria-valuenow={parseMm(raw)}
                aria-valuetext={raw === '' ? 'non renseignée' : `${raw} millimètres`}
                aria-label={`${title ? `${title} — ` : ''}${label}`}
                className={[
                  styles.handle,
                  activeIndex === zone.index ? styles.handleActive : '',
                  raw === '' ? styles.handleEmpty : '',
                  unsafe || !validation.valid ? styles.handleWarning : '',
                ].join(' ')}
                style={position}
                onPointerDown={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  event.currentTarget.focus();
                  startDrag(zone.index, event.clientY);
                }}
                onFocus={() => setActiveIndex(zone.index)}
                onBlur={blur}
                onKeyDown={(event) => handleKeyDown(event, zone.index)}
              >
                {raw === '' ? '–' : raw}
              </button>
            );
          })}
        </div>

        {tooltip && (
          <div
            className={styles.tooltip}
            style={toPercent(anchors[tooltip.index]?.anchor ?? { x: 0, y: 0 }, mirrored)}
            role="status"
          >
            Long. : {formatMm(tooltip.mm)} mm
          </div>
        )}
      </div>

      {!readOnly && (
        <div className={styles.cornerLabels}>
          <span>{innerCorner === 'left' ? 'Interne' : 'Externe'}</span>
          <span className={styles.cornerHint}>Glissez ↕ ou touchez une valeur</span>
          <span>{innerCorner === 'left' ? 'Externe' : 'Interne'}</span>
        </div>
      )}
    </figure>
  );
}

export default memo(LashDiagram);
