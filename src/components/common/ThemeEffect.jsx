import { useEffect } from 'react';
import { useSettingsStore } from '../../store/useSettingsStore';
import { deriveThemeShades } from '../../utils/color';

/** Applique la couleur de thème choisie dans les Paramètres aux variables CSS globales. */
export default function ThemeEffect() {
  const themeColor = useSettingsStore((s) => s.appearance.themeColor);

  useEffect(() => {
    const { base, dark, light } = deriveThemeShades(themeColor);
    const root = document.documentElement.style;
    root.setProperty('--color-rose', base);
    root.setProperty('--color-rose-dark', dark);
    root.setProperty('--color-rose-light', light);
  }, [themeColor]);

  return null;
}
