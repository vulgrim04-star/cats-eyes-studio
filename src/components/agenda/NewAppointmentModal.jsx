import { useEffect, useMemo, useState } from 'react';
import Modal from '../common/Modal';
import Icon from '../common/Icon';
import { useAppointments } from '../../hooks/useAppointments';
import { useClients } from '../../hooks/useClients';
import { useServices, groupByCategory } from '../../hooks/useServices';
import { useSettings } from '../../hooks/useSettings';
import { SERVICE_CATEGORIES } from '../../data/services';
import { formatDuration, formatPrice, fullName } from '../../utils/format';
import { addDaysISO, todayISO } from '../../utils/date';
import { availableSlots } from '../../utils/booking';
import { useToast } from '../../hooks/useToast';

export default function NewAppointmentModal({ open, onClose, appointment, defaultDate, defaultClientId }) {
  const { appointments, addAppointment, reschedule } = useAppointments();
  const { clients } = useClients();
  const { services } = useServices();
  const { salon } = useSettings();
  const { showToast } = useToast();
  const grouped = useMemo(() => groupByCategory(services), [services]);
  const isEdit = Boolean(appointment);
  const [customTime, setCustomTime] = useState(false);

  const [form, setForm] = useState(() => ({
    clientId: defaultClientId ?? '',
    serviceId: '',
    date: defaultDate ?? todayISO(),
    time: '10:00',
    notes: '',
  }));
  const [recurring, setRecurring] = useState(false);
  const [recurWeeks, setRecurWeeks] = useState(3);
  const [recurCount, setRecurCount] = useState(4);

  useEffect(() => {
    if (appointment) {
      setForm({
        clientId: appointment.clientId,
        serviceId: appointment.serviceId,
        date: appointment.date,
        time: appointment.time,
        notes: appointment.notes ?? '',
      });
    }
  }, [appointment]);

  const selectedService = services.find((s) => s.id === form.serviceId);

  const otherAppointments = useMemo(
    () => appointments.filter((a) => a.id !== appointment?.id),
    [appointments, appointment]
  );
  const slots = useMemo(() => {
    if (!selectedService || !form.date) return [];
    return availableSlots(otherAppointments, form.date, selectedService.duration, salon);
  }, [otherAppointments, form.date, selectedService, salon]);

  const update = (patch) => setForm((f) => ({ ...f, ...patch }));

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.clientId || !form.serviceId || !form.date || !form.time) return;
    const payload = {
      clientId: form.clientId,
      serviceId: form.serviceId,
      date: form.date,
      time: form.time,
      duration: selectedService.duration,
      price: selectedService.price,
      notes: form.notes,
    };
    if (isEdit) {
      if (reschedule(appointment.id, payload)) onClose();
      return;
    }
    const result = addAppointment({ ...payload, status: 'pending' });
    if (!result) return;

    if (recurring && recurCount > 1) {
      let created = 1;
      for (let i = 1; i < recurCount; i += 1) {
        const occurrence = addAppointment({
          ...payload,
          date: addDaysISO(form.date, i * recurWeeks * 7),
          status: 'pending',
        });
        if (occurrence) created += 1;
      }
      showToast(`Série créée : ${created} rendez-vous programmés toutes les ${recurWeeks} semaines`, 'success');
    }

    onClose();
    setForm({ clientId: '', serviceId: '', date: todayISO(), time: '10:00', notes: '' });
    setRecurring(false);
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? 'Modifier le rendez-vous' : 'Nouveau rendez-vous'}
      footer={
        <>
          <button type="button" className="btn btn-ghost" onClick={onClose}>Annuler</button>
          <button type="submit" form="new-appointment-form" className="btn btn-primary">
            {isEdit ? 'Enregistrer' : 'Créer le RDV'}
          </button>
        </>
      }
    >
      <form id="new-appointment-form" onSubmit={handleSubmit}>
        <div className="field-group">
          <label className="field-label" htmlFor="apt-client">Cliente</label>
          <select id="apt-client" className="input-field" value={form.clientId} onChange={(e) => update({ clientId: e.target.value })} required>
            <option value="">Sélectionner une cliente</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>{fullName(c)}</option>
            ))}
          </select>
        </div>

        <div className="field-group">
          <label className="field-label" htmlFor="apt-service">Prestation</label>
          <select id="apt-service" className="input-field" value={form.serviceId} onChange={(e) => update({ serviceId: e.target.value })} required>
            <option value="">Sélectionner une prestation</option>
            {SERVICE_CATEGORIES.map((cat) => (
              <optgroup key={cat.id} label={cat.label}>
                {(grouped[cat.id] ?? []).map((s) => (
                  <option key={s.id} value={s.id}>{s.name} — {formatPrice(s.price)}</option>
                ))}
              </optgroup>
            ))}
          </select>
          {selectedService && (
            <p style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', marginTop: 6 }}>
              Durée {formatDuration(selectedService.duration)} · {formatPrice(selectedService.price)} (calculé automatiquement)
            </p>
          )}
        </div>

        <div className="field-group">
          <label className="field-label" htmlFor="apt-date">Date</label>
          <input id="apt-date" type="date" className="input-field" value={form.date} onChange={(e) => update({ date: e.target.value })} required />
        </div>

        <div className="field-group">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <label className="field-label" style={{ marginBottom: 0 }}>Heure</label>
            <button
              type="button"
              onClick={() => setCustomTime((v) => !v)}
              style={{ background: 'none', border: 'none', fontSize: '0.74rem', fontWeight: 600, color: 'var(--color-rose-dark)' }}
            >
              {customTime ? 'Voir les créneaux libres' : 'Saisir une heure manuellement'}
            </button>
          </div>

          {customTime ? (
            <input id="apt-time" type="time" className="input-field" value={form.time} onChange={(e) => update({ time: e.target.value })} required />
          ) : !selectedService ? (
            <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginTop: 6 }}>
              Choisissez une prestation pour voir les créneaux libres.
            </p>
          ) : slots.length === 0 ? (
            <p style={{ fontSize: '0.8rem', color: 'var(--color-danger)', marginTop: 6 }}>
              <Icon name="alert-triangle" size={13} /> Aucun créneau libre ce jour-là. Choisissez une autre date, ou saisissez une heure manuellement.
            </p>
          ) : (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
              {slots.map((s) => (
                <button
                  key={s.time}
                  type="button"
                  className={`btn btn-sm ${form.time === s.time ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => update({ time: s.time })}
                >
                  {s.time}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="field-group">
          <label className="field-label" htmlFor="apt-notes">Notes (optionnel)</label>
          <textarea id="apt-notes" className="input-field" rows={3} value={form.notes} onChange={(e) => update({ notes: e.target.value })} />
        </div>

        {!isEdit && (
          <div className="field-group" style={{ marginBottom: 0 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.86rem', fontWeight: 600, marginBottom: recurring ? 10 : 0 }}>
              <input type="checkbox" checked={recurring} onChange={(e) => setRecurring(e.target.checked)} />
              Répéter ce rendez-vous
            </label>
            {recurring && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label className="field-label" htmlFor="apt-recur-weeks">Toutes les</label>
                  <select id="apt-recur-weeks" className="input-field" value={recurWeeks} onChange={(e) => setRecurWeeks(Number(e.target.value))}>
                    <option value={2}>2 semaines</option>
                    <option value={3}>3 semaines</option>
                    <option value={4}>4 semaines</option>
                  </select>
                </div>
                <div>
                  <label className="field-label" htmlFor="apt-recur-count">Nombre de séances</label>
                  <input
                    id="apt-recur-count"
                    type="number"
                    min={2}
                    max={12}
                    className="input-field"
                    value={recurCount}
                    onChange={(e) => setRecurCount(Number(e.target.value))}
                  />
                </div>
              </div>
            )}
          </div>
        )}
      </form>
    </Modal>
  );
}
