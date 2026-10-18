import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { api } from '../../api/client';
import { ChevronDown } from 'lucide-react';
import { useAuth } from '../../auth/AuthProvider';
import { Skeleton, SkeletonRows } from '../../components/calm/Skeleton';
import Banner from '../../components/calm/Banner';
import { Link } from 'react-router-dom';
import AccountsPanel, { type AdminTeam } from './AccountsPanel';
import TeamsPanel from './TeamsPanel';
import SettingsPanel from './SettingsPanel';
import HealthPanel from './HealthPanel';
// The audit log is its own chunk, loaded only when the admin page needs it (W14).
const AuditPage = lazy(() => import('../audit/AuditPage'));
import '../../pages/public.css';

// Admin uses the API for everything. Nothing here reads Firestore directly.
export default function AdminPage() {
  const { user } = useAuth();
  const [teams, setTeams] = useState<AdminTeam[]>([]);
  const [teamsError, setTeamsError] = useState('');
  const [teamsLoading, setTeamsLoading] = useState(true);
  const [teamsAttempt, setTeamsAttempt] = useState(0);
  const retryTeamsFocus = useRef(false);

  useEffect(() => {
    let cancelled = false;
    setTeamsLoading(true);
    setTeamsError('');
    api('/teams')
      .then((res) => {
        if (!Array.isArray(res)) throw new Error('Invalid teams response');
        if (!cancelled) setTeams(res as AdminTeam[]);
      })
      .catch(() => { if (!cancelled) setTeamsError('Could not load teams.'); })
      .finally(() => { if (!cancelled) setTeamsLoading(false); });
    return () => { cancelled = true; };
  }, [teamsAttempt]);
  useEffect(() => {
    if (teamsLoading || !retryTeamsFocus.current) return;
    retryTeamsFocus.current = false;
    if (document.activeElement !== document.body) return;
    if (teamsError) document.getElementById('admin-teams-retry')?.focus();
    else document.querySelector<HTMLElement>('.admin-teams input')?.focus();
  }, [teamsLoading, teamsError]);

  return (
    <div className="admin">
      <details className="admin-section" name="admin-panels" open>
        <summary><div><h2 id="accounts-heading">Accounts and roles</h2><p>Review access and assign staff roles.</p></div><ChevronDown size={20} aria-hidden="true" /></summary>
        <div className="admin-section__body"><AccountsPanel teams={teams} currentUid={user?.uid} teamsUnavailable={teamsLoading || !!teamsError} /></div>
      </details>
      <details className="admin-section" name="admin-panels">
        <summary><div><h2 id="teams-heading">Teams</h2><p>Create teams and maintain their names.</p></div><ChevronDown size={20} aria-hidden="true" /></summary>
        <div className="admin-section__body">
          {teamsLoading ? <Skeleton label="Loading teams"><SkeletonRows rows={3} height={64} /></Skeleton> : teamsError ? <Banner tone="error" role="alert">{teamsError} <button id="admin-teams-retry" type="button" className="btn btn--ghost" onClick={() => { retryTeamsFocus.current = true; setTeamsAttempt(value => value + 1); }}>Retry teams</button></Banner> : <TeamsPanel teams={teams} onChange={setTeams} />}
        </div>
      </details>
      <details className="admin-section" name="admin-panels">
        <summary><div><h2 id="system-heading">System health and settings</h2><p>Check services and manage resident guidance.</p></div><ChevronDown size={20} aria-hidden="true" /></summary>
        <div className="admin-section__body admin-system"><HealthPanel /><SettingsPanel /></div>
      </details>
      <details className="admin-section" name="admin-panels">
        <summary><div><h2 id="audit-heading">Audit and exports</h2><p>Review changes and find reporting exports.</p></div><ChevronDown size={20} aria-hidden="true" /></summary>
        <div className="admin-section__body">
          <p>Admins can download CSV and PDF summaries from Analytics. Exports include exact locations, so share them only with staff who need them.</p>
          <p><Link className="btn btn--ghost" to="/analytics">Open analytics and exports</Link></p>
          <Suspense fallback={<Skeleton label="Loading the audit log"><SkeletonRows rows={4} height={44} /></Skeleton>}><AuditPage /></Suspense>
        </div>
      </details>
    </div>
  );
}
