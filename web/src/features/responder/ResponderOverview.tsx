import { Link } from 'react-router-dom';
import { ArrowUpRight, Map, ClipboardCheck } from 'lucide-react';
import { useAuth } from '../../auth/AuthProvider';
import Banner from '../../components/calm/Banner';
import EmptyState from '../../components/calm/EmptyState';
import { Skeleton, SkeletonRows } from '../../components/calm/Skeleton';
import { ConnectionNotice } from '../../components/ConnectionStatus';
import { useAssignedReports } from './useAssignedReports';
import TeamIdentity from './TeamIdentity';
import TeamSummary from './TeamSummary';
import AssignmentRows from './AssignmentRows';
import { DraftShelf } from './AssignmentsPage';
export default function ResponderOverview() {
  const { team, user } = useAuth();
  const state = useAssignedReports(team);
  const revision = state.reports.map(r => `${r.id}|${r.status}|${r.updatedAt instanceof Date ? r.updatedAt.getTime() : ''}`).join(';');
  if (!team) return <EmptyState title="Your account is not linked to a rescue team" body="Your administrator needs to link your account before assignments can be shown." />;
  return <div className="response-workspace"><TeamIdentity id={team} />
    <section className="response-welcome"><div><h2>Ready for the next response, {user?.displayName?.split(' ')[0] || 'rescuer'}.</h2><p>Your team’s active work, locations and progress in one place.</p></div><Link to="/team-map" className="btn btn--ghost"><Map size={17} aria-hidden="true" />Open team map</Link></section>
    <ConnectionNotice fromCache={state.fromCache} />
    {(state.error || state.partialError) && <Banner tone="error" role="alert">Assignments could not load completely. <button className="btn btn--ghost" type="button" onClick={state.retry}>Retry assignments</button></Banner>}
    <section className="response-list-panel"><div className="response-section-head"><h2><ClipboardCheck size={20} aria-hidden="true" /> Current assignments</h2><Link to="/assignments">View all <ArrowUpRight size={15} aria-hidden="true" /></Link></div>
      {state.loading && <Skeleton label="Loading current assignments"><SkeletonRows rows={2} height={90} /></Skeleton>}
      {!state.loading && !state.error && !state.partialError && !state.reports.length && <EmptyState title="No open assignments right now" body="New work appears automatically. You can review completed reports in Recently closed." action={<Link className="btn btn--ghost" to="/assignments?view=closed">View recently closed</Link>} />}
      {!!state.reports.length && <><p className="response-scope">Oldest reported first · showing up to three from your loaded assignments</p><AssignmentRows reports={state.reports.slice(0, 3)} /></>}
    </section>
    <TeamSummary team={team} revision={revision} /><DraftShelf />
  </div>;
}
