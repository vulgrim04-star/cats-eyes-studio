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

export async function requestPasswordReset(email) {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/reset-password`,
  });
  if (error) useAuthStore.setState({ authError: error.message });
  return !error;
}

export async function updatePassword(newPassword) {
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) useAuthStore.setState({ authError: error.message });
  return !error;
}

/** Réutilise le même mécanisme (email + lien de récupération signé par Supabase) que
 * la réinitialisation de mot de passe pour prouver que la demande de suppression de
 * compte vient bien de la propriétaire de l'adresse email, sans exiger d'infrastructure
 * d'envoi d'email supplémentaire. */
export async function requestAccountDeletion(email) {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/confirmer-suppression`,
  });
  if (error) useAuthStore.setState({ authError: error.message });
  return !error;
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
