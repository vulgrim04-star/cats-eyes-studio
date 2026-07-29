import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useClients } from './useClients';
import {
  copyEye as copyEyeTo,
  getEye,
  mirrorEye,
  normalizeLashMap,
  pasteZone,
  resizeSectors,
  setGlobalField,
  setZoneField,
  setZoneLength,
  applyProfile,
} from '../utils/lashModel';
import { sectorCountForWidth } from '../utils/lashGeometry';
import { cycleForPoseType } from '../utils/lashPresets';

/** Identifiant d'URL d'une fiche encore jamais enregistrée. */
export const NEW_MAP_ID = 'nouvelle';

/** Profondeur de l'historique d'annulation. Vingt gestes couvrent largement une
 *  séance ; au-delà, on garde surtout de la mémoire occupée pour rien. */
const UNDO_DEPTH = 20;

/** État d'édition d'une Lash Map.
 *
 * La fiche est modifiée EN LOCAL et n'est écrite dans le magasin qu'au clic sur
 * « Enregistrer » : pendant une pose, une fausse manœuvre ne doit pas s'inscrire
 * irrémédiablement dans le dossier de la cliente. `dirty` pilote la garde de sortie.
 *
 * @param {object} client fiche cliente
 * @param {string} mapId identifiant de la Lash Map, ou NEW_MAP_ID
 */
export function useLashMapEditor(client, mapId) {
  const { addLashMap, updateLashMap } = useClients();
  const isNew = mapId === NEW_MAP_ID;

  const stored = useMemo(
    () => (isNew ? null : (client?.lashMaps ?? []).find((m) => m.id === mapId) ?? null),
    [client, mapId, isNew]
  );

  /** Fiche de départ. Une fiche NEUVE adopte le découpage adapté à l'écran ; une fiche
   *  déjà enregistrée est reprise telle quelle — la redécouper à l'ouverture réécrirait
   *  le travail de la praticienne. */
  const buildInitialMap = useCallback(() => {
    const base = normalizeLashMap(stored);
    return stored ? base : resizeSectors(base, sectorCountForWidth(window.innerWidth));
  }, [stored]);

  const [map, setMap] = useState(buildInitialMap);
  const [dirty, setDirty] = useState(false);
  const [savedId, setSavedId] = useState(isNew ? null : mapId);
  const [side, setSide] = useState('right');
  const [selected, setSelected] = useState(null);
  const [clipboard, setClipboard] = useState(null);
  const undoStack = useRef([]);

  // Recharge quand on change de fiche (navigation d'une séance à l'autre). Les
  // modifications non enregistrées d'une fiche ne doivent jamais « suivre » sur l'autre.
  // Cet effet s'exécute AUSSI au montage : il doit passer par le même constructeur que
  // l'initialiseur ci-dessus, sinon il écraserait aussitôt le découpage choisi.
  const identity = stored?.id ?? mapId;
  useEffect(() => {
    setMap(buildInitialMap());
    setDirty(false);
    setSelected(null);
    undoStack.current = [];
  }, [identity, buildInitialMap]);

  // Filet de sécurité navigateur : fermeture d'onglet ou rechargement avec des
  // modifications en cours.
  useEffect(() => {
    if (!dirty) return undefined;
    const warn = (event) => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);

  /** Applique une transformation pure à la fiche et empile l'état précédent. */
  const edit = useCallback((transform) => {
    setMap((current) => {
      const next = transform(current);
      if (next === current) return current;
      undoStack.current = [current, ...undoStack.current].slice(0, UNDO_DEPTH);
      return next;
    });
    setDirty(true);
  }, []);

  const undo = useCallback(() => {
    const [previous, ...rest] = undoStack.current;
    if (!previous) return false;
    undoStack.current = rest;
    setMap(previous);
    setDirty(true);
    return true;
  }, []);

  const canUndo = () => undoStack.current.length > 0;

  // --- Actions d'édition ---------------------------------------------------------

  const setField = useCallback(
    (field, value) => {
      edit((current) => {
        if (field !== 'poseType') return { ...current, [field]: value };
        // Le cycle de retouche découle du type de séance, sans jamais écraser une
        // valeur saisie à la main.
        const cycle = cycleForPoseType(value);
        const keep = String(current.fillCycle ?? '').trim() !== '';
        return { ...current, poseType: value, fillCycle: keep ? current.fillCycle : cycle };
      });
    },
    [edit]
  );

  const setLength = useCallback(
    (index, mm, targetSide = side) => edit((current) => setZoneLength(current, targetSide, index, mm)),
    [edit, side]
  );

  const setZoneProperty = useCallback(
    (index, field, value, targetSide = side) =>
      edit((current) => setZoneField(current, targetSide, index, field, value)),
    [edit, side]
  );

  const setGlobal = useCallback(
    (field, value, targetSide = side) => edit((current) => setGlobalField(current, targetSide, field, value)),
    [edit, side]
  );

  const setSectorCount = useCallback((count) => edit((current) => resizeSectors(current, count)), [edit]);

  const mirrorCurrentEye = useCallback(() => edit((current) => mirrorEye(current, side)), [edit, side]);

  const copyToOtherEye = useCallback(() => edit((current) => copyEyeTo(current, side)), [edit, side]);

  const applyTemplate = useCallback(
    (template, { bothEyes = true } = {}) =>
      edit((current) => {
        const applied = applyProfile(current, side, template.profile, template.global);
        const next = bothEyes
          ? applyProfile(applied, side === 'left' ? 'right' : 'left', template.profile, template.global)
          : applied;
        return { ...next, templateId: template.id };
      }),
    [edit, side]
  );

  /** Copie les propriétés du secteur sélectionné (Ctrl/Cmd + C). */
  const copySector = useCallback(() => {
    if (selected === null) return false;
    setClipboard({ ...getEye(map, side).zones[selected] });
    return true;
  }, [map, side, selected]);

  /** Colle les propriétés copiées sur le secteur sélectionné (Ctrl/Cmd + V). */
  const pasteSector = useCallback(() => {
    if (selected === null || !clipboard) return false;
    edit((current) => pasteZone(current, side, selected, clipboard));
    return true;
  }, [edit, side, selected, clipboard]);

  // --- Enregistrement ------------------------------------------------------------

  const save = useCallback(() => {
    if (!client) return null;
    if (savedId) {
      updateLashMap(client.id, savedId, map);
      setDirty(false);
      return savedId;
    }
    const entry = addLashMap(client.id, map);
    setSavedId(entry.id);
    setDirty(false);
    return entry.id;
  }, [client, map, savedId, addLashMap, updateLashMap]);

  return {
    map,
    side,
    setSide,
    selected,
    setSelected,
    dirty,
    savedId,
    isNew: !savedId,
    clipboard,
    edit,
    undo,
    canUndo,
    setField,
    setLength,
    setZoneProperty,
    setGlobal,
    setSectorCount,
    mirrorCurrentEye,
    copyToOtherEye,
    applyTemplate,
    copySector,
    pasteSector,
    save,
  };
}
