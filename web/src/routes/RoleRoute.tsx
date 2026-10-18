import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthProvider';
import PageLoading from '../components/PageLoading';
import type { Role } from '../types/domain';

interface RoleRouteProps {
  allow: Role[];
  children: ReactNode;
}

export default function RoleRoute({ allow, children }: RoleRouteProps) {
  const { user, role, loading } = useAuth();
  // Shown while the session is restored; the shared skeleton gives one status message and keeps a landmark.
  if (loading) {
    return <PageLoading label="Checking your account…" />;
  }
  if (!user) return <Navigate to="/login" replace />;
  if (!role || !allow.includes(role)) return <Navigate to="/forbidden" replace />;
  return children;
}
