import { Link } from 'react-router-dom';
import { SearchX } from 'lucide-react';
import { useAuth } from '../auth/AuthProvider';
import { landingFor, LANDING } from '../routes/landing';
import PublicHeader from '../components/PublicHeader';
import './public.css';

// Any address the app does not define. Shown instead of a silent redirect, so people know the link is wrong.
export default function NotFound() {
  const { role } = useAuth();
  return (
    <div className="login-page">
      <PublicHeader />
      <main className="login">
        <div className="card login__card forbidden">
          <header className="forbidden__head">
            <SearchX aria-hidden="true" />
            <h1>Page not found</h1>
          </header>
          <div className="forbidden__body">
            <p>This address does not exist. Check the link, or go to a page you can use.</p>
            <div className="forbidden__actions">
              {role && LANDING[role] && <Link className="btn" to={landingFor(role)}>Go to my page</Link>}
              {!role && <Link className="btn" to="/login">Sign in</Link>}
            </div>
            <Link className="login__home" to="/">Back to home</Link>
          </div>
        </div>
      </main>
    </div>
  );
}
