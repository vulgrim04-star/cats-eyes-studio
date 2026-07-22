import { useWaitlistStore } from '../store/useWaitlistStore';
import { useUIStore } from '../store/useUIStore';

export function useWaitlist() {
  const entries = useWaitlistStore((s) => s.entries);
  const addEntryRaw = useWaitlistStore((s) => s.addEntry);
  const removeEntry = useWaitlistStore((s) => s.removeEntry);
  const showToast = useUIStore((s) => s.showToast);

  const addEntry = (data) => {
    addEntryRaw(data);
    showToast('Inscrite sur la liste d\'attente — le salon vous recontactera dès qu\'un créneau se libère', 'success');
  };

  return { entries, addEntry, removeEntry };
}
