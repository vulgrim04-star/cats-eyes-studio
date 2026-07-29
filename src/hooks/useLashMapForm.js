import { useCallback, useEffect, useMemo, useReducer } from 'react';
import {
  MIN_ZONES,
  addZone as addZoneTo,
  mirrorZones,
  removeZone as removeZoneFrom,
  resizeZones,
  setZoneValue,
} from '../components/lashmap/LashDiagramInteraction';
import { isSafeForNaturalLash, parseMm } from '../utils/lashCalculations';
import { applyPreset, cycleForPoseType } from '../utils/lashPresets';
import { estimateNextRetouchDate } from '../utils/lashCycle';
import { todayISO } from '../utils/date';

const DEFAULT_ZONE_COUNT = 6;

/** Fiche vierge. Toute nouvelle propriété doit être ajoutée ici : c'est ce squelette
 *  qui garantit qu'une fiche enregistrée avant l'ajout d'un champ reste éditable. */
export const EMPTY_LASH_MAP = {
  date: todayISO(),
  poseType: 'Pose complète',
  eyeShape: '',
  setShape: '',
  lashHealth: '',
  fillCycle: '',
  styles: [],
  effects: [],
  curl: 'C',
  length: '',
  thickness: '',
  baseType: '',
  adhesive: '',
  innerCornerLength: '',
  outerCornerLength: '',
  layers: { top: '', mid: '', bottom: '' },
  zonesLeft: Array.from({ length: DEFAULT_ZONE_COUNT }, () => ''),
  zonesRight: Array.from({ length: DEFAULT_ZONE_COUNT }, () => ''),
  notes: '',
};

const SIDE_KEYS = { left: 'zonesLeft', right: 'zonesRight' };

function normalizeZones(zones) {
  const list = Array.isArray(zones) && zones.length > 0 ? zones.map((z) => String(z ?? '')) : null;
  if (!list) return Array.from({ length: DEFAULT_ZONE_COUNT }, () => '');
  return resizeZones(list, Math.max(MIN_ZONES, list.length));
}

/** Fusionne une fiche existante avec le squelette vierge (champs manquants, zones de
 *  longueurs différentes entre les deux yeux, `layers` absent…). */
export function normalizeLashMap(map) {
  if (!map) return { ...EMPTY_LASH_MAP, date: todayISO() };
  const left = normalizeZones(map.zonesLeft);
  const right = normalizeZones(map.zonesRight);
  const count = Math.max(left.length, right.length);
  return {
    ...EMPTY_LASH_MAP,
    ...map,
    styles: [...(map.styles ?? [])],
    effects: [...(map.effects ?? [])],
    layers: { ...EMPTY_LASH_MAP.layers, ...(map.layers ?? {}) },
    zonesLeft: resizeZones(left, count),
    zonesRight: resizeZones(right, count),
  };
}

/** Champs repris quand on duplique la séance précédente : la technique, jamais la date
 *  ni les notes, qui appartiennent à la séance passée. */
const DUPLICATED_FIELDS = [
  'eyeShape', 'setShape', 'lashHealth', 'fillCycle', 'styles', 'effects', 'curl',
  'length', 'thickness', 'baseType', 'adhesive', 'innerCornerLength', 'outerCornerLength',
  'layers', 'zonesLeft', 'zonesRight',
];

