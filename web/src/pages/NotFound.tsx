import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Compass } from 'lucide-react';
import PublicHeader from '../components/PublicHeader';
import './public.css';

export default function NotFound() {
  useEffect(() => { document.title = 'Page not found · Rescue Reports'; }, []);
  return <div className="login-page">
    <a className="skip-link" href="#main-content">Skip to content</a>
    <PublicHeader />
    <main className="login" id="main-content" tabIndex={-1}>
      <div className="card login__card forbidden">
        <header className="forbidden__head"><Compass aria-hidden="true" /><h1>Page not found</h1></header>
        <div className="forbidden__body">
          <p>This address does not lead to a page in Rescue Reports. The link may be outdated or incomplete.</p>
          <p className="forbidden__hint">Return home to continue, or sign in to reach your reports and workspace.</p>
          <div className="forbidden__actions"><Link className="btn" to="/">Back to home</Link><Link className="btn btn--ghost" to="/login">Sign in</Link></div>
        </div>
      </div>
    </main>
  </div>;
}
