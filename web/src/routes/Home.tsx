import { Navigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthProvider';
import Landing from '../pages/Landing';
import { landingFor } from './landing';

export default function Home() {
  const { user, role, loading } = useAuth();
  if (loading) return <p role="status" className="loading">Loading...</p>;
  if (!user) return <Landing />;
  return <Navigate to={landingFor(role)} replace />;
}
