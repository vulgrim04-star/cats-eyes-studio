import { useEffect } from 'react';
import { useSettingsStore } from '../../store/useSettingsStore';
import { deriveThemeShades } from '../../utils/color';

/** Applique la couleur de thème, le mode sombre et le nom du salon (Paramètres) aux éléments globaux de la page. */
export default function ThemeEffect() {
  const themeColor = useSettingsStore((s) => s.appearance.themeColor);
  const darkMode = useSettingsStore((s) => s.appearance.darkMode);
  const salonName = useSettingsStore((s) => s.salon.name);

  useEffect(() => {
    const { base, dark, light } = deriveThemeShades(themeColor, darkMode);
    const root = document.documentElement.style;
    root.setProperty('--color-rose', base);
    root.setProperty('--color-rose-dark', dark);
    root.setProperty('--color-rose-light', light);
    document.documentElement.setAttribute('data-theme', darkMode ? 'dark' : 'light');
  }, [themeColor, darkMode]);

  useEffect(() => {
    document.title = salonName || 'Cats Eyes Studio';
  }, [salonName]);

  return null;
}
