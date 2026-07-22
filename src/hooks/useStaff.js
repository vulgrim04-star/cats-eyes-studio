import { staff, getStaffById } from '../data/staff';

/**
 * Le personnel est statique pour cette phase (pas de CRUD RH).
 * Exposé en hook pour rester cohérent avec la couche d'accès aux données.
 */
export function useStaff() {
  return { staff, getStaffById };
}
