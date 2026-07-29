import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { createId } from '../utils/id';
import { supabaseSyncStorage } from '../utils/supabaseSyncStorage';

/** Modèles de mapping enregistrés par la praticienne.
 *
 * Séparés des fiches clientes : un modèle appartient au salon, pas à une cliente, et il
 * doit rester disponible même si la fiche d'origine est supprimée. Même mécanique de
 * synchronisation que les autres magasins (écriture locale, remontée Supabase).
 */
export const useLashTemplatesStore = create(
  persist(
    (set) => ({
      templates: [],

      addTemplate: (template) => {
        const entry = {
          id: createId('tpl'),
          createdAt: new Date().toISOString().slice(0, 10),
          ...template,
        };
        set((state) => ({ templates: [entry, ...state.templates] }));
        return entry;
      },

      removeTemplate: (id) => {
        set((state) => ({ templates: state.templates.filter((t) => t.id !== id) }));
      },
    }),
    {
      name: 'ces-lash-templates',
      version: 1,
      storage: createJSONStorage(() => supabaseSyncStorage),
      skipHydration: true,
    }
  )
);
