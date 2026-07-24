import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import PageHeader from '../components/common/PageHeader';
import KpiCard from '../components/dashboard/KpiCard';
import AlertsPanel from '../components/dashboard/AlertsPanel';
import TopServices from '../components/dashboard/TopServices';
import WinBackList from '../components/dashboard/WinBackList';
import WaitlistCard from '../components/dashboard/WaitlistCard';
import BookingRequestsCard from '../components/dashboard/BookingRequestsCard';
import AppointmentCard from '../components/agenda/AppointmentCard';
import PaymentModal from '../components/agenda/PaymentModal';
import EmptyState from '../components/common/EmptyState';
import Icon from '../components/common/Icon';
import { useAppointments, enrich, getAppointmentsByDate, getNextAppointment, getPendingAppointments } from '../hooks/useAppointments';
import { useClients } from '../hooks/useClients';
import { useProducts, lowStockProducts } from '../hooks/useProducts';
import { useSettings } from '../hooks/useSettings';
import {
  revenueForDate,
  trendPercent,
  activeClientsCount,
  monthPrefix,
  appointmentsInMonth,
  topServicesThisMonth,
} from '../utils/stats';
import { addDaysISO, todayISO, formatDateLong, addMinutesToTime } from '../utils/date';
import { formatPriceFull, fullName } from '../utils/format';
import { upcomingBirthdays } from '../utils/birthday';
import { winBackList } from '../utils/retention';
import styles from './Dashboard.module.css';

export default function Dashboard() {
  const navigate = useNavigate();
  const { appointments, setStatus } = useAppointments();
  const { clients } = useClients();
  const { products } = useProducts();
  const { salon } = useSettings();
  const [completingAppointment, setCompletingAppointment] = useState(null);

  const today = todayISO();
  const yesterday = addDaysISO(today, -1);

  const stats = useMemo(() => {
    const todayAppts = getAppointmentsByDate(appointments, today).filter((a) => a.status !== 'cancelled');
    const yesterdayAppts = getAppointmentsByDate(appointments, yesterday).filter((a) => a.status !== 'cancelled');

    const caToday = revenueForDate(appointments, today);
    const caYesterday = revenueForDate(appointments, yesterday);

    const activeThisPeriod = activeClientsCount(clients, appointments);

    const monthAppts = appointmentsInMonth(appointments, monthPrefix(0));
    const prevMonthAppts = appointmentsInMonth(appointments, monthPrefix(-1));

    return {
      todayCount: todayAppts.length,
      yesterdayCount: yesterdayAppts.length,
      caToday,
      caYesterday,
      activeThisPeriod,
      monthCount: monthAppts.length,
      prevMonthCount: prevMonthAppts.length,
    };
  }, [appointments, clients, today, yesterday]);

  const todayList = useMemo(
    () => getAppointmentsByDate(appointments, today).map(enrich),
    [appointments, today]
  );

  const nextAppointment = useMemo(() => enrich(getNextAppointment(appointments)), [appointments]);

  const alerts = useMemo(
    () => ({
      lowStock: lowStockProducts(products),
      pending: getPendingAppointments(appointments).map(enrich).slice(0, 4),
      birthdays: upcomingBirthdays(clients, 7),
    }),
    [products, appointments, clients]
  );

  const topServices = useMemo(() => topServicesThisMonth(appointments, 5), [appointments]);
  const winBackRows = useMemo(() => winBackList(clients, appointments), [clients, appointments]);

  return (
    <>
      <PageHeader
        title={`Bonjour, ${salon.managerName.split(' ')[0]}`}
        subtitle={formatDateLong(today)}
        actions={
          <button type="button" className="btn btn-primary" onClick={() => navigate('/agenda', { state: { openNew: true } })}>
            <Icon name="plus" size={16} /> Nouveau RDV
          </button>
        }
      />

      <div className={styles.kpiGrid}>
        <KpiCard
          icon="calendar"
          label="RDV du jour"
          value={stats.todayCount}
          trend={trendPercent(stats.todayCount, stats.yesterdayCount)}
          trendLabel="vs hier"
        />
        <KpiCard
          icon="euro"
          iconColor="var(--color-success)"
          iconBg="var(--color-success-bg)"
          label="CA du jour"
          value={formatPriceFull(stats.caToday)}
          trend={trendPercent(stats.caToday, stats.caYesterday)}
          trendLabel="vs hier"
        />
        <KpiCard
          icon="users"
          iconColor="var(--color-info)"
          iconBg="var(--color-info-bg)"
          label="Clientes actives"
          value={stats.activeThisPeriod}
        />
        <KpiCard
          icon="sparkles"
          iconColor="var(--color-warning)"
          iconBg="var(--color-warning-bg)"
          label="RDV du mois"
          value={stats.monthCount}
          trend={trendPercent(stats.monthCount, stats.prevMonthCount)}
          trendLabel="vs mois dernier"
        />
      </div>

      <div className={styles.layout}>
        <div className={styles.mainCol}>
          {nextAppointment && (
            <div className={styles.nextCard}>
              <div className={styles.nextLabel}>Prochain rendez-vous</div>
              <div className={styles.nextTop}>
                <span className={styles.nextName}>{nextAppointment.client ? fullName(nextAppointment.client) : 'Cliente'}</span>
                <span className={styles.nextTime}>{nextAppointment.time}</span>
              </div>
              <div className={styles.nextService}>{nextAppointment.service?.name}</div>
              <div className={styles.nextMeta}>
                <span>{nextAppointment.date === today ? "Aujourd'hui" : nextAppointment.date}</span>
                <span>Jusqu'à {addMinutesToTime(nextAppointment.time, nextAppointment.duration)}</span>
              </div>
            </div>
          )}

          <div className="card">
            <div className={styles.sectionHead}>
              <h3 className="card-title">Agenda du jour</h3>
              <button type="button" className={styles.link} onClick={() => navigate('/agenda')}>
                Voir tout
              </button>
            </div>
            {todayList.length === 0 ? (
              <EmptyState icon="calendar" title="Aucun rendez-vous aujourd'hui" subtitle="Profitez-en pour faire le point sur le stock ou le catalogue." />
            ) : (
              <div className={styles.agendaList}>
                {todayList.map((apt) => (
                  <AppointmentCard key={apt.id} appointment={apt} onStatusChange={setStatus} onRequestComplete={setCompletingAppointment} />
                ))}
              </div>
            )}
          </div>
        </div>

        <div className={styles.sideCol}>
          <AlertsPanel lowStock={alerts.lowStock} pendingAppointments={alerts.pending} birthdays={alerts.birthdays} />
          <BookingRequestsCard />
          <WaitlistCard />
          <WinBackList rows={winBackRows} />
          <TopServices rows={topServices} />
        </div>
      </div>

      <PaymentModal appointment={completingAppointment} onClose={() => setCompletingAppointment(null)} />
    </>
  );
}
