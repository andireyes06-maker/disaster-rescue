import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import RoleRoute from './routes/RoleRoute';
import Home from './routes/Home';
import LoginPage from './features/auth/LoginPage';
import Forbidden from './pages/Forbidden';
import AppShell from './layout/AppShell';
const ReportQueue = lazy(() => import('./features/reports/ReportQueue'));
const IncidentDetails = lazy(() => import('./features/reports/IncidentDetails'));
const TeamsPage = lazy(() => import('./features/teams/TeamsPage'));
const UsersPage = lazy(() => import('./features/users/UsersPage'));
const AssignmentsPage = lazy(() => import('./features/responder/AssignmentsPage'));
const IncidentMap = lazy(() => import('./features/map/IncidentMap'));
const MonitorPage = lazy(() => import('./features/dmo/MonitorPage'));
const AnalyticsPage = lazy(() => import('./features/analytics/AnalyticsPage'));
const AuditPage = lazy(() => import('./features/audit/AuditPage'));

export default function App() {
  return (
    <Suspense fallback={<p className="loading" role="status">Loading page…</p>}><Routes>
      <Route path="/" element={<Home />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/forbidden" element={<Forbidden />} />
      <Route path="/dashboard" element={<RoleRoute allow={['dispatcher']}><AppShell title="Dashboard"><ReportQueue /></AppShell></RoleRoute>} />
      <Route path="/analytics" element={<RoleRoute allow={['dispatcher', 'dmo']}><AppShell title="Analytics"><AnalyticsPage /></AppShell></RoleRoute>} />
      <Route path="/audit" element={<RoleRoute allow={['dispatcher']}><AppShell title="Audit log"><AuditPage /></AppShell></RoleRoute>} />
      <Route path="/monitor" element={<RoleRoute allow={['dmo']}><AppShell title="Monitor"><MonitorPage /></AppShell></RoleRoute>} />
      <Route path="/map" element={<RoleRoute allow={['dispatcher']}><AppShell title="Map"><IncidentMap /></AppShell></RoleRoute>} />
      <Route path="/incidents/:id" element={<RoleRoute allow={['dispatcher', 'dmo']}><AppShell title="Incident details"><IncidentDetails /></AppShell></RoleRoute>} />
      <Route path="/teams" element={<RoleRoute allow={['dispatcher']}><AppShell title="Teams"><TeamsPage /></AppShell></RoleRoute>} />
      <Route path="/users" element={<RoleRoute allow={['dispatcher']}><AppShell title="Users"><UsersPage /></AppShell></RoleRoute>} />
      <Route path="/assignments" element={<RoleRoute allow={['responder']}><AppShell title="Assignments"><AssignmentsPage /></AppShell></RoleRoute>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes></Suspense>
  );
}
