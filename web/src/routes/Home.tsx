import { Navigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthProvider';
import Landing from '../pages/Landing';
import { landingFor } from './landing';
import LandingLoading from '../components/LandingLoading';

export default function Home() {
  const { user, role, loading } = useAuth();
  if (loading) return <LandingLoading />;
  if (!user) return <Landing />;
  return <Navigate to={landingFor(role)} replace />;
}
