import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { createId } from '../utils/id';
import { todayISO } from '../utils/date';
import { supabaseSyncStorage } from '../utils/supabaseSyncStorage';
import { useSettingsStore } from './useSettingsStore';

const currentManagerName = () => useSettingsStore.getState().salon.managerName;

export const useProductsStore = create(
  persist(
    (set, get) => ({
      products: [],
      movements: [],

      addProduct: (data) => {
        const product = { id: createId('prd'), stock: 0, stockMin: 0, ...data };
        set((state) => ({ products: [...state.products, product] }));
        return product;
      },

      updateProduct: (id, patch) => {
        set((state) => ({
          products: state.products.map((p) => (p.id === id ? { ...p, ...patch } : p)),
        }));
      },

      addStock: ({ productId, quantity, reason, user = currentManagerName() }) => {
        set((state) => ({
          products: state.products.map((p) =>
            p.id === productId ? { ...p, stock: p.stock + quantity } : p
          ),
          movements: [
            { id: createId('mv'), productId, type: 'in', quantity, reason, date: todayISO(), user },
            ...state.movements,
          ],
        }));
      },

      removeStock: ({ productId, quantity, reason, user = currentManagerName() }) => {
        set((state) => ({
          products: state.products.map((p) =>
            p.id === productId ? { ...p, stock: Math.max(0, p.stock - quantity) } : p
          ),
          movements: [
            { id: createId('mv'), productId, type: 'out', quantity, reason, date: todayISO(), user },
            ...state.movements,
          ],
        }));
      },

      movementsForProduct: (productId) => get().movements.filter((m) => m.productId === productId),

      removeProduct: (productId) => {
        set((state) => ({ products: state.products.filter((p) => p.id !== productId) }));
      },
    }),
    { name: 'ces-products', version: 1, storage: createJSONStorage(() => supabaseSyncStorage), skipHydration: true }
  )
);
