import { useEffect, useRef, useState } from 'react';
import { Skeleton, SkeletonRows } from '../../components/calm/Skeleton';
import Banner from '../../components/calm/Banner';
import { api } from '../../api/client';
import { CircleCheck, CircleAlert } from 'lucide-react';

interface Health { api: string; firestore: string; checkedAt: string }

export default function HealthPanel() {
  const [attempt, setAttempt] = useState(0);
  const [health, setHealth] = useState<Health | null>(null);
  const [failed, setFailed] = useState(false);
  const retryFocus = useRef(false);
  const retry = () => { retryFocus.current = true; setAttempt(value => value + 1); };
  useEffect(() => {
    let cancelled = false;
    setFailed(false); setHealth(null);
    api('/admin/health')
      .then((res) => {
        const value = res as Health;
        if (!value || typeof value.api !== 'string' || typeof value.firestore !== 'string' || Number.isNaN(Date.parse(value.checkedAt))) throw new Error('Invalid health response');
        if (!cancelled) setHealth(value);
      })
      .catch(() => { if (!cancelled) setFailed(true); });
    return () => { cancelled = true; };
  }, [attempt]);
  useEffect(() => {
    if (!retryFocus.current || (!health && !failed)) return;
    retryFocus.current = false;
    if (document.activeElement !== document.body) return;
    document.getElementById(failed || health?.api !== 'ok' || health?.firestore !== 'ok' ? 'admin-health-retry' : 'admin-health-status')?.focus();
  }, [health, failed]);
  if (failed) return <Banner tone="error" role="alert">Could not check system health. <button id="admin-health-retry" type="button" className="btn btn--ghost" onClick={retry}>Retry health check</button></Banner>;
  if (!health) return <Skeleton label="Checking system health"><SkeletonRows rows={2} height={36} /></Skeleton>;
  return (
    <div className="admin-service-status"><h3>Service availability</h3><ul id="admin-health-status" className="admin-health" tabIndex={-1} aria-label="System health">
      {[['API', health.api], ['Database', health.firestore]].map(([name, status]) => <li key={name} className={status === 'ok' ? 'is-available' : 'is-unavailable'}>{status === 'ok' ? <CircleCheck size={18} aria-hidden="true" /> : <CircleAlert size={18} aria-hidden="true" />}<span>{name}: {status === 'ok' ? 'Available' : 'Unavailable'}</span></li>)}
    </ul>
    <p className="field-hint">Last checked <time dateTime={health.checkedAt}>{new Date(health.checkedAt).toLocaleString()}</time></p>
    {(health.api !== 'ok' || health.firestore !== 'ok') && <Banner tone="error" role="alert">A service health check failed. <button id="admin-health-retry" type="button" className="btn btn--ghost" onClick={retry}>Retry health check</button></Banner>}</div>
  );
}
