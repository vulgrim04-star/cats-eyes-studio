import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { supabaseSyncStorage } from '../utils/supabaseSyncStorage';

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

const DEFAULT_SALON = {
  name: 'Cats Eyes Studio',
  managerName: 'Léa Moreau',
  address: '12 rue des Lilas, 75011 Paris',
  phone: '01 23 45 67 89',
  email: 'contact@catseyesstudio.fr',
  currency: 'EUR',
  hours: DEFAULT_HOURS,
  logoUrl: '',
  bufferMinutes: 10,
  vatRate: 20,
  cancellationPolicy: "Toute annulation doit être effectuée au moins 24h à l'avance. En cas d'annulation tardive ou de no-show, un acompte pourra être demandé lors de la prochaine réservation.",
};

export const useSettingsStore = create(
  persist(
    (set) => ({
      salon: DEFAULT_SALON,
      notifications: {
        autoConfirm: true,
        reminder24h: true,
        reminder2h: true,
      },
      appearance: {
        themeColor: '#C8718A',
        darkMode: false,
      },

      updateSalon: (patch) => set((s) => ({ salon: { ...s.salon, ...patch } })),
      updateDayHours: (day, patch) =>
        set((s) => ({
          salon: {
            ...s.salon,
            hours: { ...s.salon.hours, [day]: { ...s.salon.hours[day], ...patch } },
          },
        })),
      toggleNotification: (key) =>
        set((s) => ({ notifications: { ...s.notifications, [key]: !s.notifications[key] } })),
      setThemeColor: (color) =>
        set((s) => ({ appearance: { ...s.appearance, themeColor: color } })),
      toggleDarkMode: () =>
        set((s) => ({ appearance: { ...s.appearance, darkMode: !s.appearance.darkMode } })),
    }),
    {
      name: 'ces-settings',
      version: 3,
      storage: createJSONStorage(() => supabaseSyncStorage),
      skipHydration: true,
      // v2 -> v3 : ajout du tampon entre RDV, TVA, politique d'annulation, mode sombre.
      migrate: (persisted) => ({
        salon: { ...DEFAULT_SALON, ...(persisted?.salon ?? {}), hours: persisted?.salon?.hours ?? DEFAULT_HOURS },
        notifications: persisted?.notifications ?? {
          autoConfirm: true,
          reminder24h: true,
          reminder2h: true,
        },
        appearance: { themeColor: persisted?.appearance?.themeColor ?? '#C8718A', darkMode: false },
      }),
    }
  )
);

export const WEEK_DAYS = DAYS;
