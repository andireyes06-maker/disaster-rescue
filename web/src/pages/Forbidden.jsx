import { Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthProvider.jsx';
import { landingFor, LANDING } from '../routes/landing.js';

export default function Forbidden() {
  const { role, logout } = useAuth();
  const isResident = role === 'resident';
  return (
    <main className="login">
      <div className="card login__card">
        <h1>{isResident ? 'Use the mobile app' : 'Access denied'}</h1>
        <p>
          {isResident
            ? 'Residents report and track incidents in the mobile app. This web app is for staff.'
            : 'Your account does not have access to this page.'}
        </p>
        {LANDING[role] && <Link className="btn" to={landingFor(role)}>Go to my page</Link>}
        <button type="button" className="btn btn--ghost" onClick={logout}>Sign out</button>
      </div>
    </main>
  );
}
