import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Icon from '../components/common/Icon';
import BrandMark from '../components/common/BrandMark';
import WaitlistModal from '../components/common/WaitlistModal';
import ToastContainer from '../components/common/ToastContainer';
import { useServices, groupByCategory } from '../hooks/useServices';
import { useClients } from '../hooks/useClients';
import { useAppointments } from '../hooks/useAppointments';
import { useSettings, WEEK_DAYS } from '../hooks/useSettings';
import { useToast } from '../hooks/useToast';
import { SERVICE_CATEGORIES } from '../data/services';
import { availableSlots, daySchedule } from '../utils/booking';
import { fetchPublicSalonConfig, fetchPublicAppointmentsForDate, submitBookingRequest } from '../utils/publicBooking';
import { addDaysISO, formatDateLong, formatDayLabel, formatDayNumber, todayISO } from '../utils/date';
import { formatDuration, formatPrice } from '../utils/format';
import { topServicesThisMonth } from '../utils/stats';
import styles from './Booking.module.css';

const NEXT_DAYS = Array.from({ length: 14 }, (_, i) => addDaysISO(todayISO(), i));
const DAY_LABELS = { lun: 'Lundi', mar: 'Mardi', mer: 'Mercredi', jeu: 'Jeudi', ven: 'Vendredi', sam: 'Samedi', dim: 'Dimanche' };

