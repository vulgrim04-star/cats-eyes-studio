import { create } from 'zustand';
import { supabase } from '../lib/supabaseClient';
import { setSyncUserId, flushPendingWrites } from '../utils/supabaseSyncStorage';
import { rehydrateAllStores } from './rehydrate';

export const useAuthStore = create(() => ({
  session: null,
  ready: false,
  authError: '',
}));

export async function signIn(email, password) {
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) useAuthStore.setState({ authError: error.message });
  return !error;
}

export async function signUp(email, password) {
  const { error } = await supabase.auth.signUp({ email, password });
  if (error) useAuthStore.setState({ authError: error.message });
  return !error;
}

export async function signOut() {
  await flushPendingWrites();
  await supabase.auth.signOut();
}

export function clearAuthError() {
  useAuthStore.setState({ authError: '' });
}

let initialized = false;

export function initAuth() {
  if (initialized) return;
  initialized = true;
  supabase.auth.onAuthStateChange(async (_event, session) => {
    setSyncUserId(session?.user?.id ?? null);
    await rehydrateAllStores(session?.user?.id ?? null);
    useAuthStore.setState({ session, ready: true });
  });
}
