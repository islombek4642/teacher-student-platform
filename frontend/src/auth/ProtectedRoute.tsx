import { Navigate, Outlet } from 'react-router-dom';
import type { Role } from '@/api/types';
import { roleHome } from '@/lib/role-home';
import { useAuth } from './useAuth';

export function ProtectedRoute({ allowedRoles }: { allowedRoles: Role[] }) {
  const { token, payload } = useAuth();

  if (!token || !payload) {
    return <Navigate to="/login" replace />;
  }
  if (!allowedRoles.includes(payload.role)) {
    return <Navigate to={roleHome(payload.role)} replace />;
  }
  return <Outlet />;
}
