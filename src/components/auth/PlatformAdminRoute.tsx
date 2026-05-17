import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../../store/auth-store';
import type { ReactNode } from 'react';

export function PlatformAdminRoute({ children }: { children: ReactNode }) {
  const user = useAuthStore((s) => s.user);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (!user?.is_platform_admin) return <Navigate to="/" replace />;

  return <>{children}</>;
}
