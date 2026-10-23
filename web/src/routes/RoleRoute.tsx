import { useEffect, useRef, type ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthProvider';
import PageLoading from '../components/PageLoading';
import Brand from '../components/Brand';
import type { Role } from '../types/domain';

interface RoleRouteProps {
  allow: Role[];
  children: ReactNode;
}

// The automatic checks are used up (or the connection failed). Nothing protected is shown; the person can ask again.
// The heading takes focus when the panel appears, so keyboard and screen-reader users are not left on a vanished control.
function HoldPanel({ message, onRetry }: { message: string; onRetry: () => void }) {
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => { heading.current?.focus(); }, []);
  return (
    <main className="route-loading route-hold" aria-labelledby="route-hold-heading">
      <div className="route-loading__brand"><Brand /></div>
      <div className="route-hold__panel">
        <h1 id="route-hold-heading" ref={heading} tabIndex={-1} className="route-hold__title">Access not confirmed yet</h1>
        <p className="route-hold__message" role="status">{message}</p>
        <button type="button" className="btn" onClick={onRetry}>Retry access check</button>
      </div>
    </main>
  );
}

export default function RoleRoute({ allow, children }: RoleRouteProps) {
  const { user, role, loading, syncing, syncNote, retryAvailable, retryAccessCheck } = useAuth();
  // Shown while the session is restored; the shared skeleton gives one status message and keeps a landmark.
  if (loading) {
    return <PageLoading label="Checking your account…" />;
  }
  if (!user) return <Navigate to="/login" replace />;
  // The profile and the token claims disagree (a team or role change is being applied). Protected views stay unmounted,
  // so their listeners and data are gone until the two agree.
  if (syncing) {
    const waitingForConnection = syncNote === 'refresh-failed';
    if (!retryAvailable) {
      return <PageLoading label={waitingForConnection ? 'Checking your access. Waiting for the connection…' : 'Checking your access…'} />;
    }
    const message = waitingForConnection
      ? 'We could not check your access because the connection failed. Your work is paused until it is confirmed.'
      : syncNote === 'profile-loading'
        ? 'We could not load your account yet. Your work is paused until it is confirmed.'
        : 'Your account changed and the access check has not finished. Your work is paused until it is confirmed.';
    return <HoldPanel message={message} onRetry={retryAccessCheck} />;
  }
  if (!role || !allow.includes(role)) return <Navigate to="/forbidden" replace />;
  return children;
}