function reducer(state, action) {
  switch (action.type) {
    case 'hydrate':
      return normalizeLashMap(action.map);

    case 'field':
      return { ...state, [action.key]: action.value };

    case 'toggle': {
      const list = state[action.key] ?? [];
      return {
        ...state,
        [action.key]: list.includes(action.value)
          ? list.filter((v) => v !== action.value)
          : [...list, action.value],
      };
    }

    case 'layer':
      return { ...state, layers: { ...state.layers, [action.key]: action.value } };

    case 'poseType': {
      // Le cycle suggéré découle du type de séance, mais ne doit jamais écraser une
      // valeur saisie à la main : la praticienne connaît sa cliente mieux que la liste.
      const cycle = cycleForPoseType(action.value);
      const keepCycle = state.fillCycle.trim() !== '';
      return { ...state, poseType: action.value, fillCycle: keepCycle ? state.fillCycle : cycle };
    }

    case 'zone': {
      const key = SIDE_KEYS[action.side];
      return { ...state, [key]: setZoneValue(state[key], action.index, action.value) };
    }

    case 'zones':
      return { ...state, [SIDE_KEYS[action.side]]: action.values };

    case 'addZone':
      return {
        ...state,
        zonesLeft: addZoneTo(state.zonesLeft),
        zonesRight: addZoneTo(state.zonesRight),
      };

    case 'removeZone':
      return {
        ...state,
        zonesLeft: removeZoneFrom(state.zonesLeft),
        zonesRight: removeZoneFrom(state.zonesRight),
      };

    case 'mirrorZones': {
      const key = SIDE_KEYS[action.side];
      return { ...state, [key]: mirrorZones(state[key]) };
    }

    case 'copyEye': {
      const from = SIDE_KEYS[action.side];
      const to = action.side === 'left' ? SIDE_KEYS.right : SIDE_KEYS.left;
      return { ...state, [to]: [...state[from]] };
    }

    case 'preset':
      return { ...state, ...applyPreset(action.preset, state.zonesLeft.length) };

    case 'duplicate': {
      const source = normalizeLashMap(action.map);
      const patch = {};
      DUPLICATED_FIELDS.forEach((key) => { patch[key] = source[key]; });
      return { ...state, ...patch };
    }

    default:
      return state;
  }
}

/** État complet du formulaire Lash Map.
 *
 * @param {object|null} editingMap fiche en cours de modification (null = création)
 * @param {boolean} open ouverture de la modale — réinitialise le formulaire
 */
export function useLashMapForm(editingMap, open) {
  const [form, dispatch] = useReducer(reducer, editingMap, normalizeLashMap);

  // Réhydratation à chaque ouverture : une modale fermée puis rouverte sur une autre
  // fiche ne doit jamais réafficher la précédente.
  useEffect(() => {
    dispatch({ type: 'hydrate', map: editingMap });
  }, [editingMap, open]);

  const setField = useCallback((key, value) => dispatch({ type: 'field', key, value }), []);
  const toggleIn = useCallback((key, value) => dispatch({ type: 'toggle', key, value }), []);
  const setLayer = useCallback((key, value) => dispatch({ type: 'layer', key, value }), []);
  const setPoseType = useCallback((value) => dispatch({ type: 'poseType', value }), []);
  const setZone = useCallback((side, index, value) => dispatch({ type: 'zone', side, index, value }), []);
  const setZones = useCallback((side, values) => dispatch({ type: 'zones', side, values }), []);
  const addZone = useCallback(() => dispatch({ type: 'addZone' }), []);
  const removeZone = useCallback(() => dispatch({ type: 'removeZone' }), []);
  const mirrorSide = useCallback((side) => dispatch({ type: 'mirrorZones', side }), []);
  const copyEye = useCallback((side) => dispatch({ type: 'copyEye', side }), []);
  const selectPreset = useCallback((preset) => dispatch({ type: 'preset', preset }), []);
  const duplicateFrom = useCallback((map) => dispatch({ type: 'duplicate', map }), []);

  const zoneCount = form.zonesLeft.length;

  const suggestedRetouch = useMemo(
    () => estimateNextRetouchDate(form.date, form.fillCycle),
    [form.date, form.fillCycle]
  );

  /** Zones dont la longueur dépasse ce que supporte le cil naturel décrit. Purement
   *  consultatif : on alerte, on n'empêche jamais d'enregistrer. */
  const { zonesLeft, zonesRight, lashHealth } = form;
  const healthWarnings = useMemo(() => {
    const warnings = [];
    [['left', zonesLeft], ['right', zonesRight]].forEach(([side, values]) => {
      values.forEach((value, index) => {
        if (String(value).trim() === '') return;
        if (!isSafeForNaturalLash(value, lashHealth)) {
          warnings.push({ side, index, mm: parseMm(value) });
        }
      });
    });
    return warnings;
  }, [zonesLeft, zonesRight, lashHealth]);

  return {
    form,
    zoneCount,
    suggestedRetouch,
    healthWarnings,
    setField,
    toggleIn,
    setLayer,
    setPoseType,
    setZone,
    setZones,
    addZone,
    removeZone,
    mirrorSide,
    copyEye,
    selectPreset,
    duplicateFrom,
  };
}
