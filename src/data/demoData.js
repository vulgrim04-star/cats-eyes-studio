import { addDaysISO, todayISO } from '../utils/date';
import { clients as demoClients } from './clients';
import { products as demoProducts } from './products';
import { movements as demoMovements } from './movements';
import { expenses as demoExpenses } from './expenses';

// Jeu de données du mode démonstration. Volontairement séparé des données réelles : rien
// d'ici ne doit jamais être écrit dans Supabase (voir utils/demoMode.js).
//
// Les dates sont calculées à partir d'aujourd'hui pour que l'agenda et les statistiques
// paraissent vivants quel que soit le jour où quelqu'un essaie la démo.

export const DEMO_SALON = {
  name: 'Institut Démo',
  managerName: 'Camille',
  address: 'Rue du Marché 12, 1630 Bulle',
  phone: '079 123 45 67',
  email: 'contact@institut-demo.ch',
  currency: 'CHF',
  hours: {
    lun: { open: '09:00', close: '18:30', closed: true },
    mar: { open: '09:00', close: '18:30', closed: false },
    mer: { open: '09:00', close: '18:30', closed: false },
    jeu: { open: '09:00', close: '19:00', closed: false },
    ven: { open: '09:00', close: '18:30', closed: false },
    sam: { open: '09:00', close: '17:00', closed: false },
    dim: { open: '09:00', close: '18:30', closed: true },
  },
  logoUrl: '',
  bufferMinutes: 10,
  vatRate: 0,
  cancellationPolicy:
    "Toute annulation doit être effectuée au moins 24h à l'avance. En cas d'annulation tardive, un acompte pourra être demandé lors de la prochaine réservation.",
};

export const DEMO_SERVICES = [
  { id: 'srv_demo_1', name: 'Pose complète — Volume russe', category: 'cils', duration: 150, price: 130 },
  { id: 'srv_demo_2', name: 'Pose complète — Cils classiques', category: 'cils', duration: 120, price: 95 },
  { id: 'srv_demo_3', name: 'Remplissage 2-3 semaines', category: 'cils', duration: 75, price: 65 },
  { id: 'srv_demo_4', name: 'Mega volume', category: 'cils', duration: 180, price: 150 },
  { id: 'srv_demo_5', name: 'Dépose complète', category: 'cils', duration: 30, price: 25 },
  { id: 'srv_demo_6', name: 'Lamination des sourcils', category: 'sourcils', duration: 60, price: 70 },
  { id: 'srv_demo_7', name: 'Teinture + restructuration sourcils', category: 'sourcils', duration: 45, price: 45 },
  { id: 'srv_demo_8', name: 'Soin fortifiant cils', category: 'soins', duration: 30, price: 35 },
];

// Rendez-vous répartis autour d'aujourd'hui : quelques séances passées facturées (pour que
// les finances et la fidélité aient du contenu), la journée en cours bien remplie, et des
// réservations à venir.
export const DEMO_APPOINTMENTS = [
  { id: 'apt_demo_1', clientId: 'cli_1', serviceId: 'srv_demo_1', date: addDaysISO(todayISO(), -21), time: '09:00', duration: 150, price: 130, status: 'completed', paymentMethod: 'cb', notes: '' },
  { id: 'apt_demo_2', clientId: 'cli_2', serviceId: 'srv_demo_6', date: addDaysISO(todayISO(), -18), time: '14:00', duration: 60, price: 70, status: 'completed', paymentMethod: 'especes', notes: '' },
  { id: 'apt_demo_3', clientId: 'cli_3', serviceId: 'srv_demo_2', date: addDaysISO(todayISO(), -14), time: '10:30', duration: 120, price: 95, status: 'completed', paymentMethod: 'twint', extras: [{ label: 'Pose de 6 cils', amount: 12 }], notes: '' },
  { id: 'apt_demo_4', clientId: 'cli_1', serviceId: 'srv_demo_3', date: addDaysISO(todayISO(), -7), time: '16:00', duration: 75, price: 65, status: 'completed', paymentMethod: 'cb', notes: '' },
  { id: 'apt_demo_5', clientId: 'cli_4', serviceId: 'srv_demo_4', date: addDaysISO(todayISO(), -5), time: '09:30', duration: 180, price: 150, status: 'completed', paymentMethod: 'virement', notes: '' },
  { id: 'apt_demo_6', clientId: 'cli_2', serviceId: 'srv_demo_7', date: addDaysISO(todayISO(), -3), time: '11:00', duration: 45, price: 45, status: 'no-show', notes: 'Ne s\'est pas présentée, pas de nouvelles.' },

  { id: 'apt_demo_7', clientId: 'cli_3', serviceId: 'srv_demo_3', date: todayISO(), time: '09:00', duration: 75, price: 65, status: 'completed', paymentMethod: 'twint', tip: 5, notes: '' },
  { id: 'apt_demo_8', clientId: 'cli_5', serviceId: 'srv_demo_1', date: todayISO(), time: '11:00', duration: 150, price: 130, status: 'confirmed', notes: 'Première pose, prévoir un peu plus de temps pour le conseil.' },
  { id: 'apt_demo_9', clientId: 'cli_4', serviceId: 'srv_demo_6', date: todayISO(), time: '15:00', duration: 60, price: 70, status: 'confirmed', notes: '' },
  { id: 'apt_demo_10', clientId: 'cli_1', serviceId: 'srv_demo_8', date: todayISO(), time: '17:00', duration: 30, price: 35, status: 'pending', notes: '' },

  { id: 'apt_demo_11', clientId: 'cli_2', serviceId: 'srv_demo_3', date: addDaysISO(todayISO(), 2), time: '10:00', duration: 75, price: 65, status: 'confirmed', notes: '' },
  { id: 'apt_demo_12', clientId: 'cli_5', serviceId: 'srv_demo_7', date: addDaysISO(todayISO(), 3), time: '14:30', duration: 45, price: 45, status: 'confirmed', notes: '' },
  { id: 'apt_demo_13', clientId: 'cli_3', serviceId: 'srv_demo_1', date: addDaysISO(todayISO(), 6), time: '09:00', duration: 150, price: 130, status: 'pending', notes: '' },
];

export const DEMO_CLIENTS = demoClients;
export const DEMO_PRODUCTS = demoProducts;
export const DEMO_MOVEMENTS = demoMovements;
export const DEMO_EXPENSES = demoExpenses;
