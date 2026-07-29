import { useRef } from 'react';
import Icon from '../common/Icon';
import { MAX_ZONES, MIN_ZONES } from './LashDiagramInteraction';
import { CURLS, EFFECTS, MAP_PRESETS, POSE_TYPES, STYLES, suggestSetShape } from '../../utils/lashPresets';
import styles from './styles/LashMap.module.css';

/** Barre d'outils au-dessus des diagrammes : type de séance, styles, courbure et
 *  actions rapides. Chaque groupe défile horizontalement sur mobile plutôt que de
 *  passer à la ligne — la hauteur est la ressource rare sur un téléphone. */
export default function LashDiagramToolbar({
  form,
  zoneCount,
  onPoseType,
  onToggle,
  onField,
  onAddZone,
  onRemoveZone,
  onPreset,
  onDuplicate,
  onMirror,
  onCopyEye,
  hasPrevious,
}) {
  const presetsRef = useRef(null);
  const suggestion = suggestSetShape(form.curl, form.styles);

  const applyPreset = (preset) => {
    onPreset(preset);
    if (presetsRef.current) presetsRef.current.open = false;
  };

  // Une fiche enregistrée avant l'ajout d'un type de séance doit rester sélectionnable :
  // on complète la liste avec la valeur stockée si elle n'y figure plus.
  const poseTypes = POSE_TYPES.some((p) => p.value === form.poseType)
    ? POSE_TYPES
    : [...POSE_TYPES, { value: form.poseType, cycle: '' }];

  return (
    <div className={styles.toolbar}>
      <div className={styles.toolbarGroup}>
        <span className={styles.toolbarLabel}>Séance</span>
        <div className={`${styles.chipRow} ${styles.chipRowScroll} scrollbar-hidden`} role="radiogroup" aria-label="Type de séance">
          {poseTypes.map((type) => (
            <button
              key={type.value}
              type="button"
              role="radio"
              aria-checked={form.poseType === type.value}
              className={`${styles.chip} ${form.poseType === type.value ? styles.chipActive : ''}`}
              onClick={() => onPoseType(type.value)}
            >
              {type.value}
            </button>
          ))}
        </div>
      </div>

      <div className={styles.toolbarGroup}>
        <span className={styles.toolbarLabel}>Style</span>
        <div className={`${styles.chipRow} ${styles.chipRowScroll} scrollbar-hidden`}>
          {STYLES.map((style) => (
            <button
              key={style}
              type="button"
              aria-pressed={form.styles.includes(style)}
              className={`${styles.chip} ${form.styles.includes(style) ? styles.chipActive : ''}`}
              onClick={() => onToggle('styles', style)}
            >
              {style}
            </button>
          ))}
        </div>
      </div>

      <div className={styles.toolbarGroup}>
        <span className={styles.toolbarLabel}>Effet</span>
        <div className={`${styles.chipRow} ${styles.chipRowScroll} scrollbar-hidden`}>
          {EFFECTS.map((effect) => (
            <button
              key={effect}
              type="button"
              aria-pressed={form.effects.includes(effect)}
              className={`${styles.chip} ${form.effects.includes(effect) ? styles.chipActive : ''}`}
              onClick={() => onToggle('effects', effect)}
            >
              {effect}
            </button>
          ))}
        </div>
      </div>

      <div className={styles.toolbarRow}>
        <div className={styles.curlField}>
          <label className={styles.toolbarLabel} htmlFor="lm-curl">Courbure</label>
          <select
            id="lm-curl"
            className={`input-field ${styles.curlSelect}`}
            value={form.curl}
            onChange={(event) => onField('curl', event.target.value)}
          >
            {CURLS.map((curl) => (
              <option key={curl} value={curl}>{curl}</option>
            ))}
          </select>
        </div>

        <div className={styles.zoneStepper}>
          <button
            type="button"
            className={styles.zoneStepperBtn}
            onClick={onRemoveZone}
            disabled={zoneCount <= MIN_ZONES}
            aria-label="Retirer une zone"
          >
            −
          </button>
          <span className={styles.zoneStepperCount}>{zoneCount} zones</span>
          <button
            type="button"
            className={styles.zoneStepperBtn}
            onClick={onAddZone}
            disabled={zoneCount >= MAX_ZONES}
            aria-label="Ajouter une zone"
          >
            +
          </button>
        </div>
      </div>

      {suggestion && (
        <p className={styles.suggestion}>
          <Icon name="info" size={13} /> {suggestion}
        </p>
      )}

      <div className={styles.actionsRow}>
        <details className={styles.presets} ref={presetsRef}>
          <summary className={styles.presetsSummary}>
            <Icon name="sparkles" size={14} /> Modèles
          </summary>
          <div className={styles.presetsMenu}>
            {MAP_PRESETS.map((preset) => (
              <button key={preset.id} type="button" className={styles.presetItem} onClick={() => applyPreset(preset)}>
                <span className={styles.presetLabel}>{preset.label}</span>
                <span className={styles.presetHint}>{preset.hint}</span>
              </button>
            ))}
          </div>
        </details>

        <button type="button" className="btn btn-ghost btn-sm" onClick={onDuplicate} disabled={!hasPrevious}>
          <Icon name="clipboard" size={14} /> Reprendre la dernière
        </button>
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => onCopyEye('left')}>
          <Icon name="eye" size={14} /> Copier G → D
        </button>
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => onMirror('right')}>
          <Icon name="arrow-left" size={14} /> Inverser l'œil droit
        </button>
      </div>
    </div>
  );
}
