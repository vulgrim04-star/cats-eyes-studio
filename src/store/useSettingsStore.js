import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

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
    }),
    {
      name: 'ces-settings',
      version: 2,
      storage: createJSONStorage(() => localStorage),
      // v1 -> v2 : passage à des horaires par jour + devise + couleur de thème.
      migrate: (persisted) => ({
        salon: { ...DEFAULT_SALON, ...(persisted?.salon ?? {}), hours: DEFAULT_HOURS },
        notifications: persisted?.notifications ?? {
          autoConfirm: true,
          reminder24h: true,
          reminder2h: true,
        },
        appearance: { themeColor: '#C8718A' },
      }),
    }
  )
);

export const WEEK_DAYS = DAYS;
