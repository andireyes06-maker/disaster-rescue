import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Smartphone } from 'lucide-react';
import PublicHeader from '../components/PublicHeader';
import './public.css';

// Residents use the Flutter mobile app. Administrators and rescue teams use the website.
// This page replaces the old resident and responder web pages, so it offers no dashboard or report links.
export default function MobileAppNotice() {
  useEffect(() => { document.title = 'Use the mobile app · Rescue Reports'; }, []);
  return (
    <div className="login-page">
      <a className="skip-link" href="#main-content">Skip to content</a>
      <PublicHeader />
      <main className="login" id="main-content" tabIndex={-1}>
        <div className="card login__card forbidden">
          <header className="forbidden__head">
            <Smartphone aria-hidden="true" />
            <h1>Use the Rescue Reports mobile app</h1>
          </header>
          <div className="forbidden__body">
            <p>Residents use the mobile app to send reports and follow updates.</p>
            <p className="forbidden__hint">The website is for administrators and rescue teams. If you are one of them, sign in with your account.</p>
            <div className="forbidden__actions">
              <Link className="btn" to="/login">Sign in</Link>
            </div>
            <Link className="login__home" to="/">Back to home</Link>
          </div>
        </div>
      </main>
    </div>
  );
}
