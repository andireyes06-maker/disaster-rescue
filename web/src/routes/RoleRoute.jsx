import { Navigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthProvider.jsx';

export default function RoleRoute({ allow, children }) {
  const { user, role, loading } = useAuth();
  if (loading) return <p role="status" className="loading">Loading...</p>;
  if (!user) return <Navigate to="/login" replace />;
  if (!allow.includes(role)) return <Navigate to="/forbidden" replace />;
  return children;
}
