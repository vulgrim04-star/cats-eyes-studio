import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { createId } from '../utils/id';
import { rangesOverlap } from '../utils/date';
import { useSettingsStore } from './useSettingsStore';
import { supabaseSyncStorage } from '../utils/supabaseSyncStorage';

export const useAppointmentsStore = create(
  persist(
    (set, get) => ({
      appointments: [],

      findOverlap: ({ date, time, duration, excludeId }) => {
        const buffer = useSettingsStore.getState().salon.bufferMinutes ?? 0;
        return get().appointments.find((apt) => {
          if (apt.id === excludeId) return false;
          if (apt.date !== date) return false;
          if (apt.status === 'cancelled') return false;
          return rangesOverlap(apt.time, apt.duration, time, duration, buffer);
        });
      },

      addAppointment: (data) => {
        const appointment = {
          id: createId('apt'),
          status: 'pending',
          notes: '',
          ...data,
        };
        set((state) => ({ appointments: [...state.appointments, appointment] }));
        return appointment;
      },

      updateAppointment: (id, patch) => {
        set((state) => ({
          appointments: state.appointments.map((a) => (a.id === id ? { ...a, ...patch } : a)),
        }));
      },

      setStatus: (id, status) => {
        get().updateAppointment(id, { status });
      },

      removeAppointment: (id) => {
        set((state) => ({ appointments: state.appointments.filter((a) => a.id !== id) }));
      },
    }),
    { name: 'ces-appointments', version: 1, storage: createJSONStorage(() => supabaseSyncStorage), skipHydration: true }
  )
);
