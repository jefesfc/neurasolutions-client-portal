import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../../store/auth-store';
import { SessionGuard } from './SessionGuard';
import type { ReactNode } from 'react';

const DEMO_EMAIL = 'ldmrukuae@gmail.com';

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { isAuthenticated, user } = useAuthStore();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (user?.email === DEMO_EMAIL) return <SessionGuard>{children}</SessionGuard>;
  return <>{children}</>;
}
