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

const LoginPage = lazy(() => import('./features/auth/LoginPage'));
const ResidentSignUp = lazy(() => import('./features/resident/ResidentSignUp'));
const ResidentDashboard = lazy(() => import('./features/resident/ResidentDashboard'));
const ReportForm = lazy(() => import('./features/resident/ReportForm'));
const ResidentLayout = lazy(() => import('./features/resident/ResidentLayout'));
const ResidentReportDetail = lazy(() => import('./features/resident/ResidentReportDetail'));
const NotFound = lazy(() => import('./pages/NotFound'));
const Forbidden = lazy(() => import('./pages/Forbidden'));
const AppShell = lazy(() => import('./layout/AppShell'));
const ReportQueue = lazy(() => import('./features/reports/ReportQueue'));
const IncidentDetails = lazy(() => import('./features/reports/IncidentDetails'));
const TeamsPage = lazy(() => import('./features/teams/TeamsPage'));
const UsersPage = lazy(() => import('./features/users/UsersPage'));
const AssignmentsPage = lazy(() => import('./features/responder/AssignmentsPage'));
const ClosedReportPage = lazy(() => import('./features/responder/ClosedReportDetail'));
const IncidentMap = lazy(() => import('./features/map/IncidentMap'));
const MonitorPage = lazy(() => import('./features/dmo/MonitorPage'));
const AnalyticsPage = lazy(() => import('./features/analytics/AnalyticsPage'));
const AuditPage = lazy(() => import('./features/audit/AuditPage'));
const AdminPage = lazy(() => import('./features/admin/AdminPage'));

export default function App() {
  const { pathname } = useLocation();
  return (
    <><ProductMotion /><ConnectionStatus /><PageBoundary resetKey={pathname}><Suspense fallback={<PageLoading />}><Routes>
      <Route path="/" element={<Home />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<ResidentSignUp />} />
      <Route path="/my" element={<RoleRoute allow={['resident']}><ResidentLayout title="My reports" description="Track the reports you sent and see updates from the response team."><ResidentDashboard /></ResidentLayout></RoleRoute>} />
      <Route path="/my/report" element={<RoleRoute allow={['resident']}><ResidentLayout title="Report an emergency" description="Describe what is happening and where. Staff review every report before a rescue team is assigned."><ReportForm /></ResidentLayout></RoleRoute>} />
      <Route path="/my/reports/:id" element={<RoleRoute allow={['resident']}><ResidentLayout title="Report details" description="Current status, what you sent, and the response history."><ResidentReportDetail /></ResidentLayout></RoleRoute>} />
      <Route path="/admin" element={<RoleRoute allow={['admin']}><AppShell title="Admin"><AdminPage /></AppShell></RoleRoute>} />
      <Route path="/forbidden" element={<Forbidden />} />
      <Route path="/dashboard" element={<RoleRoute allow={['dispatcher', 'admin']}><AppShell title="Dashboard"><ReportQueue /></AppShell></RoleRoute>} />
      <Route path="/analytics" element={<RoleRoute allow={['dispatcher', 'dmo', 'admin']}><AppShell title="Analytics"><AnalyticsPage /></AppShell></RoleRoute>} />
      <Route path="/audit" element={<RoleRoute allow={['dispatcher', 'admin']}><AppShell title="Audit log"><AuditPage /></AppShell></RoleRoute>} />
      <Route path="/monitor" element={<RoleRoute allow={['dmo', 'admin']}><AppShell title="Monitor"><MonitorPage /></AppShell></RoleRoute>} />
      <Route path="/map" element={<RoleRoute allow={['dispatcher', 'admin']}><AppShell title="Map"><IncidentMap /></AppShell></RoleRoute>} />
      <Route path="/incidents/:id" element={<RoleRoute allow={['dispatcher', 'dmo', 'admin']}><AppShell title="Incident details"><IncidentDetails /></AppShell></RoleRoute>} />
      <Route path="/teams" element={<RoleRoute allow={['dispatcher', 'admin']}><AppShell title="Teams"><TeamsPage /></AppShell></RoleRoute>} />
      <Route path="/users" element={<RoleRoute allow={['dispatcher', 'admin']}><AppShell title="Users"><UsersPage /></AppShell></RoleRoute>} />
      <Route path="/assignments" element={<RoleRoute allow={['responder', 'admin']}><AppShell title="Assignments"><AssignmentsPage /></AppShell></RoleRoute>} />
      <Route path="/assignments/:id" element={<RoleRoute allow={['responder']}><AppShell title="Assignment"><ClosedReportPage /></AppShell></RoleRoute>} />
      <Route path="*" element={<NotFound />} />
    </Routes></Suspense></PageBoundary></>
  );
}
