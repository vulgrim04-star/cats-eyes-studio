import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { supabaseSyncStorage } from '../utils/supabaseSyncStorage';
import { mergeNotifications } from '../utils/notificationFeed';

/** Les notifications et leur état (lue, supprimée, traitée).
 *
 *  Persisté comme les autres magasins, donc synchronisé entre les appareils : une alerte
 *  lue sur le téléphone ne redevient pas non-lue sur l'ordinateur. C'est aussi ce qui donne
 *  un sens durable à « supprimer » — l'état survit au rechargement.
 *
 *  Toute la logique de fusion vit dans `utils/notificationFeed.js`, en fonctions pures :
 *  ce magasin ne fait que la brancher sur le stockage. */
export const useNotificationsStore = create(
  persist(
    (set, get) => ({
      items: [],

      /** Confronte les alertes calculées depuis les données à ce qui est déjà connu. */
      sync: (derived) => {
        const next = mergeNotifications(get().items, derived, new Date().toISOString());
        // Économise une écriture (et donc un aller-retour vers Supabase) quand rien ne
        // bouge — ce qui est le cas de la très grande majorité des synchronisations.
        if (sameState(get().items, next)) return;
        set({ items: next });
      },

      markRead: (id) => {
        const now = new Date().toISOString();
        set((state) => ({
          items: state.items.map((n) => (n.id === id && !n.readAt ? { ...n, readAt: now } : n)),
        }));
      },

      markAllRead: () => {
        const now = new Date().toISOString();
        set((state) => ({
          items: state.items.map((n) => (n.readAt || n.dismissedAt ? n : { ...n, readAt: now })),
        }));
      },

      /** Supprime une notification. L'entrée est conservée mais marquée : c'est elle qui
       *  empêche l'alerte de réapparaître tant que sa source existe (voir notificationFeed). */
      dismiss: (id) => {
        const now = new Date().toISOString();
        set((state) => ({
          items: state.items.map((n) => (n.id === id ? { ...n, dismissedAt: now, readAt: n.readAt ?? now } : n)),
        }));
      },

      /** Vide l'historique : les alertes déjà traitées disparaissent, les actives restent. */
      clearHistory: () => {
        set((state) => ({ items: state.items.filter((n) => !n.resolvedAt) }));
      },

      reset: () => set({ items: [] }),
    }),
    { name: 'ces-notifications', version: 1, storage: createJSONStorage(() => supabaseSyncStorage), skipHydration: true }
  )
);

/** Deux listes portent-elles exactement la même information ? Comparaison champ à champ
 *  plutôt que par référence : `mergeNotifications` reconstruit toujours des objets neufs. */
function sameState(a, b) {
  if (a.length !== b.length) return false;
  return a.every((item, i) => {
    const other = b[i];
    return (
      item.id === other.id &&
      item.title === other.title &&
      item.body === other.body &&
      item.readAt === other.readAt &&
      item.dismissedAt === other.dismissedAt &&
      item.resolvedAt === other.resolvedAt
    );
  });
}
