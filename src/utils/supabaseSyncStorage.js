import { supabase } from '../lib/supabaseClient';

let currentUserId = null;

export function setSyncUserId(id) {
  currentUserId = id;
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
    const { error } = await supabase.from('app_state').upsert(
      { user_id: currentUserId, store_key: name, data: JSON.parse(value), updated_at: new Date().toISOString() },
      { onConflict: 'user_id,store_key' }
    );
    if (error) console.error('[supabaseSyncStorage] upsert failed', name, error);
  },

  removeItem: async (name) => {
    localStorage.removeItem(name);
    if (!currentUserId) return;
    await supabase.from('app_state').delete().eq('user_id', currentUserId).eq('store_key', name);
  },
};
