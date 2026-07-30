import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { supabaseSyncStorage } from '../utils/supabaseSyncStorage';
import { newUuid } from '../utils/id';
import { FALLBACK_TIME_ZONE } from '../utils/timezone';

const DAYS = ['lun', 'mar', 'mer', 'jeu', 'ven', 'sam', 'dim'];

const DEFAULT_HOURS = {
  lun: { open: '09:00', close: '18:30', closed: true },
  mar: { open: '09:00', close: '18:30', closed: false },
  mer: { open: '09:00', close: '18:30', closed: false },
  jeu: { open: '09:00', close: '18:30', closed: false },
  ven: { open: '09:00', close: '18:30', closed: false },
  sam: { open: '09:00', close: '17:00', closed: false },
  dim: { open: '09:00', close: '18:30', closed: true },
};

// Valeurs neutres : chaque compte remplit les siennes à l'onboarding. Ne jamais y
// remettre de données d'exemple (nom, adresse, e-mail) — elles apparaîtraient telles
// quelles sur les reçus et consentements d'un compte qui n'aurait pas fini l'onboarding.
const DEFAULT_SALON = {
  name: '',
  managerName: '',
  address: '',
  phone: '',
  email: '',
  currency: 'EUR',
  // Fuseau du salon. Sert au serveur à savoir de quel « 14h » parle un rendez-vous : celui-ci
  // est enregistré en heure flottante, ce qui suffit à l'afficher mais pas à décider quand
  // envoyer un rappel. Rempli à l'inscription depuis le navigateur (voir Onboarding).
  timezone: FALLBACK_TIME_ZONE,
  hours: DEFAULT_HOURS,
  logoUrl: '',
  bufferMinutes: 10,
  vatRate: 0,
  cancellationPolicy: "Toute annulation doit être effectuée au moins 24h à l'avance. En cas d'annulation tardive ou de no-show, un acompte pourra être demandé lors de la prochaine réservation.",
};

export const useSettingsStore = create(
  persist(
    (set, get) => ({
      salon: DEFAULT_SALON,
      onboarded: false,
      calendarToken: '',
      notifications: {
        autoConfirm: true,
        reminder24h: true,
        reminder2h: true,
        newBookingAlert: true,
        newBookingEmail: false,
      },
      appearance: {
        darkMode: false,
      },

      ensureCalendarToken: () => {
        if (get().calendarToken) return get().calendarToken;
        const token = newUuid();
        set({ calendarToken: token });
        return token;
      },

      updateSalon: (patch) => set((s) => ({ salon: { ...s.salon, ...patch } })),
      completeOnboarding: (salonPatch) => set((s) => ({ salon: { ...s.salon, ...salonPatch }, onboarded: true })),
      updateDayHours: (day, patch) =>
        set((s) => ({
          salon: {
            ...s.salon,
            hours: { ...s.salon.hours, [day]: { ...s.salon.hours[day], ...patch } },
          },
        })),
      toggleNotification: (key) =>
        set((s) => ({ notifications: { ...s.notifications, [key]: !s.notifications[key] } })),
      toggleDarkMode: () =>
        set((s) => ({ appearance: { ...s.appearance, darkMode: !s.appearance.darkMode } })),
    }),
    {
      name: 'ces-settings',
      version: 7,
      storage: createJSONStorage(() => supabaseSyncStorage),
      skipHydration: true,
      // v2 -> v4 : ajout du tampon entre RDV, TVA, politique d'annulation, mode sombre, onboarding.
      // v4 -> v5 : ajout du jeton d'abonnement calendrier (sync Google/Apple).
      // v5 -> v6 : ajout des préférences d'alerte (pop-up/email) pour les nouvelles réservations en ligne.
      // v6 -> v7 : ajout du fuseau horaire, sans lequel les rappels automatiques ne savent pas
      //            à quel instant correspond « mardi 14h ». Les comptes existants héritent du
      //            fuseau par défaut plutôt que d'une détection : la migration peut tourner sur
      //            n'importe quel appareil, y compris celui d'un déplacement à l'étranger, et
      //            figer alors un fuseau faux pour le salon. Corrigeable dans Paramètres.
      // Un compte qui avait déjà des données persistées est par définition un compte existant :
      // on ne le fait pas repasser par l'onboarding obligatoire.
      migrate: (persisted) => ({
        salon: {
          ...DEFAULT_SALON,
          ...(persisted?.salon ?? {}),
          timezone: persisted?.salon?.timezone || FALLBACK_TIME_ZONE,
          hours: persisted?.salon?.hours ?? DEFAULT_HOURS,
        },
        onboarded: persisted?.onboarded ?? true,
        calendarToken: persisted?.calendarToken ?? '',
        notifications: {
          autoConfirm: true,
          reminder24h: true,
          reminder2h: true,
          newBookingAlert: true,
          newBookingEmail: false,
          ...(persisted?.notifications ?? {}),
        },
        appearance: { darkMode: false },
      }),
    }
  )
);

export const WEEK_DAYS = DAYS;
