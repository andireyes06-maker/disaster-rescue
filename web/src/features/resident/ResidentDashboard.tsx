import { Link } from 'react-router-dom';
import { useAuth } from '../../auth/AuthProvider';
import { useMyReports } from './useMyReports';
import { useHotlines } from './useHotlines';
import SafetyNotice from './SafetyNotice';
import PublicIncidentMap from './PublicIncidentMap';
import StatusBadge from '../reports/StatusBadge';
import EmptyState from '../../components/calm/EmptyState';
import Banner from '../../components/calm/Banner';
import { Skeleton, SkeletonRows } from '../../components/calm/Skeleton';
import '../../pages/public.css';
import './resident-motion.css';
import { ArrowUpRight, MapPin, Plus } from 'lucide-react';
import { formatTime, isOpen } from '../reports/format';

const label = (type: string) => type.charAt(0).toUpperCase() + type.slice(1);

export default function ResidentDashboard() {
  const { user } = useAuth();
  const uid = user?.uid ?? '';
  const { reports, loading, error, retry } = useMyReports(uid);
  const hotlines = useHotlines();
  const activeCount = reports.filter(report => isOpen(report) && report.status !== 'Resolved').length;

  return (
    <div className="resident">
      <SafetyNotice hotlines={hotlines} />
      <div className="resident-welcome">
        <div><h2>{loading || error ? 'Your report workspace' : reports.length ? `${activeCount} report${activeCount === 1 ? '' : 's'} in progress` : 'Start your first report'}</h2><p>{reports.length ? 'Open a report below to check its status and response history.' : 'Describe the situation and pin the location. You can follow updates here after submitting.'}</p></div>
        <Link className="btn" to="/my/report"><Plus size={18} aria-hidden="true" />Report an emergency</Link>
      </div>

      <div className="resident__grid">
      <div className="resident__col">
      <section className="card" aria-labelledby="my-reports-title">
        <h2 id="my-reports-title">My reports</h2>
        {error && (
          <Banner tone="error" role="alert">Could not load your reports. <button type="button" className="btn btn--ghost" onClick={retry}>Try again</button></Banner>
        )}
        {loading && reports.length === 0 && <Skeleton label="Loading your reports"><SkeletonRows rows={3} height={48} /></Skeleton>}
        {!error && !loading && reports.length === 0 && <EmptyState title="No reports yet" body="Reports you submit will appear here with their status and updates." action={<Link className="btn btn--ghost" to="/my/report">Create your first report</Link>} />}
        {reports.length > 0 && (
          <ul className="resident__list">
            {reports.map((r) => (
              <li key={r.id}>
                <Link to={`/my/reports/${r.id}`}>
                  <span className="resident-report-icon" aria-hidden="true"><MapPin size={19} /></span>
                  <span className="resident-report-text"><strong>{label(r.type)} report</strong><span className="resident-report-place">{r.addressText || 'No address provided'}</span><small>{r.reference} · {formatTime(r.createdAt)}</small></span>
                  <StatusBadge status={r.status} />
                  <ArrowUpRight size={16} aria-hidden="true" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>



      </div>
      <div className="resident__col">
      <section className="card" aria-labelledby="map-title">
        <h2 id="map-title">Incident areas</h2>
        <p>Areas are rounded to protect exact locations.</p>
        <PublicIncidentMap />
      </section>
      </div>
      </div>
    </div>
  );
}
