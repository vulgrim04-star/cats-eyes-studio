import { supabase } from '../lib/supabaseClient';
import { useUIStore } from '../store/useUIStore';
import { isDemoActive } from './demoFlag';

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

/** Renvoie `true` si la valeur est bien arrivée dans Supabase (ou s'il n'y a pas de compte
 * connecté, auquel cas le stockage local fait foi). Les appelants qui doivent confirmer une
 * opération à l'utilisatrice — la restauration de sauvegarde — s'appuient sur ce retour ;
 * `notify: false` leur permet d'afficher leur propre message plutôt que le message générique
 * de synchronisation. */
async function flushWrite(name, value, attempt = 1, { notify = true } = {}) {
  if (!currentUserId) return true;
  const { error } = await supabase.from('app_state').upsert(
    { user_id: currentUserId, store_key: name, data: JSON.parse(value), updated_at: new Date().toISOString() },
    { onConflict: 'user_id,store_key' }
  );
  if (error) {
    console.error('[supabaseSyncStorage] upsert failed', name, error);
    if (attempt < 2) {
      await new Promise((resolve) => setTimeout(resolve, 1500));
      return flushWrite(name, value, attempt + 1, { notify });
    }
    if (notify) {
      useUIStore
        .getState()
        .showToast(
          'Synchronisation interrompue : vos dernières modifications restent enregistrées sur cet appareil, nouvelle tentative au prochain changement.',
          'error'
        );
    }
    return false;
  }
  return true;
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

/** Remplace l'intégralité de l'état persisté (restauration d'une sauvegarde).
 *
 * Écrire uniquement en localStorage ne suffit pas : au rechargement qui suit, `getItem`
 * relit le cloud pour un compte connecté et réécrase le local. La sauvegarde importée
 * serait donc silencieusement jetée alors qu'on annonce « Sauvegarde restaurée ».
 *
 * Le cloud est écrit EN PREMIER et le local seulement une fois tout confirmé : si le réseau
 * lâche en cours de route, rien n'a bougé nulle part et le compte reste dans son état
 * d'avant l'import, plutôt qu'à moitié restauré.
 *
 * Renvoie `false` si la restauration n'a pas pu être garantie ; l'appelant ne doit alors
 * pas annoncer de succès. */
export async function replaceAllStoredState(entries) {
  if (isDemoActive()) return false;

  // Les écritures encore en attente portent l'état d'AVANT la restauration : les laisser
  // partir écraserait la sauvegarde qu'on vient d'importer.
  pendingTimers.forEach((timer) => clearTimeout(timer));
  pendingTimers.clear();
  pendingWrites.clear();

  if (currentUserId) {
    const results = await Promise.all(
      entries.map(([name, value]) => flushWrite(name, value, 1, { notify: false }))
    );
    if (results.some((ok) => !ok)) return false;
  }

  entries.forEach(([name, value]) => localStorage.setItem(name, value));
  return true;
}

/** Storage compatible avec zustand `createJSONStorage` : écrit en localStorage (instantané)
 * et, si une session est active, synchronise la même valeur dans Supabase (table app_state).
 *
 * ⚠️ En mode démonstration, TOUTES les opérations sont neutralisées. C'est indispensable et
 * non cosmétique : le middleware `persist` de zustand enveloppe `api.setState`, si bien que
 * le simple chargement du jeu fictif déclenche une écriture par store. Sans ce garde-fou, une
 * gérante déjà connectée qui ouvre `/demo` voyait ses vraies clientes, rendez-vous et
 * paramètres écrasés dans Supabase — et les données fictives restaient en localStorage sous
 * les mêmes clés, contaminant ensuite tout compte créé depuis ce navigateur.
 *
 * Le garde-fou est ici, au point de passage unique de la persistance, plutôt que dans le mode
 * démo : c'est structurellement impossible d'écrire, au lieu de dépendre du fait qu'on ait
 * pensé à se déconnecter avant. */
export const supabaseSyncStorage = {
  getItem: async (name) => {
    if (isDemoActive()) return null;
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
    if (isDemoActive()) return;
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
    if (isDemoActive()) return;
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
