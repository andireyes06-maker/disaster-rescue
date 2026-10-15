import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './auth/AuthProvider.jsx';
import RoleRoute from './routes/RoleRoute.jsx';
import { landingFor } from './routes/landing.js';
import LoginPage from './features/auth/LoginPage.jsx';
import Forbidden from './pages/Forbidden.jsx';
import Placeholder from './pages/Placeholder.jsx';

function Home() {
  const { user, role, loading } = useAuth();
  if (loading) return <p role="status" className="loading">Loading...</p>;
  return <Navigate to={user ? landingFor(role) : '/login'} replace />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/forbidden" element={<Forbidden />} />
      <Route path="/dashboard" element={<RoleRoute allow={['dispatcher']}><Placeholder title="Dashboard" /></RoleRoute>} />
      <Route path="/monitor" element={<RoleRoute allow={['dmo']}><Placeholder title="Monitor" /></RoleRoute>} />
      <Route path="/assignments" element={<RoleRoute allow={['responder']}><Placeholder title="Assignments" /></RoleRoute>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
