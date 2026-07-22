import { useSettingsStore, WEEK_DAYS } from '../store/useSettingsStore';
import { useUIStore } from '../store/useUIStore';

/**
 * Couche d'accès aux paramètres du salon. Découplée du store interne
 * pour permettre un branchement futur sur une API sans changer les appelants.
 */
export function useSettings() {
  const salon = useSettingsStore((s) => s.salon);
  const notifications = useSettingsStore((s) => s.notifications);
  const appearance = useSettingsStore((s) => s.appearance);
  const updateSalonRaw = useSettingsStore((s) => s.updateSalon);
  const updateDayHours = useSettingsStore((s) => s.updateDayHours);
  const toggleNotification = useSettingsStore((s) => s.toggleNotification);
  const setThemeColorRaw = useSettingsStore((s) => s.setThemeColor);
  const showToast = useUIStore((s) => s.showToast);

  const updateSalon = (patch) => {
    updateSalonRaw(patch);
    showToast('Informations du salon mises à jour', 'success');
  };

  const setThemeColor = (color) => {
    setThemeColorRaw(color);
    showToast('Couleur de l\'interface mise à jour', 'success');
  };

  return { salon, notifications, appearance, updateSalon, updateDayHours, toggleNotification, setThemeColor };
}

export { WEEK_DAYS };
