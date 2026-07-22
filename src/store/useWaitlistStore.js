import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { createId } from '../utils/id';
import { supabaseSyncStorage } from '../utils/supabaseSyncStorage';

export const useWaitlistStore = create(
  persist(
    (set) => ({
      entries: [],

      addEntry: (data) => {
        const entry = { id: createId('wl'), createdAt: new Date().toISOString(), ...data };
        set((state) => ({ entries: [entry, ...state.entries] }));
        return entry;
      },

      removeEntry: (id) => {
        set((state) => ({ entries: state.entries.filter((e) => e.id !== id) }));
      },
    }),
    { name: 'ces-waitlist', version: 1, storage: createJSONStorage(() => supabaseSyncStorage), skipHydration: true }
  )
);
