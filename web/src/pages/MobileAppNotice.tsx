import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Smartphone, Download, MapPin, Camera, Radio } from 'lucide-react';
import Brand from '../components/Brand';
import { ANDROID_APK_URL } from '../config/downloads';
import PublicHeader from '../components/PublicHeader';
import './public.css';

// Residents use the Flutter mobile app. Administrators and rescue teams use the website.
// This page replaces the old resident and responder web pages, so it offers no dashboard or report links.
export default function MobileAppNotice() {
  useEffect(() => { document.title = 'Use the mobile app · I-Report'; }, []);
  return (
    <div className="login-page">
      <a className="skip-link" href="#main-content">Skip to content</a>
      <PublicHeader />
      <main className="login app-handoff" id="main-content" tabIndex={-1}>
        <aside className="app-handoff__visual" aria-label="Mobile reporting workflow"><Brand /><div className="app-handoff__phone"><Smartphone size={48} aria-hidden="true" /><strong>Your report.<br />Connected to the response.</strong><ul><li><Camera size={20} aria-hidden="true" />Share the situation</li><li><MapPin size={20} aria-hidden="true" />Add the location</li><li><Radio size={20} aria-hidden="true" />Follow progress</li></ul></div><p>Incident reporting, wherever you are.</p></aside>
        <div className="card login__card forbidden">
          <header className="forbidden__head">
            <Smartphone aria-hidden="true" />
            <h1>Use the I-Report mobile app</h1>
          </header>
          <div className="forbidden__body">
            <p>Residents use the mobile app to send reports and follow updates.</p>
            <p className="forbidden__hint">The website is for administrators and rescue teams. If you are one of them, sign in with your account.</p>
            <div className="app-handoff__download">{ANDROID_APK_URL ? <a className="btn" href={ANDROID_APK_URL} download><Download size={17} aria-hidden="true" />Download for Android</a> : <><p>The Android download is currently unavailable here.</p><Link className="btn" to="/#residents">View app information</Link></>}<small>There is no iOS download available here.</small></div>
            <div className="forbidden__actions"><Link className="btn btn--ghost" to="/login">Sign in</Link></div>
            <Link className="login__home" to="/">Back to home</Link>
          </div>
        </div>
      </main>
    </div>
  );
}
