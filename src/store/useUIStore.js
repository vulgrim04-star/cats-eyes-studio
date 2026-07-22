import { create } from 'zustand';
import { createId } from '../utils/id';

export const useUIStore = create((set, get) => ({
  toasts: [],

  showToast: (message, type = 'success') => {
    const id = createId('toast');
    set((state) => ({ toasts: [...state.toasts, { id, message, type }] }));
    setTimeout(() => get().dismissToast(id), 3800);
  },

  dismissToast: (id) => {
    set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }));
  },
}));
