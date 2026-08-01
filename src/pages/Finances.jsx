import { useMemo, useState } from 'react';
import PageHeader from '../components/common/PageHeader';
import Icon from '../components/common/Icon';
import CashRegister from '../components/finances/CashRegister';
import RevenueChart from '../components/finances/RevenueChart';
import RevenueByService from '../components/finances/RevenueByService';
import ExpensesCard from '../components/finances/ExpensesCard';
import { useAppointments, enrich, getAppointmentsByDate } from '../hooks/useAppointments';
import { useExpenses, expensesInRange, totalExpenses } from '../hooks/useExpenses';
import { useToast } from '../hooks/useToast';
import { dailySeries, revenueInRange, revenueByCategory, completedInRange } from '../utils/finance';
import { addDaysISO, todayISO } from '../utils/date';
import { monthPrefix } from '../utils/stats';
import { downloadCsv } from '../utils/csv';
import { buildFinanceExport } from '../utils/financeExport';
import { currencySymbol } from '../utils/format';
import { collectedTotal } from '../utils/billing';
import styles from './Finances.module.css';

const PERIODS = [
  { id: 'day', label: 'Jour' },
  { id: 'week', label: 'Semaine' },
  { id: 'month', label: 'Mois' },
];

export default function Finances() {
  const { appointments } = useAppointments();
  const { expenses } = useExpenses();
  const { showToast } = useToast();
  const [period, setPeriod] = useState('week');
  const today = todayISO();

  const todayCompleted = useMemo(
    () => getAppointmentsByDate(appointments, today).filter((a) => a.status === 'completed').map(enrich),
    [appointments, today]
  );
  // La caisse compte l'argent encaissé, pourboires compris — à la différence du chiffre
  // d'affaires affiché juste à côté, qui les exclut.
  const cashToday = todayCompleted.reduce((sum, a) => sum + collectedTotal(a), 0);

  const range = useMemo(() => {
    if (period === 'day') return [today, today];
    if (period === 'month') return [`${monthPrefix(0)}-01`, `${monthPrefix(0)}-31`];
    return [addDaysISO(today, -6), today];
  }, [period, today]);

  const periodData = useMemo(() => {
    if (period === 'day') {
      return { series: dailySeries(appointments, 1), total: revenueInRange(appointments, range[0], range[1]), label: "Aujourd'hui" };
    }
    if (period === 'month') {
      return { series: dailySeries(appointments, 30), total: revenueInRange(appointments, range[0], addDaysISO(today, 60)), label: 'Ce mois-ci' };
    }
    return { series: dailySeries(appointments, 7), total: revenueInRange(appointments, range[0], range[1]), label: '7 derniers jours' };
  }, [appointments, period, range, today]);

  const categoryRows = useMemo(() => revenueByCategory(appointments, range[0], range[1]), [appointments, range]);

  const periodExpenses = useMemo(() => expensesInRange(expenses, range[0], range[1]), [expenses, range]);
  const periodExpensesTotal = useMemo(() => totalExpenses(expenses, range[0], range[1]), [expenses, range]);

  const handleExport = () => {
    const done = completedInRange(appointments, range[0], range[1]).map(enrich);
    // Une période sans rendez-vous mais avec un loyer reste exportable : c'est justement le
    // mois qu'on veut pouvoir montrer. On ne refuse que le fichier réellement vide.
    if (done.length === 0 && periodExpenses.length === 0) {
      showToast('Aucune prestation ni charge sur cette période', 'warning');
      return;
    }
    const { header, rows } = buildFinanceExport(done, periodExpenses, currencySymbol());
    // Le nom ne dit plus « ca » : le fichier porte désormais les charges et le résultat net.
    downloadCsv(`cats-eyes-finances-${range[0]}_${range[1]}.csv`, header, rows);
    showToast(`Export CSV téléchargé (${done.length} prestation(s), ${periodExpenses.length} charge(s))`, 'success');
  };

  return (
    <>
      <PageHeader
        title="Finances"
        subtitle="Suivi du chiffre d'affaires du salon"
        actions={
          <button type="button" className="btn btn-secondary" onClick={handleExport}>
            <Icon name="download" size={16} /> Exporter CSV
          </button>
        }
      />

      <div className={styles.periodRow}>
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

      <div className={styles.grid}>
        <div className={styles.stack}>
          <RevenueChart series={periodData.series} total={periodData.total} label={periodData.label} />
          <RevenueByService rows={categoryRows} />
          <ExpensesCard expenses={periodExpenses} total={periodExpensesTotal} revenueTotal={periodData.total} />
        </div>
        <CashRegister appointments={todayCompleted} total={cashToday} />
      </div>
    </>
  );
}
