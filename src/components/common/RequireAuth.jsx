import { Outlet } from 'react-router-dom';
import { useAuthStore } from '../../store/useAuthStore';
import { useSettingsStore } from '../../store/useSettingsStore';
import { isDemoActive } from '../../utils/demoMode';
import Login from '../../pages/Login';
import Onboarding from '../../pages/Onboarding';

export default function RequireAuth() {
  const session = useAuthStore((s) => s.session);
  const onboarded = useSettingsStore((s) => s.onboarded);

  // Le mode démonstration donne accès à l'application sans compte : les données sont
  // fictives et purement locales (voir utils/demoMode.js).
  if (isDemoActive()) return <Outlet />;
  if (!session) return <Login />;
  if (!onboarded) return <Onboarding />;
  return <Outlet />;
}
