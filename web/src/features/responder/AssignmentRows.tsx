import { ArrowUpRight, MapPin } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { Report } from '../../types/domain';
import { DisasterSymbol } from '../map/disasterSymbols';
import StatusBadge from '../reports/StatusBadge';
import PriorityBadge from '../reports/PriorityBadge';
import { formatTime } from '../reports/format';

const iso = (date: Date | undefined) => date instanceof Date && !Number.isNaN(date.getTime()) ? date.toISOString() : undefined;

export default function AssignmentRows({ reports, closed = false }: { reports: Report[]; closed?: boolean }) {
  return <ul className="response-list" aria-label={closed ? 'Recently closed reports, most recent first' : 'Assigned incidents, oldest first'}>{reports.map(report => <li key={report.id}>
    <Link className="response-row" to={`/assignments/${encodeURIComponent(report.id)}`}>
      <div className="response-row__identity"><span className={`response-row__symbol response-type--${report.type}`}><DisasterSymbol type={report.type} /></span><span className={`response-type response-type--${report.type}`}>{report.type}</span><strong>{report.reference || `${report.type} report`}</strong><span className="response-row__description">{report.description || 'Open the report brief for details.'}</span></div>
      <div className="response-row__place"><MapPin size={15} aria-hidden="true" /><span>{report.placeName || report.area || report.addressText || 'Pinned location'}</span></div>
      <div className="response-row__status"><PriorityBadge priority={report.priority} /><StatusBadge status={report.status} /></div>
      <div className="response-row__time"><span>{closed ? 'Last updated' : 'Reported'}</span><time dateTime={iso(closed ? report.updatedAt : report.createdAt)}>{formatTime(closed ? report.updatedAt : report.createdAt)}</time></div><ArrowUpRight size={18} aria-hidden="true" />
    </Link>
  </li>)}</ul>;
}
