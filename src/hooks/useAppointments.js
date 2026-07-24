import { useAppointmentsStore } from '../store/useAppointmentsStore';
import { useUIStore } from '../store/useUIStore';
import { useClientsStore } from '../store/useClientsStore';
import { useSettingsStore } from '../store/useSettingsStore';
import { useAuthStore } from '../store/useAuthStore';
import { getServiceById } from '../data/services';
import { todayISO, timeToMinutes } from '../utils/date';

// Best-effort : ne doit jamais faire échouer la création du RDV en cas de souci d'envoi.
function sendConfirmationEmail(ownerId, appointment, serviceName) {
  fetch('/api/send-confirmation-email', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ownerId,
      clientId: appointment.clientId,
      serviceName,
      date: appointment.date,
      time: appointment.time,
    }),
  }).catch((err) => console.error('[useAppointments] sendConfirmationEmail failed', err));
}

// Les clientes peuvent être créées dynamiquement (réservation en ligne, nouvelle fiche) :
// on résout toujours via le store live plutôt que le jeu de données statique.
function getClientById(id) {
  return useClientsStore.getState().clients.find((c) => c.id === id);
}

/**
 * Couche d'accès aux données de rendez-vous. Découplée du store interne
 * pour permettre un branchement futur sur une API sans changer les appelants.
 */
export function useAppointments() {
  const appointments = useAppointmentsStore((s) => s.appointments);
  const addAppointment = useAppointmentsStore((s) => s.addAppointment);
  const updateAppointment = useAppointmentsStore((s) => s.updateAppointment);
  const setStatus = useAppointmentsStore((s) => s.setStatus);
  const removeAppointment = useAppointmentsStore((s) => s.removeAppointment);
  const findOverlap = useAppointmentsStore((s) => s.findOverlap);
  const showToast = useUIStore((s) => s.showToast);
  const notifications = useSettingsStore((s) => s.notifications);
  const ownerId = useAuthStore((s) => s.session?.user?.id);

  const create = (data) => {
    const overlap = findOverlap(data);
    if (overlap) {
      const client = getClientById(overlap.clientId);
      showToast(`Créneau indisponible : conflit avec ${client?.firstName ?? 'un autre RDV'} à ${overlap.time}`, 'error');
      return null;
    }
    const appointment = addAppointment(data);
    const client = getClientById(appointment.clientId);
    const willEmail = notifications.autoConfirm && !!client?.email;
    if (willEmail) {
      sendConfirmationEmail(ownerId, appointment, getServiceById(appointment.serviceId)?.name);
    }
    const confirmationNote = willEmail
      ? '— confirmation envoyée par e-mail'
      : notifications.autoConfirm
        ? '(pas d\'e-mail enregistré pour cette cliente)'
        : '(confirmation automatique désactivée dans les paramètres)';
    showToast(`RDV créé pour ${client?.firstName ?? 'la cliente'} ${confirmationNote}`, 'success');
    return appointment;
  };

  const reschedule = (id, data) => {
    const overlap = findOverlap({ ...data, excludeId: id });
    if (overlap) {
      const client = getClientById(overlap.clientId);
      showToast(`Créneau indisponible : conflit avec ${client?.firstName ?? 'un autre RDV'} à ${overlap.time}`, 'error');
      return false;
    }
    updateAppointment(id, data);
    showToast('Rendez-vous modifié', 'success');
    return true;
  };

  const changeStatus = (id, status) => {
    setStatus(id, status);
    const labels = {
      confirmed: 'confirmé',
      completed: 'marqué terminé',
      cancelled: 'annulé',
      'no-show': 'marqué no-show',
      pending: 'remis en attente',
    };
    showToast(`Rendez-vous ${labels[status] ?? status}`, status === 'no-show' || status === 'cancelled' ? 'warning' : 'success');
  };

  return {
    appointments,
    addAppointment: create,
    updateAppointment,
    reschedule,
    setStatus: changeStatus,
    removeAppointment,
    findOverlap,
  };
}

export function enrich(appointment) {
  if (!appointment) return null;
  return {
    ...appointment,
    client: getClientById(appointment.clientId),
    service: getServiceById(appointment.serviceId),
  };
}

export function getAppointmentsByDate(appointments, date) {
  return appointments
    .filter((a) => a.date === date)
    .sort((a, b) => timeToMinutes(a.time) - timeToMinutes(b.time));
}

export function getAppointmentsByClient(appointments, clientId) {
  return appointments
    .filter((a) => a.clientId === clientId)
    .sort((a, b) => (a.date + a.time < b.date + b.time ? 1 : -1));
}

export function getTodayAppointments(appointments) {
  return getAppointmentsByDate(appointments, todayISO());
}

export function getNextAppointment(appointments) {
  const today = todayISO();
  const now = new Date();
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  return appointments
    .filter((a) => a.status !== 'cancelled' && a.status !== 'no-show' && a.status !== 'completed')
    .filter((a) => a.date > today || (a.date === today && timeToMinutes(a.time) >= nowMinutes))
    .sort((a, b) => (a.date + a.time > b.date + b.time ? 1 : -1))[0];
}

export function getPendingAppointments(appointments) {
  return appointments.filter((a) => a.status === 'pending');
}
