import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Smartphone } from 'lucide-react';
import PublicHeader from '../components/PublicHeader';
import './public.css';

// Residents and rescue teams use the Flutter mobile app; the website is for administrators only.
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
            <p>Residents and rescue teams use the mobile app to send reports, follow updates and record field progress.</p>
            <p className="forbidden__hint">The website is for administrators. If you are an administrator, sign in with your administrator account.</p>
            <div className="forbidden__actions">
              <Link className="btn" to="/login">Administrator sign in</Link>
            </div>
            <Link className="login__home" to="/">Back to home</Link>
          </div>
        </div>
      </main>
    </div>
  );
}
