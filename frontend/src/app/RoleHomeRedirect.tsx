import { Navigate } from 'react-router-dom';
import { useAuth } from '@/auth/useAuth';
import { roleHome } from '@/lib/role-home';

export function RoleHomeRedirect() {
  const { payload } = useAuth();
  return <Navigate to={payload ? roleHome(payload.role) : '/login'} replace />;
}
