import { supabase } from '../lib/supabaseClient';

let currentUserId = null;

export function setSyncUserId(id) {
  currentUserId = id;
}

/** Storage compatible avec zustand `createJSONStorage` : écrit en localStorage (instantané)
 * et, si une session est active, synchronise la même valeur dans Supabase (table app_state). */
export const supabaseSyncStorage = {
  getItem: async (name) => {
    const local = localStorage.getItem(name);
    if (!currentUserId) return local;
    const { data, error } = await supabase
      .from('app_state')
      .select('data')
      .eq('user_id', currentUserId)
      .eq('store_key', name)
      .maybeSingle();
    if (error || !data) return local;
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
