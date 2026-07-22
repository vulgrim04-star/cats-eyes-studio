import { Outlet } from 'react-router-dom';
import { useAuthStore } from '../../store/useAuthStore';
import Login from '../../pages/Login';

export default function RequireAuth() {
  const session = useAuthStore((s) => s.session);

  if (!session) return <Login />;
  return <Outlet />;
}
