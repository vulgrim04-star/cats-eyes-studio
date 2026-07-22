import { useState } from 'react';
import Modal from '../common/Modal';
import Icon from '../common/Icon';
import EmptyState from '../common/EmptyState';
import { useExpenses } from '../../hooks/useExpenses';
import { EXPENSE_CATEGORIES } from '../../data/expenses';
import { formatDateShort, todayISO } from '../../utils/date';
import { formatPriceFull } from '../../utils/format';
import styles from './ExpensesCard.module.css';

const EMPTY = { label: '', category: 'fournitures', amount: '', date: todayISO() };

export default function ExpensesCard({ expenses, total, revenueTotal }) {
  const { addExpense, removeExpense } = useExpenses();
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(EMPTY);

  const net = revenueTotal - total;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.label.trim() || !form.amount) return;
    addExpense({ ...form, amount: Number(form.amount) });
    setForm(EMPTY);
    setModalOpen(false);
  };

  return (
    <div className="card">
      <div className={styles.header}>
        <h3 className="card-title">Dépenses & résultat net</h3>
        <button type="button" className="btn btn-secondary btn-sm" onClick={() => setModalOpen(true)}>
          <Icon name="plus" size={13} /> Ajouter
        </button>
      </div>

      <div className={styles.total}>
        <span className={styles.totalValue}>-{formatPriceFull(total)}</span>
        <span style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>{expenses.length} dépense{expenses.length > 1 ? 's' : ''}</span>
      </div>

      <div className={styles.netRow}>
        <span style={{ fontSize: '0.86rem', fontWeight: 600 }}>Résultat net (CA - dépenses)</span>
        <span className={styles.netValue} style={{ color: net >= 0 ? 'var(--color-success)' : 'var(--color-danger)' }}>
          {formatPriceFull(net)}
        </span>
      </div>

      {expenses.length === 0 ? (
        <EmptyState icon="euro" title="Aucune dépense" subtitle="Ajoutez vos charges pour suivre votre résultat net." />
      ) : (
        expenses.map((exp) => (
          <div key={exp.id} className={styles.row}>
            <div>
              <div className={styles.rowLabel}>{exp.label}</div>
              <div className={styles.rowMeta}>
                {EXPENSE_CATEGORIES.find((c) => c.id === exp.category)?.label} · {formatDateShort(exp.date)}
              </div>
            </div>
            <span className={styles.rowAmount}>-{formatPriceFull(exp.amount)}</span>
            <button type="button" className={styles.deleteBtn} onClick={() => removeExpense(exp.id)} aria-label="Supprimer">
              <Icon name="trash" size={12} />
            </button>
          </div>
        ))
      )}

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Nouvelle dépense"
        footer={
          <>
            <button type="button" className="btn btn-ghost" onClick={() => setModalOpen(false)}>Annuler</button>
            <button type="submit" form="expense-form" className="btn btn-primary">Ajouter</button>
          </>
        }
      >
        <form id="expense-form" onSubmit={handleSubmit}>
          <div className="field-group">
            <label className="field-label" htmlFor="exp-label">Libellé</label>
            <input id="exp-label" className="input-field" value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} placeholder="Loyer, fournitures…" autoFocus />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="field-group">
              <label className="field-label" htmlFor="exp-category">Catégorie</label>
              <select id="exp-category" className="input-field" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                {EXPENSE_CATEGORIES.map((c) => (
                  <option key={c.id} value={c.id}>{c.label}</option>
                ))}
              </select>
            </div>
            <div className="field-group">
              <label className="field-label" htmlFor="exp-amount">Montant</label>
              <input id="exp-amount" type="number" min={0} step={0.01} className="input-field" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
            </div>
          </div>
          <div className="field-group" style={{ marginBottom: 0 }}>
            <label className="field-label" htmlFor="exp-date">Date</label>
            <input id="exp-date" type="date" className="input-field" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
          </div>
        </form>
      </Modal>
    </div>
  );
}
