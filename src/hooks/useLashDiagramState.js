import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  applyDrag,
  buildZones,
  getZoneAtPosition,
  stepZoneValue,
} from '../components/lashmap/LashDiagramInteraction';
import { MM_DEFAULT, VIEWBOX, formatMm, parseMm, validateLashLength } from '../utils/lashCalculations';

/** Déplacement en dessous duquel l'appui reste un tap (et non un drag). */
const TAP_TOLERANCE_PX = 4;
/** Fenêtre du double-tap : au-delà, le second appui est un appui indépendant. */
const DOUBLE_TAP_MS = 300;

function clientYOf(event) {
  if (typeof event.clientY === 'number') return event.clientY;
  return event.touches?.[0]?.clientY ?? null;
}

/** État d'interaction d'UN diagramme (un œil).
 *
 * Le formulaire reste la source de vérité : ce hook ne stocke que ce qui est éphémère
 * — zone active, saisie en cours, infobulle. Chaque mouvement du doigt écrit
 * directement dans le formulaire via `onChange`, ce qui donne le rendu temps réel.
 *
 * @param {object} params
 * @param {Array<string>} params.values valeurs des zones (mm, chaînes du formulaire)
 * @param {(index:number, value:string) => void} params.onChange
 * @param {boolean} [params.disabled] mode lecture seule
 * @param {(message:string, type?:string) => void} [params.onFeedback] retour utilisateur (toast)
 */
