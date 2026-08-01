import { useEffect, useState } from 'react';
import Modal from '../common/Modal';
import { useExpenses } from '../../hooks/useExpenses';
import { EXPENSE_CATEGORIES } from '../../data/expenses';
import { todayISO } from '../../utils/date';
import { currencySymbol } from '../../utils/format';

const empty = () => ({ label: '', category: 'fournitures', amount: '', date: todayISO() });

/** Formulaire unique de saisie d'une charge, création comme modification — sur le modèle de
 *  `ProductModal` du Stock. Sorti de `ExpensesCard` pour que la page Charges et la carte de
 *  Finances ne divergent pas au premier champ ajouté. */
export default function ExpenseModal({ open, onClose, expense }) {
  const { addExpense, updateExpense } = useExpenses();
  const [form, setForm] = useState(empty);

  useEffect(() => {
    setForm(
      expense
        ? { label: expense.label, category: expense.category, amount: String(expense.amount), date: expense.date }
        : empty()
    );
  }, [expense, open]);

  const update = (patch) => setForm((f) => ({ ...f, ...patch }));

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.label.trim() || !form.amount) return;
    const payload = { ...form, label: form.label.trim(), amount: Number(form.amount) };
    if (expense) updateExpense(expense.id, payload);
    else addExpense(payload);
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={expense ? 'Modifier la charge' : 'Nouvelle charge'}
      footer={
        <>
          <button type="button" className="btn btn-ghost" onClick={onClose}>Annuler</button>
          <button type="submit" form="expense-form" className="btn btn-primary">{expense ? 'Enregistrer' : 'Ajouter'}</button>
        </>
      }
    >
      <form id="expense-form" onSubmit={handleSubmit}>
        <div className="field-group">
          <label className="field-label" htmlFor="exp-label">Libellé</label>
          <input id="exp-label" className="input-field" value={form.label} onChange={(e) => update({ label: e.target.value })} placeholder="Loyer, fournitures…" required autoFocus />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div className="field-group">
            <label className="field-label" htmlFor="exp-category">Catégorie</label>
            <select id="exp-category" className="input-field" value={form.category} onChange={(e) => update({ category: e.target.value })}>
              {EXPENSE_CATEGORIES.map((c) => (
                <option key={c.id} value={c.id}>{c.label}</option>
              ))}
            </select>
          </div>
          <div className="field-group">
            <label className="field-label" htmlFor="exp-amount">Montant ({currencySymbol()})</label>
            <input id="exp-amount" type="number" min={0} step={0.01} className="input-field" value={form.amount} onChange={(e) => update({ amount: e.target.value })} required />
          </div>
        </div>
        <div className="field-group" style={{ marginBottom: 0 }}>
          <label className="field-label" htmlFor="exp-date">Date</label>
          <input id="exp-date" type="date" className="input-field" value={form.date} onChange={(e) => update({ date: e.target.value })} required />
        </div>
      </form>
    </Modal>
  );
}
