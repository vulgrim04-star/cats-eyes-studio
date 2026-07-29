import { useCallback } from 'react';
import Icon from '../common/Icon';
import LashDiagram from './LashDiagram';
import LashDiagramToolbar from './LashDiagramToolbar';
import LashTechnicalPanel from './LashTechnicalPanel';
import LashComparisonView from './LashComparisonView';
import { useToast } from '../../hooks/useToast';
import { zoneLabel } from './LashDiagramInteraction';
import styles from './styles/LashMap.module.css';

/** Zone d'édition complète d'une Lash Map.
 *
 * Hiérarchie voulue : les diagrammes d'abord (c'est le geste principal), la barre
 * d'outils juste au-dessus, et tout le reste replié dans le panneau technique.
 */
export default function LashMapEditor({ formApi, previousMaps = [] }) {
  const {
    form,
    zoneCount,
    suggestedRetouch,
    healthWarnings,
    setField,
    toggleIn,
    setLayer,
    setPoseType,
    setZone,
    addZone,
    removeZone,
    mirrorSide,
    copyEye,
    selectPreset,
    duplicateFrom,
  } = formApi;

  const { showToast } = useToast();

  // Callbacks stables : LashDiagram est mémoïsé, une lambda recréée à chaque frappe
  // annulerait la mémoïsation et ferait ramer le drag sur mobile.
  const changeLeft = useCallback((index, value) => setZone('left', index, value), [setZone]);
  const changeRight = useCallback((index, value) => setZone('right', index, value), [setZone]);
  const feedback = useCallback((message, type = 'success') => showToast(message, type), [showToast]);

  const handleDuplicate = useCallback(
    (map) => {
      const source = map ?? previousMaps[0];
      if (!source) return;
      duplicateFrom(source);
      showToast('Fiche précédente reprise comme base', 'success');
    },
    [previousMaps, duplicateFrom, showToast]
  );

  const handlePreset = useCallback(
    (preset) => {
      selectPreset(preset);
      showToast(`Modèle « ${preset.label} » appliqué`, 'success');
    },
    [selectPreset, showToast]
  );

  return (
    <div className={styles.editor}>
      <LashDiagramToolbar
        form={form}
        zoneCount={zoneCount}
        onPoseType={setPoseType}
        onToggle={toggleIn}
        onField={setField}
        onAddZone={addZone}
        onRemoveZone={removeZone}
        onPreset={handlePreset}
        onDuplicate={() => handleDuplicate(null)}
        onMirror={mirrorSide}
        onCopyEye={copyEye}
        hasPrevious={previousMaps.length > 0}
      />

      <div className={styles.diagramsRow}>
        <LashDiagram
          title="Œil gauche"
          values={form.zonesLeft}
          onChange={changeLeft}
          onFeedback={feedback}
          lashHealth={form.lashHealth}
          mirrored
        />
        <LashDiagram
          title="Œil droit"
          values={form.zonesRight}
          onChange={changeRight}
          onFeedback={feedback}
          lashHealth={form.lashHealth}
        />
      </div>

      {healthWarnings.length > 0 && (
        <div className={styles.warningBanner} role="status">
          <Icon name="alert-triangle" size={16} />
          <div>
            <strong>Longueurs à vérifier</strong>
            <p>
              {healthWarnings
                .slice(0, 3)
                .map((warning) => `${warning.side === 'left' ? 'Œil gauche' : 'Œil droit'} · ${zoneLabel(warning.index, zoneCount, warning.side === 'left' ? 'right' : 'left')} (${warning.mm} mm)`)
                .join(' — ')}
              {healthWarnings.length > 3 && ` et ${healthWarnings.length - 3} autre(s)`}
              {' '}: au-delà de ce que supportent des cils décrits comme « {form.lashHealth} ».
            </p>
          </div>
        </div>
      )}

      <LashTechnicalPanel
        form={form}
        suggestedRetouch={suggestedRetouch}
        onField={setField}
        onLayer={setLayer}
      />

      <LashComparisonView
        currentMap={form}
        previousMaps={previousMaps}
        onDuplicate={handleDuplicate}
      />
    </div>
  );
}
