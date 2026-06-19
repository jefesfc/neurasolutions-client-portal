import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../../store/auth-store';
import { SessionGuard } from './SessionGuard';
import type { ReactNode } from 'react';

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <SessionGuard>{children}</SessionGuard>;
}
