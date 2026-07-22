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
import { fullName } from '../utils/format';
import { PAYMENT_LABELS } from '../components/agenda/PaymentModal';
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
  const cashToday = todayCompleted.reduce((sum, a) => sum + a.price, 0);

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
    const rows = completedInRange(appointments, range[0], range[1])
      .map(enrich)
      .sort((a, b) => (a.date + a.time > b.date + b.time ? 1 : -1))
      .map((apt) => [
        apt.date,
        apt.time,
        apt.client ? fullName(apt.client) : '',
        apt.service?.name ?? '',
        apt.staff?.name ?? '',
        apt.price,
        PAYMENT_LABELS[apt.paymentMethod] ?? '',
      ]);
    if (rows.length === 0) {
      showToast('Aucune prestation terminée sur cette période', 'warning');
      return;
    }
    downloadCsv(
      `cats-eyes-ca-${range[0]}_${range[1]}.csv`,
      ['Date', 'Heure', 'Cliente', 'Prestation', 'Esthéticienne', 'Prix (€)', 'Paiement'],
      rows
    );
    showToast(`Export CSV téléchargé (${rows.length} lignes)`, 'success');
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
