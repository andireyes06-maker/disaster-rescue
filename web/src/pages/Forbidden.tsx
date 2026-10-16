import { Link } from 'react-router-dom';
import { ShieldAlert } from 'lucide-react';
import { useAuth } from '../auth/AuthProvider';
import { landingFor, LANDING } from '../routes/landing';
import PublicHeader from '../components/PublicHeader';
import './public.css';

export default function Forbidden() {
  const { role, logout } = useAuth();
  return (
    <div className="login-page">
      <PublicHeader />
    <main className="login">
      <div className="card login__card forbidden">
        <header className="forbidden__head">
          <ShieldAlert aria-hidden="true" />
          <h1>Access denied</h1>
        </header>
        <div className="forbidden__body">
          <p>
            {role ? 'Your account does not have access to this page.' : 'Sign in to continue.'}
          </p>
          <div className="forbidden__actions">
            {role && LANDING[role] && <Link className="btn" to={landingFor(role)}>Go to my page</Link>}
            {!role && <Link className="btn" to="/login">Sign in</Link>}
            {role && <button type="button" className="btn btn--ghost" onClick={() => logout().catch(() => {})}>Sign out</button>}
          </div>
          <Link className="login__home" to="/">Back to home</Link>
        </div>
      </div>
    </main>
    </div>
  );
}
