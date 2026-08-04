import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { createId } from '../utils/id';
import { supabaseSyncStorage } from '../utils/supabaseSyncStorage';
import { normalizeLashMap } from '../utils/lashModel';
import { normalizeBrowSession } from '../utils/browModel';

export const useClientsStore = create(
  persist(
    (set, get) => ({
      clients: [],

      addClient: (data) => {
        const client = {
          id: createId('cli'),
          consentSigned: false,
          consentDate: null,
          lashMapConsentSigned: false,
          lashMapConsentDate: null,
          healthFormSigned: false,
          healthFormDate: null,
          healthFormSignatureUrl: null,
          healthFormAnswers: null,
          notes: '',
          photos: [],
          lashMaps: [],
          browSessions: [],
          allergies: '',
          contraindications: '',
          photoUrl: '',
          birthday: '',
          instagram: '',
          lashCondition: '',
          naturalLength: '',
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

      removeClient: (id) => {
        set((state) => ({ clients: state.clients.filter((c) => c.id !== id) }));
      },

      signConsent: (id, date, signatureUrl) => {
        get().updateClient(id, { consentSigned: true, consentDate: date, consentSignatureUrl: signatureUrl });
      },

      signLashMapConsent: (id, date, signatureUrl) => {
        get().updateClient(id, { lashMapConsentSigned: true, lashMapConsentDate: date, lashMapConsentSignatureUrl: signatureUrl });
      },

      signHealthForm: (id, date, signatureUrl, answers) => {
        get().updateClient(id, { healthFormSigned: true, healthFormDate: date, healthFormSignatureUrl: signatureUrl, healthFormAnswers: answers });
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

      updatePhotoSession: (id, photoId, patch) => {
        set((state) => ({
          clients: state.clients.map((c) =>
            c.id === id
              ? { ...c, photos: c.photos.map((p) => (p.id === photoId ? { ...p, ...patch } : p)) }
              : c
          ),
        }));
      },

      removePhotoSession: (id, photoId) => {
        set((state) => ({
          clients: state.clients.map((c) =>
            c.id === id ? { ...c, photos: c.photos.filter((p) => p.id !== photoId) } : c
          ),
        }));
      },

      addLashMap: (id, map) => {
        // Normalisée à l'entrée : le magasin ne contient JAMAIS une fiche à moitié
        // convertie, quelle que soit la forme fournie par l'appelant.
        const entry = normalizeLashMap({ id: createId('lm'), date: new Date().toISOString().slice(0, 10), ...map });
        set((state) => ({
          clients: state.clients.map((c) =>
            c.id === id ? { ...c, lashMaps: [entry, ...(c.lashMaps ?? [])] } : c
          ),
        }));
        return entry;
      },

      updateLashMap: (id, mapId, patch) => {
        set((state) => ({
          clients: state.clients.map((c) =>
            c.id === id
              ? { ...c, lashMaps: (c.lashMaps ?? []).map((m) => (m.id === mapId ? { ...m, ...patch } : m)) }
              : c
          ),
        }));
      },

      /** Séances sourcils. Rangées sur la fiche cliente comme les lash maps, et pour la
       *  même raison : elles décrivent CETTE cliente et doivent disparaître avec elle. */
      addBrowSession: (id, session) => {
        const entry = normalizeBrowSession({ id: createId('bs'), ...session });
        set((state) => ({
          clients: state.clients.map((c) =>
            c.id === id ? { ...c, browSessions: [entry, ...(c.browSessions ?? [])] } : c
          ),
        }));
        return entry;
      },

      updateBrowSession: (id, sessionId, patch) => {
        set((state) => ({
          clients: state.clients.map((c) =>
            c.id === id
              ? {
                  ...c,
                  browSessions: (c.browSessions ?? []).map((s) =>
                    s.id === sessionId ? normalizeBrowSession({ ...s, ...patch, id: sessionId }) : s
                  ),
                }
              : c
          ),
        }));
      },

      removeBrowSession: (id, sessionId) => {
        set((state) => ({
          clients: state.clients.map((c) =>
            c.id === id ? { ...c, browSessions: (c.browSessions ?? []).filter((s) => s.id !== sessionId) } : c
          ),
        }));
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
      version: 4,
      storage: createJSONStorage(() => supabaseSyncStorage),
      skipHydration: true,
      // v3 : complète les fiches d'avant la Lash Map / la fiche de santé.
      // v4 : convertit les Lash Maps au modèle par secteurs (longueurs en tableau de
      //      chaînes → secteurs numérotés, courbure/épaisseur → réglages globaux).
      //      `normalizeLashMap` est idempotente : une fiche déjà convertie est intacte.
      migrate: (persisted) => ({
        clients: (persisted?.clients ?? []).map((c) => ({
          healthFormSigned: false,
          healthFormDate: null,
          healthFormSignatureUrl: null,
          healthFormAnswers: null,
          ...c,
          lashMaps: (c.lashMaps ?? []).map(normalizeLashMap),
          // Les fiches antérieures au Brow Studio n'ont pas ce tableau : sans ce repli,
          // le premier composant qui itère dessus planterait sur une fiche existante.
          browSessions: (c.browSessions ?? []).map((s) => normalizeBrowSession(s)),
        })),
      }),
    }
  )
);
