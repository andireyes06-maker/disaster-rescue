import { ShieldCheck, MapPin } from 'lucide-react';
import { useOwnTeam } from './useOwnTeam';
import PlaceLabel from '../../components/PlaceLabel';
export default function TeamIdentity({ id }: { id: string }) {
  const state = useOwnTeam(id);
  return <div className="response-team">
    <ShieldCheck size={22} aria-hidden="true" />
    <div><strong>{state.team?.name || (state.loading ? 'Loading your team…' : 'Your rescue team')}</strong>
    {state.team && <p>{state.team.kind === 'Other' ? state.team.kindLabel || 'Rescue' : state.team.kind || 'Rescue'}{state.team.hq && <> · <MapPin size={13} aria-hidden="true" /> <PlaceLabel point={state.team.hq} saved={state.team.hqName} /></>}</p>}
    {state.failed && <p>Team details could not load. <button type="button" className="text-button" onClick={state.retry}>Try team details again</button></p>}</div>
  </div>;
}
