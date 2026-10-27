import { lazy, Suspense } from 'react';
import { Route, Routes, useLocation } from 'react-router-dom';
import RoleRoute from './routes/RoleRoute';
import Home from './routes/Home';
import ProductMotion from './components/ProductMotion';
import PageLoading from './components/PageLoading';
import PageBoundary from './components/PageBoundary';
import { ConnectionStatus } from './components/ConnectionStatus';
import './product.css';
import './pages/page-finish.css';
import './admin-workspace.css';

const LoginPage = lazy(() => import('./features/auth/LoginPage'));
const MobileAppNotice = lazy(() => import('./pages/MobileAppNotice'));
const NotFound = lazy(() => import('./pages/NotFound'));
const Forbidden = lazy(() => import('./pages/Forbidden'));
const AppShell = lazy(() => import('./layout/AppShell'));
const ReportQueue = lazy(() => import('./features/reports/ReportQueue'));
const IncidentDetails = lazy(() => import('./features/reports/IncidentDetails'));
const TeamsPage = lazy(() => import('./features/teams/TeamsPage'));
const UsersPage = lazy(() => import('./features/users/UsersPage'));
const IncidentMap = lazy(() => import('./features/map/IncidentMap'));
const MonitorPage = lazy(() => import('./features/dmo/MonitorPage'));
const AnalyticsPage = lazy(() => import('./features/analytics/AnalyticsPage'));
const AuditPage = lazy(() => import('./features/audit/AuditPage'));
const AdminPage = lazy(() => import('./features/admin/AdminPage'));
const AssignmentsPage = lazy(() => import('./features/responder/AssignmentsPage'));
const ClosedReportPage = lazy(() => import('./features/responder/ClosedReportDetail'));

export default function App() {
  const { pathname } = useLocation();
  return (
    <><ProductMotion /><ConnectionStatus /><PageBoundary resetKey={pathname}><Suspense fallback={<PageLoading />}><Routes>
      <Route path="/" element={<Home />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<MobileAppNotice />} />
      <Route path="/my" element={<MobileAppNotice />} />
      <Route path="/my/report" element={<MobileAppNotice />} />
      <Route path="/my/reports/:id" element={<MobileAppNotice />} />
      <Route path="/admin" element={<RoleRoute allow={['admin']}><AppShell title="Admin"><AdminPage /></AppShell></RoleRoute>} />
      <Route path="/forbidden" element={<Forbidden />} />
      <Route path="/dashboard" element={<RoleRoute allow={['admin']}><AppShell title="Dashboard"><ReportQueue /></AppShell></RoleRoute>} />
      <Route path="/analytics" element={<RoleRoute allow={['admin']}><AppShell title="Analytics"><AnalyticsPage /></AppShell></RoleRoute>} />
      <Route path="/audit" element={<RoleRoute allow={['admin']}><AppShell title="Audit log"><AuditPage /></AppShell></RoleRoute>} />
      <Route path="/monitor" element={<RoleRoute allow={['admin']}><AppShell title="Monitor"><MonitorPage /></AppShell></RoleRoute>} />
      <Route path="/map" element={<RoleRoute allow={['admin']}><AppShell title="Map"><IncidentMap /></AppShell></RoleRoute>} />
      <Route path="/incidents/:id" element={<RoleRoute allow={['admin']}><AppShell title="Incident details"><IncidentDetails /></AppShell></RoleRoute>} />
      <Route path="/teams" element={<RoleRoute allow={['admin']}><AppShell title="Teams"><TeamsPage /></AppShell></RoleRoute>} />
      <Route path="/users" element={<RoleRoute allow={['admin']}><AppShell title="Users"><UsersPage /></AppShell></RoleRoute>} />
      <Route path="/assignments" element={<RoleRoute allow={['responder']}><AppShell title="Assignments"><AssignmentsPage /></AppShell></RoleRoute>} />
      <Route path="/assignments/:id" element={<RoleRoute allow={['responder']}><AppShell title="Assignment"><ClosedReportPage /></AppShell></RoleRoute>} />
      <Route path="*" element={<NotFound />} />
    </Routes></Suspense></PageBoundary></>
  );
}
