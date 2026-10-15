import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthProvider';
import type { Role } from '../types/domain';

interface RoleRouteProps {
  allow: Role[];
  children: ReactNode;
}

export default function RoleRoute({ allow, children }: RoleRouteProps) {
  const { user, role, loading } = useAuth();
  if (loading) return <p role="status" className="loading">Loading...</p>;
  if (!user) return <Navigate to="/login" replace />;
  if (!role || !allow.includes(role)) return <Navigate to="/forbidden" replace />;
  return children;
}
