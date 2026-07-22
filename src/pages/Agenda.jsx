import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import PageHeader from '../components/common/PageHeader';
import Icon from '../components/common/Icon';
import EmptyState from '../components/common/EmptyState';
import DaySelector from '../components/agenda/DaySelector';
import StaffFilter from '../components/agenda/StaffFilter';
import AppointmentCard from '../components/agenda/AppointmentCard';
import WeekView from '../components/agenda/WeekView';
import NewAppointmentModal from '../components/agenda/NewAppointmentModal';
import PaymentModal from '../components/agenda/PaymentModal';
import { useAppointments, enrich, getAppointmentsByDate } from '../hooks/useAppointments';
import { useStaff } from '../hooks/useStaff';
import { addDaysISO, todayISO, formatDateLong, getWeekDays, getWeekStart } from '../utils/date';
import styles from './Agenda.module.css';

export default function Agenda() {
  const location = useLocation();
  const navigate = useNavigate();
  const { appointments, setStatus } = useAppointments();
  const { staff } = useStaff();

  const [selectedDate, setSelectedDate] = useState(todayISO());
  const [staffFilter, setStaffFilter] = useState('all');
  const [viewMode, setViewMode] = useState('day');
  const [modalOpen, setModalOpen] = useState(false);
  const [prefill, setPrefill] = useState(null);
  const [editingAppointment, setEditingAppointment] = useState(null);
  const [completingAppointment, setCompletingAppointment] = useState(null);

  const days = useMemo(() => getWeekDays(addDaysISO(todayISO(), -3), 21), []);

  useEffect(() => {
    const state = location.state;
    if (!state) return;
    if (state.openNew) {
      setPrefill({ clientId: state.clientId, date: state.date, staffId: state.staffId });
      setModalOpen(true);
    }
    if (state.date) setSelectedDate(state.date);
    navigate(location.pathname, { replace: true, state: null });
  }, [location, navigate]);

  const dayAppointments = useMemo(() => {
    const list = getAppointmentsByDate(appointments, selectedDate).map(enrich);
    if (staffFilter === 'all') return list;
    return list.filter((a) => a.staffId === staffFilter);
  }, [appointments, selectedDate, staffFilter]);

  const countFor = (date) => getAppointmentsByDate(appointments, date).filter((a) => a.status !== 'cancelled').length;

  const weekDays = useMemo(() => getWeekDays(getWeekStart(selectedDate), 7), [selectedDate]);

  const closeModal = () => {
    setModalOpen(false);
    setPrefill(null);
    setEditingAppointment(null);
  };

  return (
    <>
      <PageHeader
        title="Agenda"
        subtitle="Gérez les rendez-vous du salon"
        actions={
          <>
            <div className={styles.viewToggle}>
              <button type="button" className={`${styles.viewBtn} ${viewMode === 'day' ? styles.viewBtnActive : ''}`} onClick={() => setViewMode('day')}>
                Jour
              </button>
              <button type="button" className={`${styles.viewBtn} ${viewMode === 'week' ? styles.viewBtnActive : ''}`} onClick={() => setViewMode('week')}>
                Semaine
              </button>
            </div>
            <button type="button" className="btn btn-primary" onClick={() => { setPrefill({ date: selectedDate }); setModalOpen(true); }}>
              <Icon name="plus" size={16} /> Nouveau RDV
            </button>
          </>
        }
      />

      {viewMode === 'day' && <DaySelector days={days} selected={selectedDate} onSelect={setSelectedDate} countFor={countFor} />}
      <StaffFilter staff={staff} selected={staffFilter} onSelect={setStaffFilter} />

      {viewMode === 'week' ? (
        <WeekView
          weekDays={weekDays}
          appointments={appointments}
          staffFilter={staffFilter}
          onSelectDay={(day) => { setSelectedDate(day); setViewMode('day'); }}
        />
      ) : (
        <>
          <div className={styles.dayHeading}>
            <h3 className={styles.dayHeadingTitle}>{formatDateLong(selectedDate)}</h3>
            <span className={styles.dayHeadingCount}>{dayAppointments.length} rendez-vous</span>
          </div>

          {dayAppointments.length === 0 ? (
            <EmptyState icon="calendar" title="Aucun rendez-vous ce jour-là" subtitle="Cliquez sur « Nouveau RDV » pour en planifier un." />
          ) : (
            <div className={styles.list}>
              {dayAppointments.map((apt) => (
                <AppointmentCard
                  key={apt.id}
                  appointment={apt}
                  onStatusChange={setStatus}
                  onEdit={(a) => { setEditingAppointment(a); setModalOpen(true); }}
                  onRequestComplete={setCompletingAppointment}
                />
              ))}
            </div>
          )}
        </>
      )}

      <NewAppointmentModal
        key={editingAppointment?.id ?? `${prefill?.clientId ?? ''}-${prefill?.date ?? selectedDate}-${prefill?.staffId ?? ''}`}
        open={modalOpen}
        onClose={closeModal}
        appointment={editingAppointment}
        defaultDate={prefill?.date ?? selectedDate}
        defaultClientId={prefill?.clientId}
        defaultStaffId={prefill?.staffId}
      />

      <PaymentModal appointment={completingAppointment} onClose={() => setCompletingAppointment(null)} />
    </>
  );
}
