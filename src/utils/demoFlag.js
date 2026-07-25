// Drapeau du mode démonstration, isolé dans un module SANS AUCUN IMPORT.
//
// Il doit être lisible depuis `supabaseSyncStorage` (pour neutraliser toute écriture) et
// depuis `demoMode` (qui charge le jeu fictif). Or `demoMode` importe les stores, qui
// importent `supabaseSyncStorage` : si ce dernier importait `demoMode`, on créerait un
// cycle d'imports. D'où ce module feuille, que les deux peuvent importer sans risque.
//
// Stocké en sessionStorage : la démo disparaît à la fermeture de l'onglet et ne suit pas
// quelqu'un qui reviendrait plus tard créer un vrai compte.
const FLAG_KEY = 'ces-demo-mode';

export function isDemoActive() {
  try {
    return sessionStorage.getItem(FLAG_KEY) === '1';
  } catch {
    // Navigation privée très restrictive : on considère qu'on n'est pas en démo, ce qui
    // est le choix sûr (aucune donnée fictive ne sera prise pour des données réelles).
    return false;
  }
}

export function setDemoFlag() {
  try {
    sessionStorage.setItem(FLAG_KEY, '1');
    return true;
  } catch {
    return false;
  }
}

export function clearDemoFlag() {
  try {
    sessionStorage.removeItem(FLAG_KEY);
  } catch {
    // Rien à faire : sans sessionStorage, le drapeau n'a de toute façon jamais été posé.
  }
}
