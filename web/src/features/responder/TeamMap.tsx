import { useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Link } from 'react-router-dom';
import { useAuth } from '../../auth/AuthProvider';
import { useAssignedReports } from './useAssignedReports';
import { useOwnTeam } from './useOwnTeam';
import TeamIdentity from './TeamIdentity';
import AssignmentRows from './AssignmentRows';
import { AssignmentMap, validPoint, directionsUrl } from './AssignmentMap';
import StatusBadge from '../reports/StatusBadge';
import PriorityBadge from '../reports/PriorityBadge';
import { DisasterSymbol } from '../map/disasterSymbols';
import PlaceLabel from '../../components/PlaceLabel';
import { MapPin, Navigation, ArrowUpRight } from 'lucide-react';
import { ConnectionNotice } from '../../components/ConnectionStatus';
import ReportWindow from '../../components/ReportWindow';
import EmptyState from '../../components/calm/EmptyState';
import Banner from '../../components/calm/Banner';
import { Skeleton, SkeletonRows } from '../../components/calm/Skeleton';
import { typeLabel } from '../../lib/reportTypes';
export default function TeamMap() {
  const { team } = useAuth();
  const state = useAssignedReports(team);
  const own = useOwnTeam(team);
  const [params, setParams] = useSearchParams();
  const selectedRef = useRef<HTMLDivElement>(null);
  const requested = state.reports.find(r => r.id === params.get('report'));
  const selected = validPoint(requested?.location) ? requested : undefined;
  useEffect(() => { if (selected) selectedRef.current?.focus(); }, [selected?.id]);
  if (!team) return <EmptyState title="Your account is not linked to a rescue team" body="Team locations are available after your administrator links your account." />;
  return <div className="response-workspace"><TeamIdentity id={team} />
    <ConnectionNotice fromCache={state.fromCache} />
    {(state.error || state.partialError) && <Banner tone="error" role="alert">Some team assignments could not load. The map may be incomplete. <button className="btn btn--ghost" type="button" onClick={state.retry}>Try again</button></Banner>}
    {requested && !selected && <Banner tone="info" role="status">This assignment has no valid map pin. Open its report brief from the list below.</Banner>}
    {own.failed && <Banner tone="error" role="alert">Your headquarters could not load. <button className="btn btn--ghost" type="button" onClick={own.retry}>Retry headquarters</button></Banner>}
    {state.loading ? <Skeleton label="Loading team map"><SkeletonRows rows={2} height={180} /></Skeleton> : <section className="response-map-panel">
      <div className="response-section-head"><h2>Your team on the map</h2><span>{state.reports.filter(r => validPoint(r.location)).length} located in the loaded window</span></div>
      <div className={`response-map-layout${selected ? ' has-selection' : ''}`}>
        <AssignmentMap reports={state.reports} hq={own.team?.hq} selected={selected} onSelect={r => setParams({ report: r.id }, { replace: true })} />
        {selected && <aside ref={selectedRef} tabIndex={-1} className="response-map-selection" role="region" aria-label="Selected assignment">
          <div className={`response-incident-symbol response-type--${selected.type}`}><DisasterSymbol type={selected.type} /></div>
          <div className="response-selection-heading"><h3>{selected.reference || `${typeLabel(selected.type, selected.typeDetail)} report`}</h3><div className="response-selection-badges"><PriorityBadge priority={selected.priority} /><StatusBadge status={selected.status} /></div></div>
          <p className="response-selection-description" tabIndex={0} role="region" aria-label="Incident summary">{selected.description}</p>
          <div className="response-selection-place"><MapPin aria-hidden="true" size={18} /><div><span>Incident location</span><PlaceLabel point={selected.location!} saved={selected.placeName || selected.area} /></div></div>
          <div className="response-selection-actions"><Link className="btn" to={`/assignments/${encodeURIComponent(selected.id)}`}>Open assignment <ArrowUpRight size={16} aria-hidden="true" /></Link><a className="btn btn--ghost" href={directionsUrl(selected.location!)} target="_blank" rel="noopener noreferrer"><Navigation size={16} aria-hidden="true" />Directions</a></div>
        </aside>}
      </div>
    </section>}
    <section className="response-list-panel response-map-list"><div className="response-section-head"><h2>Assignments on this view</h2><span>List alternative · includes reports without pins</span></div>{!state.loading && !state.error && !state.partialError && !state.reports.length ? <p>No open assignments right now.</p> : <AssignmentRows reports={state.reports} />}<ReportWindow order="oldest" count={state.reports.length} windowSize={state.windowSize} loadMore={state.loadMore} /></section>
  </div>;
}
