import { supabase } from '../lib/supabaseClient';
import { supabaseSyncStorage } from '../utils/supabaseSyncStorage';
import { useClientsStore } from './useClientsStore';
import { useAppointmentsStore } from './useAppointmentsStore';
import { useProductsStore } from './useProductsStore';
import { useServicesStore } from './useServicesStore';
import { useSettingsStore } from './useSettingsStore';
import { useExpensesStore } from './useExpensesStore';
import { useWaitlistStore } from './useWaitlistStore';

const PERSISTED_STORES = [
  useClientsStore,
  useAppointmentsStore,
  useProductsStore,
  useServicesStore,
  useSettingsStore,
  useExpensesStore,
  useWaitlistStore,
];

// Supabase déclenche onAuthStateChange plusieurs fois de suite pour une même connexion
// (ex. INITIAL_SESSION puis SIGNED_IN) sans attendre la fin du callback précédent : deux
// appels à rehydrateAllStores peuvent donc se chevaucher. On sérialise les exécutions pour
// qu'un appel concurrent attende simplement la fin de celui déjà en cours au lieu de relancer
// les mêmes lectures/écritures en parallèle (ce qui provoquait des échecs d'upsert aléatoires).
let inFlight = Promise.resolve();

export function rehydrateAllStores(userId) {
  const run = inFlight.then(() => rehydrateAllStoresInternal(userId));
  inFlight = run.catch(() => {});
  return run;
}

async function rehydrateAllStoresInternal(userId) {
  await Promise.all(PERSISTED_STORES.map((store) => store.persist.rehydrate()));

  // Un store jamais modifié par la gérante n'a jamais déclenché d'écriture cloud (seul un
  // `set()` pousse vers Supabase) : sa donnée par défaut reste locale uniquement, invisible
  // pour toute lecture anonyme (ex. page de réservation publique). On la pousse une fois ici.
  if (!userId) return;
  const { data: existingRows } = await supabase.from('app_state').select('store_key').eq('user_id', userId);
  const existingKeys = new Set((existingRows ?? []).map((r) => r.store_key));

  // Écrites une par une (pas en parallèle) pour éviter une rafale de requêtes
  // simultanées vers Supabase juste après la connexion.
  for (const store of PERSISTED_STORES) {
    const { name, version } = store.persist.getOptions();
    if (existingKeys.has(name)) continue;
    const value = JSON.stringify({ state: store.getState(), version: version ?? 0 });
    await supabaseSyncStorage.setItem(name, value);
  }
}
