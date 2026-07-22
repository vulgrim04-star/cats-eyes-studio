import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { clients as seedClients } from '../data/clients';
import { createId } from '../utils/id';

export const useClientsStore = create(
  persist(
    (set, get) => ({
      clients: seedClients,

      addClient: (data) => {
        const client = {
          id: createId('cli'),
          consentSigned: false,
          consentDate: null,
          lashMapConsentSigned: false,
          lashMapConsentDate: null,
          notes: '',
          photos: [],
          lashMaps: [],
          allergies: '',
          contraindications: '',
          photoUrl: '',
          birthday: '',
          contactPreference: 'sms',
          referralSource: '',
          createdAt: new Date().toISOString().slice(0, 10),
          ...data,
        };
        set((state) => ({ clients: [client, ...state.clients] }));
        return client;
      },

      updateClient: (id, patch) => {
        set((state) => ({
          clients: state.clients.map((c) => (c.id === id ? { ...c, ...patch } : c)),
        }));
      },

      signConsent: (id, date) => {
        get().updateClient(id, { consentSigned: true, consentDate: date });
      },

      signLashMapConsent: (id, date) => {
        get().updateClient(id, { lashMapConsentSigned: true, lashMapConsentDate: date });
      },

      addNote: (id, note) => {
        set((state) => ({
          clients: state.clients.map((c) =>
            c.id === id ? { ...c, notes: c.notes ? `${c.notes}\n\n${note}` : note } : c
          ),
        }));
      },

      addPhotoSession: (id, photo) => {
        const entry = { id: createId('ph'), sessionDate: new Date().toISOString().slice(0, 10), ...photo };
        set((state) => ({
          clients: state.clients.map((c) =>
            c.id === id ? { ...c, photos: [entry, ...c.photos] } : c
          ),
        }));
      },

      addLashMap: (id, map) => {
        const entry = { id: createId('lm'), date: new Date().toISOString().slice(0, 10), ...map };
        set((state) => ({
          clients: state.clients.map((c) =>
            c.id === id ? { ...c, lashMaps: [entry, ...(c.lashMaps ?? [])] } : c
          ),
        }));
        return entry;
      },

      removeLashMap: (id, mapId) => {
        set((state) => ({
          clients: state.clients.map((c) =>
            c.id === id ? { ...c, lashMaps: (c.lashMaps ?? []).filter((m) => m.id !== mapId) } : c
          ),
        }));
      },
    }),
    {
      name: 'ces-clients',
      version: 2,
      storage: createJSONStorage(() => localStorage),
      // v1 -> v2 : les fiches persistées avant la Lash Map n'ont pas le champ lashMaps.
      // On repart des données de démo enrichies (phase de développement, pas de données réelles).
      migrate: () => ({ clients: seedClients }),
    }
  )
);
