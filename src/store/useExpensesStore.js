import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { expenses as seedExpenses } from '../data/expenses';
import { createId } from '../utils/id';

export const useExpensesStore = create(
  persist(
    (set) => ({
      expenses: seedExpenses,

      addExpense: (data) => {
        const expense = { id: createId('exp'), ...data };
        set((state) => ({ expenses: [expense, ...state.expenses] }));
        return expense;
      },

      removeExpense: (id) => {
        set((state) => ({ expenses: state.expenses.filter((e) => e.id !== id) }));
      },
    }),
    { name: 'ces-expenses', version: 1, storage: createJSONStorage(() => localStorage) }
  )
);
