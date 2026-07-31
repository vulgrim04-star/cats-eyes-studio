import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { supabaseSyncStorage } from '../utils/supabaseSyncStorage';
import { DEFAULT_REFERENTIALS, moveValue, normalizeList, normalizeReferentials } from '../utils/referentials';

/** Les listes de valeurs propres au salon (type, état et longueur des cils).
 *
 *  Persisté comme les autres magasins, donc synchronisé entre appareils : une nuance
 *  ajoutée sur l'ordinateur se retrouve sur le téléphone.
 *
 *  Toute la logique — nettoyage, doublons, repli sur les valeurs par défaut — vit dans
 *  `utils/referentials.js` en fonctions pures ; ce magasin ne fait que la brancher. */
export const useReferentialsStore = create(
  persist(
    (set, get) => ({
      ...DEFAULT_REFERENTIALS,

      /** Remplace une liste entière (utilisé par l'écran de réglages après chaque geste). */
      setList: (key, values) => {
        if (!(key in DEFAULT_REFERENTIALS)) return;
        set({ [key]: normalizeList(values, key) });
      },

      addValue: (key, label) => {
        const value = String(label ?? '').trim();
        if (!value) return;
        get().setList(key, [...(get()[key] ?? []), value]);
      },

      renameValue: (key, index, label) => {
        const list = [...(get()[key] ?? [])];
        if (index < 0 || index >= list.length) return;
        list[index] = label;
        get().setList(key, list);
      },

      removeValue: (key, index) => {
        const list = (get()[key] ?? []).filter((_, i) => i !== index);
        get().setList(key, list);
      },

      move: (key, index, direction) => {
        get().setList(key, moveValue(get()[key], index, direction));
      },

      resetList: (key) => {
        if (!(key in DEFAULT_REFERENTIALS)) return;
        set({ [key]: [...DEFAULT_REFERENTIALS[key]] });
      },
    }),
    {
      name: 'ces-referentials',
      version: 1,
      storage: createJSONStorage(() => supabaseSyncStorage),
      skipHydration: true,
      // Une liste corrompue ou absente dans l'état enregistré est complétée plutôt que
      // laissée vide : l'écran de la fiche cliente ne doit jamais afficher un menu sans option.
      merge: (persisted, current) => ({ ...current, ...normalizeReferentials(persisted) }),
    }
  )
);
