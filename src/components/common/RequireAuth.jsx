import { Outlet } from 'react-router-dom';
import { useAuthStore } from '../../store/useAuthStore';
import { useSettingsStore } from '../../store/useSettingsStore';
import Login from '../../pages/Login';
import Onboarding from '../../pages/Onboarding';

export default function RequireAuth() {
  const session = useAuthStore((s) => s.session);
  const onboarded = useSettingsStore((s) => s.onboarded);

  if (!session) return <Login />;
  if (!onboarded) return <Onboarding />;
  return <Outlet />;
}
