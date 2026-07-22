import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { products as seedProducts } from '../data/products';
import { movements as seedMovements } from '../data/movements';
import { createId } from '../utils/id';
import { todayISO } from '../utils/date';
import { supabaseSyncStorage } from '../utils/supabaseSyncStorage';

export const useProductsStore = create(
  persist(
    (set, get) => ({
      products: seedProducts,
      movements: seedMovements,

      addStock: ({ productId, quantity, reason, user = 'Léa Moreau' }) => {
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

      removeStock: ({ productId, quantity, reason, user = 'Léa Moreau' }) => {
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
    }),
    { name: 'ces-products', version: 1, storage: createJSONStorage(() => supabaseSyncStorage), skipHydration: true }
  )
);
