import { useServicesStore } from '../store/useServicesStore';

export const SERVICE_CATEGORIES = [
  { id: 'cils', label: 'Extensions de cils' },
  { id: 'sourcils', label: 'Sourcils' },
  { id: 'soins', label: 'Soins' },
  { id: 'forfaits', label: 'Forfaits' },
];

// Les prestations sont créées/modifiées par la gérante (Catalogue) : on résout
// toujours via le store live plutôt qu'un jeu de données statique, sinon les
// prestations personnalisées n'apparaîtraient pas dans l'agenda ni les stats.
export const getServiceById = (id) => useServicesStore.getState().services.find((s) => s.id === id);
export const getCategoryLabel = (id) => SERVICE_CATEGORIES.find((c) => c.id === id)?.label ?? id;
