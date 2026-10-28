import { useEffect, useState } from 'react';
import { api } from '../../api/client';
import Banner from '../../components/calm/Banner';
export interface TeamSummaryData {
  teamId: string | null;
  total: number; open: number; resolved: number;
  byStatus: Record<string, number>;
  peopleRescued: number;
}
// Live report changes invalidate this server aggregate; counts are never presented as shift totals.
export default function TeamSummary({ team, revision = '' }: { team: string; revision?: string }) {
  const [state, setState] = useState<{ team: string; data: TeamSummaryData | null; failed: boolean; loading: boolean }>({ team, data: null, failed: false, loading: true });
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    setState(s => ({ team, data: s.team === team ? s.data : null, failed: false, loading: true }));
    const timer = window.setTimeout(() => {
      Promise.resolve().then(() => api('/stats/team')).then(body => {
        if (!body || typeof body !== 'object' || (body as TeamSummaryData).teamId !== team) throw new Error('missing stats');
        if (active) setState({ team, data: body as TeamSummaryData, failed: false, loading: false });
      }).catch(() => { if (active) setState(s => ({ ...s, failed: true, loading: false })); });
    }, 150);
    return () => { active = false; window.clearTimeout(timer); };
  }, [team, revision, attempt]);
  const data = state.team === team ? state.data : null;
  return <section className="response-totals" aria-labelledby="team-summary-title" aria-busy={state.loading}>
    <div className="response-section-head"><h2 id="team-summary-title">Team activity</h2><div className="response-total-controls"><span>Recorded totals · all time</span><button type="button" className="btn btn--ghost" aria-disabled={state.loading} onClick={() => { if (!state.loading) setAttempt(n => n + 1); }}>Refresh totals</button></div></div>
    {state.failed && <Banner tone="error" role="alert">Team totals could not refresh.{data ? ' Previously loaded totals are shown.' : ''} <button type="button" className="btn btn--ghost" onClick={() => setAttempt(n => n + 1)}>Retry totals</button></Banner>}
    {!data && state.loading && <p role="status">Loading team totals…</p>}
    {data && <dl className="response-totals__values">
      <div><dt>Assigned</dt><dd>{data.total}</dd></div><div><dt>Open</dt><dd>{data.open}</dd></div>
      <div><dt>Resolved or closed</dt><dd>{data.resolved}</dd></div><div><dt>People rescued</dt><dd>{data.peopleRescued}</dd></div>
    </dl>}
  </section>;
}