export function useLashDiagramState({ values, onChange, disabled = false, onFeedback }) {
  const [activeIndex, setActiveIndex] = useState(null);
  const [editingIndex, setEditingIndex] = useState(null);
  const [draft, setDraft] = useState('');
  const [dragging, setDragging] = useState(false);

  const dragRef = useRef(null);
  const lastTapRef = useRef(null);
  // Les callbacks et valeurs changent à chaque frappe : on les lit par référence pour
  // que les écouteurs de drag posés sur window ne soient pas réinstallés en plein geste.
  const latest = useRef({ values, onChange, onFeedback });
  latest.current = { values, onChange, onFeedback };

  const zones = useMemo(() => buildZones(values.length), [values.length]);

  const commitValue = useCallback((index, value) => {
    latest.current.onChange?.(index, value);
  }, []);

  const closeEditor = useCallback(() => {
    setEditingIndex(null);
    setDraft('');
  }, []);

  const startEdit = useCallback(
    (index) => {
      if (disabled) return;
      setActiveIndex(index);
      setEditingIndex(index);
      setDraft(latest.current.values[index] ?? '');
    },
    [disabled]
  );

  const resetZone = useCallback(
    (index) => {
      if (disabled) return;
      closeEditor();
      commitValue(index, '');
      latest.current.onFeedback?.(`Zone réinitialisée à ${MM_DEFAULT} mm`);
    },
    [disabled, closeEditor, commitValue]
  );

  const stepZone = useCallback(
    (index, steps) => {
      if (disabled) return;
      const { value } = stepZoneValue(latest.current.values[index], steps);
      setActiveIndex(index);
      commitValue(index, value);
    },
    [disabled, commitValue]
  );

  /** Démarre un drag sur une zone. `clientY` vient du pointeur, pas du SVG :
   *  la sensibilité doit être la même quel que soit le zoom du diagramme. */
  const startDrag = useCallback(
    (index, clientY) => {
      if (disabled || clientY === null) return;
      dragRef.current = {
        index,
        startY: clientY,
        startValue: latest.current.values[index] ?? '',
        moved: false,
      };
      setActiveIndex(index);
      setDragging(true);
    },
    [disabled]
  );

  /** Appui n'importe où sur le dessin : rattache le geste à la zone la plus proche.
   * @param {{x:number, y:number}} point coordonnées dans le repère du viewBox
   */
  const startDragAtPoint = useCallback(
    (point, clientY) => {
      if (disabled) return null;
      const zone = getZoneAtPosition(zones, point.x, point.y);
      if (!zone) return null;
      startDrag(zone.index, clientY);
      return zone;
    },
    [disabled, zones, startDrag]
  );

  // Écouteurs posés sur window (et non sur la pastille) : le doigt sort très vite de
  // la cible pendant un geste vertical, et le drag doit continuer quand même.
  useEffect(() => {
    if (!dragging) return undefined;

    const onMove = (event) => {
      const drag = dragRef.current;
      if (!drag) return;
      const clientY = clientYOf(event);
      if (clientY === null) return;
      const pxDelta = drag.startY - clientY; // vers le haut = cil plus long
      if (!drag.moved && Math.abs(pxDelta) <= TAP_TOLERANCE_PX) return;
      drag.moved = true;
      if (event.cancelable) event.preventDefault(); // empêche le scroll de la page
      const { value } = applyDrag(drag.startValue, pxDelta);
      commitValue(drag.index, value);
    };

    const onEnd = () => {
      const drag = dragRef.current;
      dragRef.current = null;
      setDragging(false);
      if (!drag) return;
      if (drag.moved) {
        lastTapRef.current = null;
        return;
      }
      // Appui sans mouvement : c'est un tap → saisie clavier sur la zone.
      const now = Date.now();
      const last = lastTapRef.current;
      if (last && last.index === drag.index && now - last.time < DOUBLE_TAP_MS) {
        lastTapRef.current = null;
        resetZone(drag.index);
        return;
      }
      lastTapRef.current = { index: drag.index, time: now };
      startEdit(drag.index);
    };

    window.addEventListener('pointermove', onMove, { passive: false });
    window.addEventListener('pointerup', onEnd);
    window.addEventListener('pointercancel', onEnd);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onEnd);
      window.removeEventListener('pointercancel', onEnd);
    };
  }, [dragging, commitValue, resetZone, startEdit]);

  /** Second appui rapide sur une zone déjà en édition : réinitialisation.
   *  C'est ce qui rend le « double tap » possible alors que le premier tap a déjà
   *  ouvert le champ de saisie par-dessus la pastille.
   * @returns {boolean} true si le geste a été consommé comme un double-tap
   */
  const handleEditorTap = useCallback(
    (index) => {
      const last = lastTapRef.current;
      if (last && last.index === index && Date.now() - last.time < DOUBLE_TAP_MS) {
        lastTapRef.current = null;
        resetZone(index);
        return true;
      }
      return false;
    },
    [resetZone]
  );

  const commitEdit = useCallback(() => {
    if (editingIndex === null) return;
    const trimmed = draft.trim();
    if (trimmed === '') {
      commitValue(editingIndex, '');
    } else {
      const result = validateLashLength(trimmed);
      commitValue(editingIndex, formatMm(result.mm));
      if (!result.valid && result.warning) latest.current.onFeedback?.(result.warning, 'warning');
    }
    closeEditor();
  }, [editingIndex, draft, commitValue, closeEditor]);

  const cancelEdit = useCallback(() => closeEditor(), [closeEditor]);

  // NB : on ne réinitialise pas `lastTapRef` ici. Le premier tap remplace la pastille
  // par le champ de saisie, ce qui fait perdre le focus au bouton : effacer la trace du
  // tap à ce moment-là rendrait le double-tap impossible à détecter.
  const blur = useCallback(() => setActiveIndex(null), []);

  const draftValidation = useMemo(() => validateLashLength(draft), [draft]);

  const tooltip = useMemo(() => {
    if (activeIndex === null || !dragging) return null;
    const mm = parseMm(values[activeIndex]);
    return { index: activeIndex, mm, label: `${formatMm(mm)} mm` };
  }, [activeIndex, dragging, values]);

  return {
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
    startEdit,
    commitEdit,
    cancelEdit,
    handleEditorTap,
    resetZone,
    stepZone,
    setActiveIndex,
    blur,
  };
}

/** Convertit un événement pointeur en coordonnées du viewBox du diagramme.
 *  Passe par le rectangle de l'élément plutôt que par `getScreenCTM` : le SVG est
 *  redimensionné en CSS, et le rapport largeur/hauteur du viewBox est conservé.
 * @param {HTMLElement} element conteneur du diagramme
 * @param {{clientX:number, clientY:number}} event
 * @param {boolean} [mirrored] diagramme retourné horizontalement
 */
export function pointToViewBox(element, event, mirrored = false) {
  const rect = element.getBoundingClientRect();
  if (rect.width === 0 || rect.height === 0) return { x: 0, y: 0 };
  const ratioX = (event.clientX - rect.left) / rect.width;
  const ratioY = (event.clientY - rect.top) / rect.height;
  const x = (mirrored ? 1 - ratioX : ratioX) * VIEWBOX.width;
  return { x, y: ratioY * VIEWBOX.height };
}
