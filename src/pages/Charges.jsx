import { useMemo, useState } from 'react';
import PageHeader from '../components/common/PageHeader';
import Icon from '../components/common/Icon';
import EmptyState from '../components/common/EmptyState';
import ExpenseModal from '../components/finances/ExpenseModal';
import { useExpenses, expensesInRange } from '../hooks/useExpenses';
import { useAppointments } from '../hooks/useAppointments';
import { EXPENSE_CATEGORIES } from '../data/expenses';
import { revenueInRange } from '../utils/finance';
import { addDaysISO, formatDateShort, todayISO } from '../utils/date';
import { monthPrefix } from '../utils/stats';
import { formatPriceFull } from '../utils/format';
import styles from './Charges.module.css';

const PERIODS = [
  { id: 'day', label: 'Jour' },
  { id: 'week', label: 'Semaine' },
  { id: 'month', label: 'Mois' },
  { id: 'all', label: 'Tout' },
];

export default function Charges() {
  const { expenses, removeExpense } = useExpenses();
  const { appointments } = useAppointments();
  const [period, setPeriod] = useState('month');
  const [category, setCategory] = useState('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const today = todayISO();

  const range = useMemo(() => {
    if (period === 'day') return [today, today];
    if (period === 'week') return [addDaysISO(today, -6), today];
    if (period === 'month') return [`${monthPrefix(0)}-01`, `${monthPrefix(0)}-31`];
    // « Tout » : des bornes assez larges pour englober l'historique comme les charges
    // saisies à l'avance (un loyer du mois prochain, par exemple).
    return ['0000-01-01', '9999-12-31'];
  }, [period, today]);

  const periodExpenses = useMemo(
    () => expensesInRange(expenses, range[0], range[1]).slice().sort((a, b) => (a.date < b.date ? 1 : -1)),
    [expenses, range]
  );
  const total = useMemo(() => periodExpenses.reduce((sum, e) => sum + Number(e.amount ?? 0), 0), [periodExpenses]);
  const revenue = useMemo(() => revenueInRange(appointments, range[0], range[1]), [appointments, range]);
  const net = revenue - total;

  const filtered = useMemo(
    () => (category === 'all' ? periodExpenses : periodExpenses.filter((e) => e.category === category)),
    [periodExpenses, category]
  );

  const openNew = () => {
    setEditing(null);
    setModalOpen(true);
  };

  const openEdit = (expense) => {
    setEditing(expense);
    setModalOpen(true);
  };

  const handleDelete = (expense) => {
    if (window.confirm(`Supprimer la charge « ${expense.label} » ? Cette action est irréversible.`)) {
      removeExpense(expense.id);
    }
  };

  return (
    <>
      <PageHeader
        title="Charges"
        subtitle="Loyer, fournitures, marketing — tout ce qui sort de la caisse"
        actions={
          <button type="button" className="btn btn-primary" onClick={openNew}>
            <Icon name="plus" size={16} /> Nouvelle charge
          </button>
        }
      />

      <div className={styles.filters}>
        {PERIODS.map((p) => (
          <button
            key={p.id}
            type="button"
            className={`${styles.pill} ${period === p.id ? styles.pillActive : ''}`}
            onClick={() => setPeriod(p.id)}
          >
            {p.label}
          </button>
        ))}
      </div>

      <div className={styles.summary}>
        <div className={styles.tile}>
          <span className={styles.tileLabel}>Charges</span>
          {/* Pas de signe devant un zéro : « -0.00 CHF » se lit comme une anomalie de calcul
              là où il n'y a simplement aucune charge sur la période. */}
          <span className={styles.tileValue} style={{ color: total > 0 ? 'var(--color-danger)' : 'var(--color-text)' }}>
            {total > 0 ? '-' : ''}{formatPriceFull(total)}
          </span>
        </div>
        <div className={styles.tile}>
          <span className={styles.tileLabel}>Chiffre d'affaires</span>
          <span className={styles.tileValue}>{formatPriceFull(revenue)}</span>
        </div>
        <div className={styles.tile}>
          <span className={styles.tileLabel}>Résultat net</span>
          <span className={styles.tileValue} style={{ color: net >= 0 ? 'var(--color-success)' : 'var(--color-danger)' }}>
            {formatPriceFull(net)}
          </span>
        </div>
      </div>

      <div className={`${styles.filters} scrollbar-hidden`}>
        <button type="button" className={`${styles.pill} ${category === 'all' ? styles.pillActive : ''}`} onClick={() => setCategory('all')}>
          Toutes
        </button>
        {EXPENSE_CATEGORIES.map((c) => (
          <button
            key={c.id}
            type="button"
            className={`${styles.pill} ${category === c.id ? styles.pillActive : ''}`}
            onClick={() => setCategory(c.id)}
          >
            {c.label}
          </button>
        ))}
      </div>

      <div className="card">
        {filtered.length === 0 ? (
          <EmptyState
            icon="trending-down"
            title="Aucune charge sur cette période"
            subtitle="Enregistre tes dépenses pour suivre ton résultat net et les retrouver dans l'export CSV des finances."
          />
        ) : (
          filtered.map((expense) => (
            <div key={expense.id} className={styles.row}>
              <div className={styles.rowMain}>
                <div className={styles.rowLabel}>{expense.label}</div>
                <div className={styles.rowMeta}>
                  {EXPENSE_CATEGORIES.find((c) => c.id === expense.category)?.label ?? expense.category} · {formatDateShort(expense.date)}
                </div>
              </div>
              <span className={styles.rowAmount}>-{formatPriceFull(expense.amount)}</span>
              <button type="button" className={styles.iconBtn} onClick={() => openEdit(expense)} aria-label={`Modifier ${expense.label}`}>
                <Icon name="edit" size={14} />
              </button>
              <button
                type="button"
                className={`${styles.iconBtn} ${styles.deleteBtn}`}
                onClick={() => handleDelete(expense)}
                aria-label={`Supprimer ${expense.label}`}
              >
                <Icon name="trash" size={14} />
              </button>
            </div>
          ))
        )}
      </div>

      <ExpenseModal open={modalOpen} onClose={() => setModalOpen(false)} expense={editing} />
    </>
  );
}
