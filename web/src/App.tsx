import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './auth/AuthProvider';
import RoleRoute from './routes/RoleRoute';
import { landingFor } from './routes/landing';
import LoginPage from './features/auth/LoginPage';
import Forbidden from './pages/Forbidden';
import AppShell from './layout/AppShell';
import ReportQueue from './features/reports/ReportQueue';
import IncidentDetails from './features/reports/IncidentDetails';
import TeamsPage from './features/teams/TeamsPage';
import UsersPage from './features/users/UsersPage';
import AssignmentsPage from './features/responder/AssignmentsPage';
import IncidentMap from './features/map/IncidentMap';
import MonitorPage from './features/dmo/MonitorPage';

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
      <Route path="/monitor" element={<RoleRoute allow={['dmo']}><AppShell title="Monitor"><MonitorPage /></AppShell></RoleRoute>} />
      <Route path="/map" element={<RoleRoute allow={['dispatcher']}><AppShell title="Map"><IncidentMap /></AppShell></RoleRoute>} />
      <Route path="/incidents/:id" element={<RoleRoute allow={['dispatcher', 'dmo']}><AppShell title="Incident details"><IncidentDetails /></AppShell></RoleRoute>} />
      <Route path="/teams" element={<RoleRoute allow={['dispatcher']}><AppShell title="Teams"><TeamsPage /></AppShell></RoleRoute>} />
      <Route path="/users" element={<RoleRoute allow={['dispatcher']}><AppShell title="Users"><UsersPage /></AppShell></RoleRoute>} />
      <Route path="/assignments" element={<RoleRoute allow={['responder']}><AppShell title="Assignments"><AssignmentsPage /></AppShell></RoleRoute>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
