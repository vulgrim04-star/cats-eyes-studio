import { useExpensesStore } from '../store/useExpensesStore';
import { useUIStore } from '../store/useUIStore';

/**
 * Couche d'accès aux dépenses du salon. Découplée du store interne
 * pour permettre un branchement futur sur une API sans changer les appelants.
 */
export function useExpenses() {
  const expenses = useExpensesStore((s) => s.expenses);
  const addExpenseRaw = useExpensesStore((s) => s.addExpense);
  const removeExpense = useExpensesStore((s) => s.removeExpense);
  const showToast = useUIStore((s) => s.showToast);

  const addExpense = (data) => {
    addExpenseRaw(data);
    showToast('Dépense enregistrée', 'success');
  };

  return { expenses, addExpense, removeExpense };
}

export function expensesInRange(expenses, startISO, endISO) {
  return expenses.filter((e) => e.date >= startISO && e.date <= endISO);
}

export function totalExpenses(expenses, startISO, endISO) {
  return expensesInRange(expenses, startISO, endISO).reduce((sum, e) => sum + e.amount, 0);
}
