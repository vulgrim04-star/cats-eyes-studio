import { useServicesStore } from '../store/useServicesStore';
import { useUIStore } from '../store/useUIStore';

/**
 * Couche d'accès aux données du catalogue de prestations. Découplée du store
 * interne pour permettre un branchement futur sur une API sans changer les appelants.
 */
export function useServices() {
  const services = useServicesStore((s) => s.services);
  const promoCodes = useServicesStore((s) => s.promoCodes);
  const addServiceRaw = useServicesStore((s) => s.addService);
  const updateServiceRaw = useServicesStore((s) => s.updateService);
  const removeServiceRaw = useServicesStore((s) => s.removeService);
  const togglePromo = useServicesStore((s) => s.togglePromo);
  const showToast = useUIStore((s) => s.showToast);

  const addService = (data) => {
    const service = addServiceRaw(data);
    showToast(`Prestation "${data.name}" ajoutée au catalogue`, 'success');
    return service;
  };

  const updateService = (id, patch) => {
    updateServiceRaw(id, patch);
    showToast('Prestation mise à jour', 'success');
  };

  const removeService = (id) => {
    removeServiceRaw(id);
    showToast('Prestation supprimée du catalogue', 'warning');
  };

  return { services, promoCodes, addService, updateService, removeService, togglePromo };
}

export function groupByCategory(services) {
  return services.reduce((acc, service) => {
    acc[service.category] = acc[service.category] || [];
    acc[service.category].push(service);
    return acc;
  }, {});
}
