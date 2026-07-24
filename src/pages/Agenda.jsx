import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import PageHeader from '../components/common/PageHeader';
import Icon from '../components/common/Icon';
import EmptyState from '../components/common/EmptyState';
import DaySelector from '../components/agenda/DaySelector';
import AppointmentCard from '../components/agenda/AppointmentCard';
import WeekView from '../components/agenda/WeekView';
import NewAppointmentModal from '../components/agenda/NewAppointmentModal';
import PaymentModal from '../components/agenda/PaymentModal';
import { generateInvoicePdf } from '../utils/invoicePdf';
import { generateDayPlanningPdf } from '../utils/dayPlanningPdf';
import { generateWeekPlanningPdf } from '../utils/weekPlanningPdf';
import { useAppointments, enrich, getAppointmentsByDate } from '../hooks/useAppointments';
import { useSettings } from '../hooks/useSettings';
import { addDaysISO, todayISO, formatDateLong, getWeekDays, getWeekStart } from '../utils/date';
import { generateICS, downloadICS } from '../utils/ical';
import { useToast } from '../hooks/useToast';
import styles from './Agenda.module.css';

export default function Agenda() {
  const location = useLocation();
  const navigate = useNavigate();
  const { appointments, setStatus } = useAppointments();
  const { salon, appearance } = useSettings();
  const { showToast } = useToast();

  const [selectedDate, setSelectedDate] = useState(todayISO());
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
      setPrefill({ clientId: state.clientId, date: state.date });
      setModalOpen(true);
    }
    if (state.date) setSelectedDate(state.date);
    navigate(location.pathname, { replace: true, state: null });
  }, [location, navigate]);

  const dayAppointments = useMemo(
    () => getAppointmentsByDate(appointments, selectedDate).map(enrich),
    [appointments, selectedDate]
  );

  const countFor = (date) => getAppointmentsByDate(appointments, date).filter((a) => a.status !== 'cancelled').length;

  const weekDays = useMemo(() => getWeekDays(getWeekStart(selectedDate), 7), [selectedDate]);

  const weekAppointmentsByDay = useMemo(
    () => weekDays.map((d) => ({ date: d, appointments: getAppointmentsByDate(appointments, d).map(enrich) })),
    [appointments, weekDays]
  );

  const closeModal = () => {
    setModalOpen(false);
    setPrefill(null);
    setEditingAppointment(null);
  };

  const handleExportICS = () => {
    const upcoming = appointments.filter((a) => a.status !== 'cancelled').map(enrich);
    if (upcoming.length === 0) {
      showToast('Aucun rendez-vous à exporter', 'warning');
      return;
    }
    downloadICS(`${salon.name.replace(/\s+/g, '-').toLowerCase()}-agenda.ics`, generateICS(upcoming, salon.name));
    showToast('Fichier iCal téléchargé — importez-le dans Google Calendar ou Outlook', 'success');
  };

  const handlePrintInvoice = (appointment) => {
    generateInvoicePdf(appointment, salon, appearance.themeColor);
  };

  const handlePrintPlanning = () => {
    if (viewMode === 'week') {
      generateWeekPlanningPdf(weekAppointmentsByDay, salon, appearance.themeColor);
    } else {
      generateDayPlanningPdf(selectedDate, dayAppointments, salon, appearance.themeColor);
    }
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
            <button type="button" className="btn btn-ghost" onClick={handlePrintPlanning}>
              <Icon name="download" size={16} /> Télécharger le PDF
            </button>
            <button type="button" className="btn btn-ghost" onClick={handleExportICS}>
              <Icon name="download" size={16} /> iCal
            </button>
            <button type="button" className="btn btn-primary" onClick={() => { setPrefill({ date: selectedDate }); setModalOpen(true); }}>
              <Icon name="plus" size={16} /> Nouveau RDV
            </button>
          </>
        }
      />

      {viewMode === 'day' && <DaySelector days={days} selected={selectedDate} onSelect={setSelectedDate} countFor={countFor} />}

      {viewMode === 'week' ? (
        <WeekView
          weekDays={weekDays}
          appointments={appointments}
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
                  onPrint={handlePrintInvoice}
                />
              ))}
            </div>
          )}
        </>
      )}

      <NewAppointmentModal
        key={editingAppointment?.id ?? `${prefill?.clientId ?? ''}-${prefill?.date ?? selectedDate}`}
        open={modalOpen}
        onClose={closeModal}
        appointment={editingAppointment}
        defaultDate={prefill?.date ?? selectedDate}
        defaultClientId={prefill?.clientId}
      />

      <PaymentModal appointment={completingAppointment} onClose={() => setCompletingAppointment(null)} />
    </>
  );
}
