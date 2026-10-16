import { useEffect, useState } from 'react';
import { api } from '../../api/client';
import AccountsPanel, { type AdminTeam } from './AccountsPanel';
import TeamsPanel from './TeamsPanel';
import SettingsPanel from './SettingsPanel';
import HealthPanel from './HealthPanel';
import ExportPanel from './ExportPanel';
import AuditPage from '../audit/AuditPage';
import '../../pages/public.css';

// Admin uses the API for everything. Nothing here reads Firestore directly.
export default function AdminPage() {
  const [teams, setTeams] = useState<AdminTeam[]>([]);
  const [teamsError, setTeamsError] = useState('');

  useEffect(() => {
    api('/teams')
      .then((res) => setTeams(res as AdminTeam[]))
      .catch(() => setTeamsError('Could not load teams.'));
  }, []);

  return (
    <main className="admin">
      <h1>Admin</h1>

      <section className="card" aria-labelledby="accounts-heading">
        <h2 id="accounts-heading">Accounts and roles</h2>
        <AccountsPanel teams={teams} />
      </section>

      <section className="card" aria-labelledby="teams-heading">
        <h2 id="teams-heading">Teams</h2>
        {teamsError && <p role="alert">{teamsError}</p>}
        <TeamsPanel teams={teams} onChange={setTeams} />
      </section>

      <section className="card" aria-labelledby="system-heading">
        <h2 id="system-heading">System health and settings</h2>
        <HealthPanel />
        <SettingsPanel />
      </section>

      <section className="card" aria-labelledby="audit-heading">
        <h2 id="audit-heading">Audit and exports</h2>
        <ExportPanel />
        <AuditPage />
      </section>
    </main>
  );
}
