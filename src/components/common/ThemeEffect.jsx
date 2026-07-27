import { useEffect } from 'react';
import { useSettingsStore } from '../../store/useSettingsStore';
import { APP_NAME } from '../../data/brand';

/** Applique le mode sombre et le nom du salon (Paramètres) aux éléments globaux de la page.
 *  Les nuances d'accent ne sont plus calculées ici : Cat's Eyes a désormais une identité
 *  unique, définie une fois pour toutes dans styles/variables.css. */
export default function ThemeEffect() {
  const darkMode = useSettingsStore((s) => s.appearance.darkMode);
  const salonName = useSettingsStore((s) => s.salon.name);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', darkMode ? 'dark' : 'light');
  }, [darkMode]);

  useEffect(() => {
    document.title = salonName || APP_NAME;
  }, [salonName]);

  return null;
}
