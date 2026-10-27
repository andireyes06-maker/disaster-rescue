import PasswordHelpPanel from './PasswordHelpPanel';
import { useAuth } from '../../auth/AuthProvider';
import { Link, useSearchParams } from 'react-router-dom';
import { ChevronDown, ArrowUpRight, Users, ShieldCheck, History, ChartNoAxesCombined } from 'lucide-react';
import AccountsPanel from './AccountsPanel';
import SettingsPanel from './SettingsPanel';
import HealthPanel from './HealthPanel';

export default function AdminPage() {
  const { user } = useAuth();
  const [params] = useSearchParams();
  return <div className="admin admin-workspace">
    <div className="admin-intro"><h2>Manage your response workspace</h2><p>Start with people and teams. Service controls are grouped separately below.</p></div>
    <nav className="admin-destinations" aria-label="Administration tasks">
      <Link to="/users"><span className="admin-task-icon"><Users size={21} aria-hidden="true" /></span><span><strong>Users</strong><small>Create accounts and manage membership</small></span><ArrowUpRight size={17} aria-hidden="true" /></Link>
      <Link to="/teams"><span className="admin-task-icon"><ShieldCheck size={21} aria-hidden="true" /></span><span><strong>Teams</strong><small>Manage team names and headquarters</small></span><ArrowUpRight size={17} aria-hidden="true" /></Link>
      <Link to="/audit"><span className="admin-task-icon"><History size={21} aria-hidden="true" /></span><span><strong>Audit log</strong><small>Review recorded account and incident changes</small></span><ArrowUpRight size={17} aria-hidden="true" /></Link>
      <Link to="/analytics"><span className="admin-task-icon"><ChartNoAxesCombined size={21} aria-hidden="true" /></span><span><strong>Analytics and exports</strong><small>Review patterns and download reports</small></span><ArrowUpRight size={17} aria-hidden="true" /></Link>
    </nav>
    <div className="admin-control-grid"><section className="admin-control-group"><div className="admin-group-heading"><h2>People and access</h2><p>Account recovery and role permissions.</p></div>
    <details className="admin-section" open>
      <summary><div><h2 id="help-heading">Password help requests</h2><p>Residents and staff who asked an administrator to reset their password.</p></div><ChevronDown size={20} aria-hidden="true" /></summary>
      <div className="admin-section__body"><PasswordHelpPanel /></div>
    </details>
    <details className="admin-section" open={params.get('panel') === 'roles' || undefined}>
      <summary><div><h2 id="roles-heading">Access roles</h2><p>Review or change an account’s access level.</p></div><ChevronDown size={20} aria-hidden="true" /></summary>
      <div className="admin-section__body"><AccountsPanel teams={[]} currentUid={user?.uid} rolesOnly /></div>
    </details>
    </section><section className="admin-control-group"><div className="admin-group-heading"><h2>Service operations</h2><p>Availability, contact information and resident guidance.</p></div>
    <details className="admin-section admin-settings-panel" open>
      <summary><div><h2 id="system-heading">System health and settings</h2><p>Check availability and maintain resident guidance.</p></div><ChevronDown size={20} aria-hidden="true" /></summary>
      <div className="admin-system"><section aria-label="Service availability"><HealthPanel /></section><section aria-labelledby="guidance-heading"><h3 id="guidance-heading">Resident guidance</h3><SettingsPanel /></section></div>
    </details>
    </section></div>
  </div>;
}
