import { useCallback, useEffect, useRef, useState } from 'react';
import { useToast } from './useToast';
import { MM_DEFAULT, applyDrag } from '../utils/lashCalculations';
import { getEye } from '../utils/lashModel';

/** Déplacement en dessous duquel l'appui reste un clic (et non un glissé). */
const TAP_TOLERANCE_PX = 4;

/** Type MIME du glisser-déposer interne : une pastille de réglage vers un secteur. */
export const DRAG_MIME = 'application/x-cats-eyes-lash';

/** Gestes du schéma : sélection, glissé vertical, menu contextuel, glisser-déposer,
 *  clavier et copier/coller.
 *
 * Le hook ne dessine rien et ne connaît pas la géométrie : il traduit des gestes en
 * appels d'édition. Tous les callbacks rendus sont stables, condition sans laquelle la
 * mémoïsation des secteurs ne servirait à rien.
 */
export function useSectorInteractions(editor, { onOpenPanel } = {}) {
  const { showToast } = useToast();
  const [dropIndex, setDropIndex] = useState(null);
  const [menuIndex, setMenuIndex] = useState(null);
  const [dragging, setDragging] = useState(false);
  const dragRef = useRef(null);

  const { side, selected, setSelected, setLength, map } = editor;
  const mirrored = side === 'left';

  // Les valeurs changent à chaque frappe : on les lit par référence pour que les
  // écouteurs posés sur window ne soient pas réinstallés en plein geste.
  const latest = useRef({ map, side, selected, setLength });
  latest.current = { map, side, selected, setLength };

  const select = useCallback(
    (index) => {
      setSelected(index);
      setMenuIndex(null);
    },
    [setSelected]
  );

  /** Double-clic : menu contextuel de longueur, au-dessus du secteur. */
  const activate = useCallback(
    (index) => {
      setSelected(index);
      setMenuIndex(index);
    },
    [setSelected]
  );

  const closeMenu = useCallback(() => setMenuIndex(null), []);

  // --- Glissé vertical dans un secteur -------------------------------------------

  const pointerDown = useCallback(
    (index, event) => {
      if (event.button !== undefined && event.button !== 0) return;
      const { map: current, side: currentSide } = latest.current;
      dragRef.current = {
        index,
        startY: event.clientY,
        startValue: getEye(current, currentSide).zones[index].length,
        moved: false,
      };
      setDragging(true);
    },
    []
  );

  useEffect(() => {
    if (!dragging) return undefined;

    const onMove = (event) => {
      const drag = dragRef.current;
      if (!drag) return;
      const pxDelta = drag.startY - event.clientY; // vers le haut = cil plus long
      if (!drag.moved && Math.abs(pxDelta) <= TAP_TOLERANCE_PX) return;
      drag.moved = true;
      if (event.cancelable) event.preventDefault();
      latest.current.setLength(drag.index, applyDrag(drag.startValue, pxDelta).mm);
    };

    const onEnd = () => {
      dragRef.current = null;
      setDragging(false);
    };

    window.addEventListener('pointermove', onMove, { passive: false });
    window.addEventListener('pointerup', onEnd);
    window.addEventListener('pointercancel', onEnd);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onEnd);
      window.removeEventListener('pointercancel', onEnd);
    };
  }, [dragging]);

  // --- Glisser-déposer d'une pastille de réglage ----------------------------------

  const dragOver = useCallback((event, index) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'copy';
    setDropIndex(index);
  }, []);

  const dragLeave = useCallback((event, index) => {
    setDropIndex((current) => (current === index ? null : current));
  }, []);

  const drop = useCallback(
    (event, index) => {
      event.preventDefault();
      setDropIndex(null);
      let payload = null;
      try {
        payload = JSON.parse(event.dataTransfer.getData(DRAG_MIME) || 'null');
      } catch {
        payload = null;
      }
      if (!payload) return;
      setSelected(index);
      if (payload.field === 'length') {
        editor.setLength(index, payload.value);
      } else {
        editor.setZoneProperty(index, payload.field, payload.value);
      }
    },
    [editor, setSelected]
  );

  // --- Clavier --------------------------------------------------------------------

  const keyDown = useCallback(
    (event, index) => {
      const eye = getEye(latest.current.map, latest.current.side);
      const zone = eye.zones[index];

      const moveFocus = (target) => {
        const group = event.currentTarget.parentNode;
        const next = group?.children?.[target];
        if (!next) return;
        next.focus();
        setSelected(target);
      };

      // Sur un œil retourné, « à droite » sur l'écran, c'est le secteur précédent.
      const forward = mirrored ? -1 : 1;

      switch (event.key) {
        case 'ArrowRight':
          event.preventDefault();
          moveFocus(index + forward);
          return;
        case 'ArrowLeft':
          event.preventDefault();
          moveFocus(index - forward);
          return;
        case 'ArrowUp':
          event.preventDefault();
          editor.setLength(index, zone.length + 0.5);
          return;
        case 'ArrowDown':
          event.preventDefault();
          editor.setLength(index, zone.length - 0.5);
          return;
        case 'PageUp':
          event.preventDefault();
          editor.setLength(index, zone.length + 1);
          return;
        case 'PageDown':
          event.preventDefault();
          editor.setLength(index, zone.length - 1);
          return;
        case 'Enter':
        case ' ':
          event.preventDefault();
          setSelected(index);
          setMenuIndex(index);
          onOpenPanel?.();
          return;
        case 'Delete':
        case 'Backspace':
          event.preventDefault();
          editor.setLength(index, MM_DEFAULT);
          showToast(`Secteur ${index + 1} réinitialisé à ${MM_DEFAULT} mm`, 'success');
          return;
        default:
      }
    },
    [editor, mirrored, setSelected, onOpenPanel, showToast]
  );

  // Copier / coller un secteur entier. Écoute globale : le raccourci doit fonctionner
  // que le focus soit sur le schéma ou sur le panneau, mais jamais pendant une saisie.
  useEffect(() => {
    const onKeyDown = (event) => {
      if (!(event.ctrlKey || event.metaKey)) return;
      const tag = event.target?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || event.target?.isContentEditable) return;

      if (event.key === 'z') {
        event.preventDefault();
        if (editor.undo()) showToast('Modification annulée', 'success');
        return;
      }
      if (selected === null) return;
      if (event.key === 'c') {
        event.preventDefault();
        if (editor.copySector()) showToast(`Secteur ${selected + 1} copié`, 'success');
      }
      if (event.key === 'v') {
        event.preventDefault();
        if (editor.pasteSector()) showToast(`Collé sur le secteur ${selected + 1}`, 'success');
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [editor, selected, showToast]);

  const undo = useCallback(() => {
    if (editor.undo()) showToast('Modification annulée', 'success');
  }, [editor, showToast]);

  return {
    dropIndex,
    menuIndex,
    dragging,
    select,
    activate,
    closeMenu,
    pointerDown,
    keyDown,
    dragOver,
    dragLeave,
    drop,
    undo,
  };
}
