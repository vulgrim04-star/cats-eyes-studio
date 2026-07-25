import { useClientsStore } from '../store/useClientsStore';
import { useAppointmentsStore } from '../store/useAppointmentsStore';
import { useProductsStore } from '../store/useProductsStore';
import { useServicesStore } from '../store/useServicesStore';
import { useSettingsStore } from '../store/useSettingsStore';
import { useExpensesStore } from '../store/useExpensesStore';
import { useWaitlistStore } from '../store/useWaitlistStore';
import {
  DEMO_SALON,
  DEMO_SERVICES,
  DEMO_APPOINTMENTS,
  DEMO_CLIENTS,
  DEMO_PRODUCTS,
  DEMO_MOVEMENTS,
  DEMO_EXPENSES,
} from '../data/demoData';

const FLAG_KEY = 'ces-demo-mode';
const PERSISTED_KEYS = [
  'ces-clients',
  'ces-appointments',
  'ces-products',
  'ces-services',
  'ces-settings',
  'ces-expenses',
  'ces-waitlist',
];

/** Le mode démo vit en sessionStorage : il disparaît à la fermeture de l'onglet, et ne
 * suit pas quelqu'un qui reviendrait plus tard pour créer un vrai compte. */
export function isDemoActive() {
  try {
    return sessionStorage.getItem(FLAG_KEY) === '1';
  } catch {
    return false;
  }
}

/** Charge le jeu de démonstration directement dans les stores.
 *
 * Aucune écriture Supabase n'est possible ici : `setSyncUserId` n'est appelé que depuis
 * initAuth avec l'identifiant d'une session réelle, et le mode démo n'ouvre jamais de
 * session. Les données restent donc purement locales à l'onglet. */
export function enterDemo() {
  try {
    sessionStorage.setItem(FLAG_KEY, '1');
  } catch {
    // Navigation privée très restrictive : la démo fonctionnera le temps de la page.
  }

  useSettingsStore.setState({ salon: DEMO_SALON, onboarded: true });
  useServicesStore.setState({ services: DEMO_SERVICES });
  useClientsStore.setState({ clients: DEMO_CLIENTS });
  useAppointmentsStore.setState({ appointments: DEMO_APPOINTMENTS });
  useProductsStore.setState({ products: DEMO_PRODUCTS, movements: DEMO_MOVEMENTS });
  useExpensesStore.setState({ expenses: DEMO_EXPENSES });
  useWaitlistStore.setState({ entries: [] });
}

/** Quitte la démo et efface ses traces locales, pour qu'un compte réel créé ensuite sur
 * ce navigateur ne récupère jamais des clientes fictives. */
export function exitDemo() {
  try {
    sessionStorage.removeItem(FLAG_KEY);
    PERSISTED_KEYS.forEach((key) => localStorage.removeItem(key));
  } catch {
    // Rien à faire : le rechargement ci-dessous repart de toute façon sur un état propre.
  }
  window.location.href = '/';
}
