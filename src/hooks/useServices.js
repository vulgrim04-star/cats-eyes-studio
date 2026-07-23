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
  const addPromoRaw = useServicesStore((s) => s.addPromo);
  const updatePromoRaw = useServicesStore((s) => s.updatePromo);
  const removePromoRaw = useServicesStore((s) => s.removePromo);
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

  const addPromo = (data) => {
    const promo = addPromoRaw(data);
    showToast(`Code promo "${data.code}" créé`, 'success');
    return promo;
  };

  const updatePromo = (id, patch) => {
    updatePromoRaw(id, patch);
    showToast('Code promo mis à jour', 'success');
  };

  const removePromo = (id) => {
    removePromoRaw(id);
    showToast('Code promo supprimé', 'warning');
  };

  return { services, promoCodes, addService, updateService, removeService, togglePromo, addPromo, updatePromo, removePromo };
}

export function groupByCategory(services) {
  return services.reduce((acc, service) => {
    acc[service.category] = acc[service.category] || [];
    acc[service.category].push(service);
    return acc;
  }, {});
}
