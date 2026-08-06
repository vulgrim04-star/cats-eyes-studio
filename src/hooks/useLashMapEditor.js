import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useClients } from './useClients';
import {
  carryOverMap,
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
import { todayISO } from '../utils/date';

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

  /** Séance la plus récente de la cliente : c'est d'elle que part une fiche neuve. */
  const previousSession = useMemo(() => {
    if (!isNew) return null;
    const maps = client?.lashMaps ?? [];
    if (maps.length === 0) return null;
    return [...maps].sort((a, b) => String(b.date).localeCompare(String(a.date)))[0];
  }, [client, isNew]);

  /** Fiche de départ.
   *
   *  Une fiche NEUVE reprend la séance précédente quand il y en a une : une retouche à
   *  trois semaines rejoue la même pose, et tout ressaisir en cabine est du temps perdu.
   *  À défaut, elle adopte le découpage adapté à l'écran.
   *
   *  Une fiche déjà enregistrée est reprise telle quelle — la redécouper à l'ouverture
   *  réécrirait le travail de la praticienne.
   */
  const buildInitialMap = useCallback(() => {
    if (stored) return normalizeLashMap(stored);
    if (previousSession) return carryOverMap(previousSession, todayISO());
    return resizeSectors(normalizeLashMap(null), sectorCountForWidth(window.innerWidth));
  }, [stored, previousSession]);

  const [map, setMap] = useState(buildInitialMap);
  // Une fiche reprise est déjà porteuse de contenu : la déclarer vierge griserait
  // « Enregistrer » sur une fiche pourtant prête à l'être.
  const [dirty, setDirty] = useState(Boolean(previousSession));
  // La praticienne a-t-elle explicitement refusé la reprise ? Sans ce drapeau, le bandeau
  // continuerait d'annoncer une reprise sur une fiche qu'on vient justement de vider.
  const [blanked, setBlanked] = useState(false);
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
    setDirty(Boolean(previousSession));
    setSelected(null);
    setBlanked(false);
    undoStack.current = [];
  }, [identity, buildInitialMap, previousSession]);

  /** Repartir d'une fiche vierge : la reprise est une commodité, jamais une contrainte.
   *  Une cliente qui change complètement de pose ne doit pas avoir à défaire la
   *  précédente réglage par réglage. */
  const startBlank = useCallback(() => {
    setMap(resizeSectors(normalizeLashMap(null), sectorCountForWidth(window.innerWidth)));
    setDirty(false);
    setSelected(null);
    setBlanked(true);
    undoStack.current = [];
  }, []);

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

  /** `extra` porte ce que la page sait et que l'éditeur ignore — aujourd'hui la prestation
   *  du jour, qui vaut pour la séance entière et pas seulement pour le schéma. Fusionné à
   *  l'enregistrement plutôt que tenu dans l'état de l'éditeur : ce n'est pas une propriété
   *  de la pose, et le marquer « modifié » à chaque bascule d'onglet serait faux. */
  const save = useCallback(
    (extra) => {
      if (!client) return null;
      const payload = extra ? { ...map, ...extra } : map;
      if (savedId) {
        updateLashMap(client.id, savedId, payload);
        setDirty(false);
        return savedId;
      }
      const entry = addLashMap(client.id, payload);
      setSavedId(entry.id);
      setDirty(false);
      return entry.id;
    },
    [client, map, savedId, addLashMap, updateLashMap]
  );

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
    /** Séance dont la fiche neuve est issue, ou `null` — y compris après un retour à la
     *  fiche vierge, qui doit faire disparaître le bandeau. */
    carriedFrom: blanked ? null : previousSession,
    startBlank,
  };
}
