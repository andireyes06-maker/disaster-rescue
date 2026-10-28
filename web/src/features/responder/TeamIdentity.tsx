import { ShieldCheck, MapPin } from 'lucide-react';
import { useOwnTeam } from './useOwnTeam';
import PlaceLabel from '../../components/PlaceLabel';
export default function TeamIdentity({ id }: { id: string }) {
  const state = useOwnTeam(id);
  return <div className="response-team">
    <ShieldCheck size={22} aria-hidden="true" />
    <div><strong>{state.team?.name || (state.loading ? 'Loading your team…' : 'Your rescue team')}</strong>
    {state.team && <div className="response-team-meta">{state.team.kind === 'Other' ? state.team.kindLabel || 'Rescue' : state.team.kind || 'Rescue'}{state.team.hq && <details className="response-team-hq"><summary><MapPin size={14} aria-hidden="true" />Headquarters</summary><PlaceLabel point={state.team.hq} saved={state.team.hqName} /></details>}</div>}
    {state.failed && <p>Team details could not load. <button type="button" className="text-button" onClick={state.retry}>Try team details again</button></p>}</div>
  </div>;
}
