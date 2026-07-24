import { supabase } from '../lib/supabaseClient';
import { useUIStore } from '../store/useUIStore';

let currentUserId = null;

export function setSyncUserId(id) {
  currentUserId = id;
}

// On regroupe les écritures rapprochées (ex. glisser un sélecteur de couleur, taper dans un
// champ persisté) pour n'envoyer qu'un seul upsert réseau par store toutes les 800ms, au lieu
// d'un appel Supabase à chaque frappe.
const DEBOUNCE_MS = 800;
const pendingTimers = new Map();
const pendingWrites = new Map();

async function flushWrite(name, value, attempt = 1) {
  if (!currentUserId) return;
  const { error } = await supabase.from('app_state').upsert(
    { user_id: currentUserId, store_key: name, data: JSON.parse(value), updated_at: new Date().toISOString() },
    { onConflict: 'user_id,store_key' }
  );
  if (error) {
    console.error('[supabaseSyncStorage] upsert failed', name, error);
    if (attempt < 2) {
      await new Promise((resolve) => setTimeout(resolve, 1500));
      return flushWrite(name, value, attempt + 1);
    }
    useUIStore
      .getState()
      .showToast(
        'Synchronisation interrompue : vos dernières modifications restent enregistrées sur cet appareil, nouvelle tentative au prochain changement.',
        'error'
      );
  }
}

/** Envoie immédiatement toute écriture en attente (ex. avant une déconnexion ou une fermeture
 * d'onglet), pour ne jamais perdre une modification qui n'a pas encore atteint son debounce. */
export function flushPendingWrites() {
  const names = [...pendingTimers.keys()];
  names.forEach((name) => clearTimeout(pendingTimers.get(name)));
  pendingTimers.clear();
  const writes = [...pendingWrites.entries()];
  pendingWrites.clear();
  return Promise.all(writes.map(([name, value]) => flushWrite(name, value)));
}

if (typeof window !== 'undefined') {
  window.addEventListener('pagehide', () => flushPendingWrites());
}

/** Storage compatible avec zustand `createJSONStorage` : écrit en localStorage (instantané)
 * et, si une session est active, synchronise la même valeur dans Supabase (table app_state). */
export const supabaseSyncStorage = {
  getItem: async (name) => {
    if (!currentUserId) return localStorage.getItem(name);
    const { data, error } = await supabase
      .from('app_state')
      .select('data')
      .eq('user_id', currentUserId)
      .eq('store_key', name)
      .maybeSingle();
    // Erreur réseau/API : on retombe sur le cache local plutôt que de perdre l'affichage.
    if (error) return localStorage.getItem(name);
    // Pas d'erreur mais aucune ligne : ce compte n'a encore rien en cloud, on ne doit
    // surtout pas hériter du cache local d'un autre compte utilisé sur ce même navigateur.
    if (!data) return null;
    const json = JSON.stringify(data.data);
    localStorage.setItem(name, json);
    return json;
  },

  setItem: async (name, value) => {
    localStorage.setItem(name, value);
    if (!currentUserId) return;
    pendingWrites.set(name, value);
    if (pendingTimers.has(name)) clearTimeout(pendingTimers.get(name));
    pendingTimers.set(
      name,
      setTimeout(() => {
        pendingTimers.delete(name);
        const latest = pendingWrites.get(name);
        pendingWrites.delete(name);
        if (latest != null) flushWrite(name, latest);
      }, DEBOUNCE_MS)
    );
  },

  removeItem: async (name) => {
    localStorage.removeItem(name);
    if (pendingTimers.has(name)) {
      clearTimeout(pendingTimers.get(name));
      pendingTimers.delete(name);
    }
    pendingWrites.delete(name);
    if (!currentUserId) return;
    await supabase.from('app_state').delete().eq('user_id', currentUserId).eq('store_key', name);
  },
};
