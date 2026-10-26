import { useEffect, useState } from 'react';
import { api } from '../../api/client';

export interface TeamSummaryData {
  teamId: string | null;
  total: number;
  open: number;
  resolved: number;
  byStatus: Record<string, number>;
  peopleRescued: number;
}

// Counts for the signed-in responder's own team only. Shows nothing if it cannot load.
export default function TeamSummary({ team }: { team: string }) {
  const [data, setData] = useState<TeamSummaryData | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let active = true;
    setData(null);
    setFailed(false);
    Promise.resolve()
      .then(() => api('/stats/team'))
      .then((body) => { if (active && body && typeof body === 'object') setData(body as TeamSummaryData); })
      .catch(() => { if (active) setFailed(true); });
    return () => { active = false; };
  }, [team]);

  if (failed || !data) return null;

  return (
    <section className="card team-summary" aria-labelledby="team-summary-title">
      <h2 id="team-summary-title">Your team</h2>
      <dl className="team-summary__stats">
        <div><dt>Assigned reports</dt><dd>{data.total}</dd></div>
        <div><dt>Open</dt><dd>{data.open}</dd></div>
        <div><dt>Resolved or closed</dt><dd>{data.resolved}</dd></div>
        <div><dt>People rescued</dt><dd>{data.peopleRescued}</dd></div>
      </dl>
      <p className="team-summary__note">Totals for your team only, from reports and updates logged in the app or on this website.</p>
    </section>
  );
}
