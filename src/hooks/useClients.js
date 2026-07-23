import { useMemo } from 'react';
import { useClientsStore } from '../store/useClientsStore';
import { useUIStore } from '../store/useUIStore';

/**
 * Couche d'accès aux données clientes. Découplée du store interne (zustand)
 * pour permettre un branchement futur sur une API sans changer les appelants.
 */
export function useClients() {
  const clients = useClientsStore((s) => s.clients);
  const addClient = useClientsStore((s) => s.addClient);
  const updateClient = useClientsStore((s) => s.updateClient);
  const removeClientRaw = useClientsStore((s) => s.removeClient);
  const showToast = useUIStore((s) => s.showToast);
  const signConsent = useClientsStore((s) => s.signConsent);
  const signLashMapConsent = useClientsStore((s) => s.signLashMapConsent);
  const addNote = useClientsStore((s) => s.addNote);
  const addPhotoSession = useClientsStore((s) => s.addPhotoSession);
  const updatePhotoSession = useClientsStore((s) => s.updatePhotoSession);
  const removePhotoSession = useClientsStore((s) => s.removePhotoSession);
  const addLashMap = useClientsStore((s) => s.addLashMap);
  const updateLashMap = useClientsStore((s) => s.updateLashMap);
  const removeLashMap = useClientsStore((s) => s.removeLashMap);

  const removeClient = (id) => {
    removeClientRaw(id);
    showToast('Fiche cliente supprimée', 'warning');
  };

  return {
    clients,
    addClient,
    updateClient,
    removeClient,
    signConsent,
    signLashMapConsent,
    addNote,
    addPhotoSession,
    updatePhotoSession,
    removePhotoSession,
    addLashMap,
    updateLashMap,
    removeLashMap,
  };
}

export function useClient(clientId) {
  return useClientsStore(useMemo(() => (s) => s.clients.find((c) => c.id === clientId), [clientId]));
}

export function searchClients(clients, query) {
  if (!query.trim()) return clients;
  const q = query.trim().toLowerCase();
  return clients.filter((c) =>
    `${c.firstName} ${c.lastName}`.toLowerCase().includes(q) ||
    c.phone.replace(/\s/g, '').includes(q.replace(/\s/g, '')) ||
    c.email.toLowerCase().includes(q)
  );
}
