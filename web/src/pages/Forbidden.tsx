import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ShieldAlert } from 'lucide-react';
import { useAuth } from '../auth/AuthProvider';
import { landingFor, LANDING } from '../routes/landing';
import type { Role } from '../types/domain';
import PublicHeader from '../components/PublicHeader';
import Banner from '../components/calm/Banner';
import './public.css';

const ROLE_NAME: Record<Role, string> = {
  resident: 'resident',
  dispatcher: 'dispatcher',
  responder: 'responder',
  admin: 'administrator',
};

export default function Forbidden() {
  const { user, role, logout } = useAuth();
  const [signOutError, setSignOutError] = useState('');
  useEffect(() => { document.title = 'Access denied · Rescue Reports'; }, []);
  async function onSignOut() {
    setSignOutError('');
    try {
      await logout();
    } catch {
      setSignOutError('Could not sign out. Check your connection and try again.');
    }
  }
  const signOut = <button type="button" className="btn btn--ghost" onClick={onSignOut}>Sign out</button>;

  let body: React.ReactNode;
  // Professor clarification (2026-10-23), amended 2026-10-24: residents use the mobile app only; rescuers use both; dispatchers and DMO have no website access.
  // AuthProvider signs out refused accounts, so these branches show only when a refused role is still reported here.
  if (role === 'resident') {
    body = (
      <>
        <p>Residents use the Rescue Reports mobile app. The website is for administrators and rescue teams.</p>
        <div className="forbidden__actions">{signOut}</div>
      </>
    );
  } else if (role === 'dispatcher') {
    body = (
      <>
        <p>This account has no website access. Ask your administrator.</p>
        <div className="forbidden__actions">{signOut}</div>
      </>
    );
  } else if (role && LANDING[role]) {
    body = (
      <>
        <p>Signed in as a {ROLE_NAME[role]}. This page is outside the work that role can do.</p>
        <p className="forbidden__hint">Your page is the next step. If you signed in with the wrong account, sign out and use the right one.</p>
        <div className="forbidden__actions">
          <Link className="btn" to={landingFor(role)}>Go to my page</Link>
          {signOut}
        </div>
      </>
    );
  } else if (user) {
    body = (
      <>
        <p>Your account is signed in, but its role is not one this app recognizes, so no pages are open to it.</p>
        <p className="forbidden__hint">This account does not have access to this area. Sign out to use a different account.</p>
        <div className="forbidden__actions">{signOut}</div>
      </>
    );
  } else {
    body = (
      <>
        <p>This page needs a signed-in account. Sign in with the account that has access to it.</p>
        <div className="forbidden__actions">
          <Link className="btn" to="/login">Sign in</Link>
        </div>
      </>
    );
  }

  return (
    <div className="login-page">
      <a className="skip-link" href="#main-content">Skip to content</a>
      <PublicHeader />
      <main className="login" id="main-content" tabIndex={-1}>
        <div className="card login__card forbidden">
          <header className="forbidden__head">
            <ShieldAlert aria-hidden="true" />
            <h1>Access denied</h1>
          </header>
          <div className="forbidden__body">
            {body}
            {signOutError && <Banner tone="error" role="alert">{signOutError}</Banner>}
            <Link className="login__home" to="/">Back to home</Link>
          </div>
        </div>
      </main>
    </div>
  );
}
