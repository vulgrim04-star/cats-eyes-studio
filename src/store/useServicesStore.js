import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { createId } from '../utils/id';
import { supabaseSyncStorage } from '../utils/supabaseSyncStorage';

export const useServicesStore = create(
  persist(
    (set) => ({
      services: [],
      promoCodes: [
        { id: 'promo_1', code: 'BIENVENUE10', label: '10% de réduction — première visite', discountPercent: 10, active: true },
        { id: 'promo_2', code: 'FIDELITE15', label: '15% de réduction — cliente fidèle', discountPercent: 15, active: true },
        { id: 'promo_3', code: 'ETE2026', label: 'Offre spéciale été', discountPercent: 20, active: false },
      ],

      addService: (data) => {
        const service = { id: createId('srv'), ...data };
        set((state) => ({ services: [...state.services, service] }));
        return service;
      },

      updateService: (id, patch) => {
        set((state) => ({
          services: state.services.map((s) => (s.id === id ? { ...s, ...patch } : s)),
        }));
      },

      removeService: (id) => {
        set((state) => ({ services: state.services.filter((s) => s.id !== id) }));
      },

      togglePromo: (id) => {
        set((state) => ({
          promoCodes: state.promoCodes.map((p) => (p.id === id ? { ...p, active: !p.active } : p)),
        }));
      },

      addPromo: (data) => {
        const promo = { id: createId('promo'), active: true, ...data };
        set((state) => ({ promoCodes: [...state.promoCodes, promo] }));
        return promo;
      },

      updatePromo: (id, patch) => {
        set((state) => ({
          promoCodes: state.promoCodes.map((p) => (p.id === id ? { ...p, ...patch } : p)),
        }));
      },

      removePromo: (id) => {
        set((state) => ({ promoCodes: state.promoCodes.filter((p) => p.id !== id) }));
      },
    }),
    { name: 'ces-services', version: 1, storage: createJSONStorage(() => supabaseSyncStorage), skipHydration: true }
  )
);
