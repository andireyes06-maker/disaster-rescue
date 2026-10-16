import { Link } from 'react-router-dom';
import { useAuth } from '../../auth/AuthProvider';
import { useMyReports } from './useMyReports';
import { useMyNotifications } from './useMyNotifications';
import { useHotlines } from './useHotlines';
import SafetyNotice from './SafetyNotice';
import StatusBadge from '../reports/StatusBadge';
import Banner from '../../components/calm/Banner';
import '../../pages/public.css';

const label = (type: string) => type.charAt(0).toUpperCase() + type.slice(1);

export default function ResidentDashboard() {
  const { user } = useAuth();
  const uid = user?.uid ?? '';
  const { reports, loading, error, retry } = useMyReports(uid);
  const { notifications, error: notificationsError } = useMyNotifications(uid);
  const hotlines = useHotlines();

  return (
    <main className="resident">
      <SafetyNotice hotlines={hotlines} />
      <div className="resident__actions">
        <Link className="btn" to="/my/report">Report an emergency</Link>
      </div>

      <section className="card" aria-labelledby="my-reports-title">
        <h2 id="my-reports-title">My reports</h2>
        {error && (
          <Banner tone="error" role="alert">Could not load your reports. <button type="button" className="btn btn--ghost" onClick={retry}>Try again</button></Banner>
        )}
        {!error && !loading && reports.length === 0 && <p>You have no reports yet.</p>}
        {reports.length > 0 && (
          <ul className="resident__list">
            {reports.map((r) => (
              <li key={r.id}>
                <Link to={`/my/reports/${r.id}`}>
                  <span>{label(r.type)}</span>
                  <StatusBadge status={r.status} />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="card" aria-labelledby="notifications-title">
        <h2 id="notifications-title">Notifications</h2>
        {notificationsError && <Banner tone="error" role="alert">Could not load notifications.</Banner>}
        {!notificationsError && notifications.length === 0 && <p>No notifications yet.</p>}
        <ul className="resident__list">
          {notifications.slice(0, 10).map((n) => (
            <li key={n.id}>
              <strong>{n.title}</strong>
              <span>{n.body}</span>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
