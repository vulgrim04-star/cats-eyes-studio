import { useClientsStore } from '../store/useClientsStore';
import { useAppointmentsStore } from '../store/useAppointmentsStore';
import { useProductsStore } from '../store/useProductsStore';
import { useServicesStore } from '../store/useServicesStore';
import { useSettingsStore } from '../store/useSettingsStore';
import { useExpensesStore } from '../store/useExpensesStore';
import { useWaitlistStore } from '../store/useWaitlistStore';
import { isDemoActive, setDemoFlag, clearDemoFlag } from './demoFlag';
import {
  DEMO_SALON,
  DEMO_SERVICES,
  DEMO_APPOINTMENTS,
  DEMO_CLIENTS,
  DEMO_PRODUCTS,
  DEMO_MOVEMENTS,
  DEMO_EXPENSES,
} from '../data/demoData';

export { isDemoActive };

// Clés des stores persistés, nettoyées en sortie de démo. Nécessaire pour les navigateurs
// qui ont subi la version antérieure du mode démo, laquelle écrivait le jeu fictif dans
// localStorage sous ces mêmes clés.
const PERSISTED_KEYS = [
  'ces-clients',
  'ces-appointments',
  'ces-products',
  'ces-services',
  'ces-settings',
  'ces-expenses',
  'ces-waitlist',
];

function seedStores() {
  useSettingsStore.setState({ salon: DEMO_SALON, onboarded: true });
  useServicesStore.setState({ services: DEMO_SERVICES });
  useClientsStore.setState({ clients: DEMO_CLIENTS });
  useAppointmentsStore.setState({ appointments: DEMO_APPOINTMENTS });
  useProductsStore.setState({ products: DEMO_PRODUCTS, movements: DEMO_MOVEMENTS });
  useExpensesStore.setState({ expenses: DEMO_EXPENSES });
  useWaitlistStore.setState({ entries: [] });
}

/** Charge le jeu de démonstration dans les stores.
 *
 * Le drapeau est posé AVANT toute écriture de state, et c'est essentiel : le middleware
 * `persist` de zustand enveloppe `api.setState`, donc chaque `setState` ci-dessous
 * déclencherait une écriture. `supabaseSyncStorage` consulte ce drapeau et neutralise
 * l'intégralité de ses opérations tant qu'il est posé — c'est ce qui garantit qu'une
 * gérante connectée qui ouvre la démo ne voit pas ses vraies données écrasées. */
export function enterDemo() {
  setDemoFlag();
  seedStores();
}

/** Recharge le jeu fictif si la démo est active mais que les stores sont vides.
 *
 * Cas visé : rechargement de page pendant la démo. La persistance étant neutralisée,
 * les stores repartent de leurs valeurs par défaut ; sans ce ré-amorçage, l'utilisatrice
 * retomberait sur une application vide au lieu de sa démo. */
export function ensureDemoLoaded() {
  if (!isDemoActive()) return;
  if (useClientsStore.getState().clients.length > 0) return;
  seedStores();
}

/** Quitte la démo et efface ses traces locales, pour qu'un compte réel créé ensuite sur ce
 * navigateur ne récupère jamais de clientes fictives. */
export function exitDemo() {
  try {
    PERSISTED_KEYS.forEach((key) => localStorage.removeItem(key));
  } catch {
    // Rien à faire : le rechargement ci-dessous repart de toute façon d'un état propre.
  }
  // Drapeau retiré en dernier : tant qu'il est posé, aucune écriture n'est possible.
  clearDemoFlag();
  window.location.href = '/';
}