export default function Booking() {
  const navigate = useNavigate();
  const { ownerId } = useParams();
  const isPublic = Boolean(ownerId);
  const { showToast } = useToast();

  const { services: localServices } = useServices();
  const { clients, addClient } = useClients();
  const { appointments: localAppointments, addAppointment, setStatus } = useAppointments();
  const { salon: localSalon } = useSettings();

  const [publicSalon, setPublicSalon] = useState(null);
  const [publicServices, setPublicServices] = useState([]);
  const [publicConfigLoaded, setPublicConfigLoaded] = useState(false);
  const [publicDateAppointments, setPublicDateAppointments] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  const [step, setStep] = useState(0);
  const [serviceId, setServiceId] = useState('');
  const [date, setDate] = useState(todayISO());
  const [slot, setSlot] = useState(null);
  const [contact, setContact] = useState({ firstName: '', lastName: '', phone: '', email: '' });
  const [confirmedAppointment, setConfirmedAppointment] = useState(null);
  const [cancelled, setCancelled] = useState(false);
  const [waitlistOpen, setWaitlistOpen] = useState(false);

  useEffect(() => {
    if (!isPublic) return;
    let cancelledEffect = false;
    fetchPublicSalonConfig(ownerId).then(({ salon, services }) => {
      if (cancelledEffect) return;
      setPublicSalon(salon);
      setPublicServices(services);
      setPublicConfigLoaded(true);
    });
    return () => { cancelledEffect = true; };
  }, [isPublic, ownerId]);

  useEffect(() => {
    if (!isPublic) return;
    let cancelledEffect = false;
    fetchPublicAppointmentsForDate(ownerId, date).then((rows) => {
      if (!cancelledEffect) setPublicDateAppointments(rows);
    });
    return () => { cancelledEffect = true; };
  }, [isPublic, ownerId, date]);

  const salon = isPublic ? publicSalon : localSalon;
  const services = isPublic ? publicServices : localServices;
  const appointmentsForSlots = isPublic ? publicDateAppointments : localAppointments;

  const grouped = useMemo(() => groupByCategory(services), [services]);
  const featured = useMemo(() => (isPublic ? [] : topServicesThisMonth(localAppointments, 3)), [isPublic, localAppointments]);

  const service = services.find((s) => s.id === serviceId);
  const realSlots = useMemo(
    () => (service && salon ? availableSlots(appointmentsForSlots, date, service.duration, salon) : []),
    [service, date, appointmentsForSlots, salon]
  );
  const closedToday = !salon || !daySchedule(salon, date) || daySchedule(salon, date).closed;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!contact.firstName || !contact.lastName || !contact.phone || !slot) return;

    if (isPublic) {
      setSubmitting(true);
      const ok = await submitBookingRequest(ownerId, {
        first_name: contact.firstName,
        last_name: contact.lastName,
        phone: contact.phone,
        email: contact.email,
        service_id: service.id,
        service_name: service.name,
        duration: service.duration,
        price: service.price,
        date,
        time: slot.time,
        notes: 'Réservation en ligne',
      });
      setSubmitting(false);
      if (ok) {
        setConfirmedAppointment({ service, date, time: slot.time });
        setCancelled(false);
        setStep(4);
      } else {
        showToast("Une erreur est survenue, réessayez dans un instant.", 'error');
      }
      return;
    }

    let client = clients.find((c) => c.phone.replace(/\s/g, '') === contact.phone.replace(/\s/g, ''));
    if (!client) {
      client = addClient({ ...contact, notes: 'Cliente inscrite via l\'espace de réservation en ligne.' });
    }

    const appointment = addAppointment({
      clientId: client.id,
      serviceId: service.id,
      date,
      time: slot.time,
      duration: service.duration,
      price: service.price,
      notes: 'Réservation en ligne',
      status: 'pending',
    });

    if (appointment) {
      setConfirmedAppointment({ ...appointment, client, service });
      setCancelled(false);
      setStep(4);
    } else {
      setSlot(null);
      setStep(2);
    }
  };

  const reset = () => {
    setStep(0);
    setServiceId('');
    setDate(todayISO());
    setSlot(null);
    setContact({ firstName: '', lastName: '', phone: '', email: '' });
    setConfirmedAppointment(null);
    setCancelled(false);
  };

  const handleCancel = () => {
    if (!confirmedAppointment || isPublic) return;
    setStatus(confirmedAppointment.id, 'cancelled');
    setCancelled(true);
  };

  if (isPublic && !publicConfigLoaded) {
    return (
      <div className={styles.page}>
        <div className={styles.wrap}>
          <p style={{ textAlign: 'center', color: 'var(--color-text-muted)', marginTop: 'var(--space-10)' }}>Chargement…</p>
        </div>
      </div>
    );
  }

  if (isPublic && !salon) {
    return (
      <div className={styles.page}>
        <div className={styles.wrap}>
          <p style={{ textAlign: 'center', color: 'var(--color-text-muted)', marginTop: 'var(--space-10)' }}>
            Ce lien de réservation n'est plus valide.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <ToastContainer />
      <div className={styles.wrap}>
        <div className={styles.brand}>
          <BrandMark size={44} radius="var(--radius-md)" iconSize={20} />
          <span className={styles.brandName}>{salon.name}</span>
        </div>

        {step > 0 && step < 4 && (
          <div className={styles.steps}>
            {[1, 2, 3].map((s) => (
              <span key={s} className={`${styles.stepDot} ${s === step ? styles.stepDotActive : ''}`} />
            ))}
          </div>
        )}

        <div className={styles.panel}>
          {step === 0 && (
            <>
              <h2 className={styles.title}>{salon.name}</h2>
              <p className={styles.subtitle}>{salon.address}</p>

              <div className={styles.showcaseInfo}>
                <div className={styles.showcaseRow}>
                  <Icon name="phone" size={15} /> {salon.phone}
                </div>
                <div className={styles.showcaseRow}>
                  <Icon name="mail" size={15} /> {salon.email}
                </div>
              </div>

              <div className={styles.hoursGrid}>
                {WEEK_DAYS.map((day) => {
                  const sched = salon.hours[day];
                  return (
                    <div key={day} className={styles.hoursRow}>
                      <span>{DAY_LABELS[day]}</span>
                      <span className={sched.closed ? styles.hoursClosed : styles.hoursOpen}>
                        {sched.closed ? 'Fermé' : `${sched.open} – ${sched.close}`}
                      </span>
                    </div>
                  );
                })}
              </div>

              {featured.length > 0 && (
                <>
                  <div className={styles.categoryLabel}>Prestations phares</div>
                  <div className={styles.featuredRow}>
                    {featured.map((row) => (
                      <span key={row.service.id} className={styles.featuredChip}>{row.service.name}</span>
                    ))}
                  </div>
                </>
              )}

              <div className={styles.footerActions} style={{ justifyContent: 'center', marginTop: 'var(--space-6)' }}>
                <button type="button" className="btn btn-primary" onClick={() => setStep(1)}>
                  Réserver un rendez-vous <Icon name="chevron-right" size={16} />
                </button>
              </div>
            </>
          )}

          {step === 1 && (
            <>
              <h2 className={styles.title}>Choisissez votre prestation</h2>
              <p className={styles.subtitle}>Extensions de cils, sourcils, soins ou forfaits</p>
              <div className={styles.serviceGrid}>
                {SERVICE_CATEGORIES.map((cat) => (
                  <div key={cat.id}>
                    <div className={styles.categoryLabel}>{cat.label}</div>
                    {(grouped[cat.id] ?? []).map((s) => (
                      <button
                        key={s.id}
                        type="button"
                        className={`${styles.serviceOption} ${serviceId === s.id ? styles.serviceOptionActive : ''}`}
                        style={{ marginBottom: 8, width: '100%' }}
                        onClick={() => setServiceId(s.id)}
                      >
                        <div>
                          <div className={styles.serviceOptionName}>{s.name}</div>
                          <div className={styles.serviceOptionMeta}>{formatDuration(s.duration)}</div>
                        </div>
                        <span className={styles.serviceOptionPrice}>{formatPrice(s.price)}</span>
                      </button>
                    ))}
                  </div>
                ))}
              </div>
              <div className={styles.footerActions}>
                <button type="button" className="btn btn-ghost" onClick={() => setStep(0)}>
                  <Icon name="chevron-left" size={16} /> Retour
                </button>
                <button type="button" className="btn btn-primary" disabled={!serviceId} onClick={() => setStep(2)}>
                  Continuer <Icon name="chevron-right" size={16} />
                </button>
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <h2 className={styles.title}>Choisissez un créneau</h2>
              <p className={styles.subtitle}>{service?.name} · {formatDuration(service?.duration ?? 0)}</p>

              <div className={`${styles.dayRow} scrollbar-hidden`}>
                {NEXT_DAYS.map((d) => {
                  const sched = daySchedule(salon, d);
                  const closed = !sched || sched.closed;
                  return (
                    <button
                      key={d}
                      type="button"
                      className={`${styles.dayChip} ${date === d ? styles.dayChipActive : ''} ${closed ? styles.dayChipClosed : ''}`}
                      onClick={() => { setDate(d); setSlot(null); }}
                    >
                      <span style={{ fontSize: '0.65rem', textTransform: 'uppercase' }}>{formatDayLabel(d)}</span>
                      <span style={{ fontFamily: 'var(--font-title)', fontWeight: 600 }}>{formatDayNumber(d)}</span>
                    </button>
                  );
                })}
              </div>

              {realSlots.length === 0 ? (
                <>
                  <p style={{ fontSize: '0.86rem', color: 'var(--color-text-muted)' }}>
                    {closedToday
                      ? 'Le salon est fermé ce jour-là, choisissez une autre date.'
                      : 'Aucun créneau disponible ce jour-là, essayez une autre date.'}
                  </p>
                  {!closedToday && !isPublic && (
                    <button type="button" className="btn btn-secondary btn-sm" style={{ marginTop: 'var(--space-3)' }} onClick={() => setWaitlistOpen(true)}>
                      Rejoindre la liste d'attente pour ce jour
                    </button>
                  )}
                </>
              ) : (
                <div className={styles.slotGrid}>
                  {realSlots.map((s) => (
                    <button
                      key={s.time}
                      type="button"
                      className={`${styles.slot} ${slot?.time === s.time ? styles.slotActive : ''}`}
                      onClick={() => setSlot(s)}
                    >
                      {s.time}
                    </button>
                  ))}
                </div>
              )}

              <div className={styles.footerActions}>
                <button type="button" className="btn btn-ghost" onClick={() => setStep(1)}>
                  <Icon name="chevron-left" size={16} /> Retour
                </button>
                <button type="button" className="btn btn-primary" disabled={!slot} onClick={() => setStep(3)}>
                  Continuer <Icon name="chevron-right" size={16} />
                </button>
              </div>
            </>
          )}

          {step === 3 && (
            <form onSubmit={handleSubmit}>
              <h2 className={styles.title}>Vos coordonnées</h2>
              <p className={styles.subtitle}>Dernière étape avant de confirmer votre RDV</p>

              <div className={styles.recap}>
                <div className={styles.recapRow}><span>Prestation</span><strong>{service?.name}</strong></div>
                <div className={styles.recapRow}><span>Date</span><strong>{formatDateLong(date)}</strong></div>
                <div className={styles.recapRow}><span>Heure</span><strong>{slot?.time}</strong></div>
                <div className={styles.recapRow}><span>Prix</span><strong>{formatPrice(service?.price ?? 0)}</strong></div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="field-group">
                  <label className="field-label" htmlFor="bk-first">Prénom</label>
                  <input id="bk-first" className="input-field" value={contact.firstName} onChange={(e) => setContact({ ...contact, firstName: e.target.value })} required />
                </div>
                <div className="field-group">
                  <label className="field-label" htmlFor="bk-last">Nom</label>
                  <input id="bk-last" className="input-field" value={contact.lastName} onChange={(e) => setContact({ ...contact, lastName: e.target.value })} required />
                </div>
              </div>
              <div className="field-group">
                <label className="field-label" htmlFor="bk-phone">Téléphone</label>
                <input id="bk-phone" className="input-field" value={contact.phone} onChange={(e) => setContact({ ...contact, phone: e.target.value })} placeholder="06 00 00 00 00" required />
              </div>
              <div className="field-group" style={{ marginBottom: 0 }}>
                <label className="field-label" htmlFor="bk-email">Email</label>
                <input id="bk-email" type="email" className="input-field" value={contact.email} onChange={(e) => setContact({ ...contact, email: e.target.value })} />
              </div>

              {salon.cancellationPolicy && (
                <p className={styles.policyText}>{salon.cancellationPolicy}</p>
              )}

              <div className={styles.footerActions}>
                <button type="button" className="btn btn-ghost" onClick={() => setStep(2)}>
                  <Icon name="chevron-left" size={16} /> Retour
                </button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? 'Envoi…' : 'Confirmer le RDV'}
                </button>
              </div>
            </form>
          )}

          {step === 4 && confirmedAppointment && (
            <>
              <span className={styles.successIcon}>
                <Icon name={cancelled ? 'x' : 'check'} size={30} strokeWidth={2.4} />
              </span>
              <div className={styles.successText}>
                <h2 className={styles.title}>{cancelled ? 'Rendez-vous annulé' : 'Demande envoyée !'}</h2>
                <p className={styles.subtitle}>
                  {cancelled
                    ? 'Votre rendez-vous a bien été annulé. À bientôt chez nous !'
                    : isPublic
                      ? "Votre demande a été transmise à l'institut, vous recevrez une confirmation dès qu'elle sera validée."
                      : 'Une confirmation par SMS et e-mail vous sera envoyée sous peu (simulation).'}
                </p>
              </div>
              <div className={styles.recap}>
                <div className={styles.recapRow}><span>Prestation</span><strong>{confirmedAppointment.service.name}</strong></div>
                <div className={styles.recapRow}><span>Date</span><strong>{formatDateLong(confirmedAppointment.date)}</strong></div>
                <div className={styles.recapRow}><span>Heure</span><strong>{confirmedAppointment.time}</strong></div>
              </div>
              <div className={styles.footerActions} style={{ justifyContent: 'center', gap: 12, flexWrap: 'wrap' }}>
                <button type="button" className="btn btn-secondary" onClick={reset}>Nouvelle réservation</button>
                {!cancelled && !isPublic && (
                  <button type="button" className="btn btn-ghost" onClick={handleCancel}>
                    Annuler mon RDV
                  </button>
                )}
                {!isPublic && (
                  <button type="button" className="btn btn-primary" onClick={() => navigate('/agenda')}>Voir l'agenda</button>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {!isPublic && (
        <WaitlistModal
          open={waitlistOpen}
          onClose={() => setWaitlistOpen(false)}
          date={date}
          serviceName={service?.name ?? ''}
        />
      )}
    </div>
  );
}
