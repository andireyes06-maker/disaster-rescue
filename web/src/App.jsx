import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './auth/AuthProvider.jsx';
import RoleRoute from './routes/RoleRoute.jsx';
import { landingFor } from './routes/landing.js';
import LoginPage from './features/auth/LoginPage.jsx';
import Forbidden from './pages/Forbidden.jsx';
import AppShell from './layout/AppShell.jsx';
import ReportQueue from './features/reports/ReportQueue.jsx';
import IncidentDetails from './features/reports/IncidentDetails.jsx';
import TeamsPage from './features/teams/TeamsPage';
import UsersPage from './features/users/UsersPage';
import AssignmentsPage from './features/responder/AssignmentsPage.jsx';

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
      <Route path="/dashboard" element={<RoleRoute allow={['dispatcher']}><AppShell title="Dashboard"><ReportQueue /></AppShell></RoleRoute>} />
      <Route path="/monitor" element={<RoleRoute allow={['dmo']}><AppShell title="Monitor"><ReportQueue /></AppShell></RoleRoute>} />
      <Route path="/incidents/:id" element={<RoleRoute allow={['dispatcher', 'dmo']}><AppShell title="Incident details"><IncidentDetails /></AppShell></RoleRoute>} />
      <Route path="/teams" element={<RoleRoute allow={['dispatcher']}><AppShell title="Teams"><TeamsPage /></AppShell></RoleRoute>} />
      <Route path="/users" element={<RoleRoute allow={['dispatcher']}><AppShell title="Users"><UsersPage /></AppShell></RoleRoute>} />
      <Route path="/assignments" element={<RoleRoute allow={['responder']}><AppShell title="Assignments"><AssignmentsPage /></AppShell></RoleRoute>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
