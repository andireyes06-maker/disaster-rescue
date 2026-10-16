import { Link } from 'react-router-dom';
import PublicHeader from '../components/PublicHeader';
import './public.css';

const FLOW = ['Submitted', 'Verified', 'Assigned', 'In progress', 'Resolved', 'Closed'];

const ROLES = [
  { role: 'Residents', text: 'Report an emergency with photos and location, and follow its status.' },
  { role: 'Dispatchers', text: 'Verify, prioritize, and assign reports.' },
  { role: 'Responders', text: 'Acknowledge assignments and post rescue updates.' },
  { role: 'DMO', text: 'Monitor trends and export summaries.' },
];

const COURSE = 'IT 305 Advance Web Development, BSIT 3J, Bulacan State University';

export default function Landing() {
  return (
    <div className="landing">
      <PublicHeader />

      <main>
        <section className="landing__hero" aria-labelledby="hero-heading">
          <div className="landing__hero-inner">
            <h1 id="hero-heading">Report an incident.<br />Coordinate the response.</h1>
            <p className="landing__lede">
              One place for response teams to review reports, assign rescue teams, and follow each incident through to resolution.
            </p>
          </div>
        </section>

        <section className="landing__doors-wrap" aria-label="Choose your door">
          <div className="landing__doors">
            <article className="door door--staff">
              <h2>Staff workspace</h2>
              <p>Dispatchers, responders, and the DMO sign in to the staff web.</p>
              <Link className="btn door__action" to="/login">Sign in to the staff web</Link>
            </article>
            <article className="door door--resident">
              <h2>Resident mobile app</h2>
              <p>Use the mobile app to report with photos and location, and to follow the status.</p>
              <p className="door__availability">Not publicly released. Ask your team lead for a demo build.</p>
              <a className="door__link" href="#resident-app">Resident app availability</a>
            </article>
          </div>
        </section>

        <section className="landing__safety" aria-label="Safety notice">
          <p>
            Submitting a report through this app does not automatically guarantee immediate rescue. If you are in danger, call your local emergency hotline.
          </p>
        </section>

        <section className="landing__section" aria-labelledby="flow-heading">
          <h2 id="flow-heading">How a report moves</h2>
          <ol className="timeline">
            {FLOW.map((step) => (
              <li key={step} className="timeline__step">
                <span className="timeline__dot" aria-hidden="true" />
                <span>{step}</span>
              </li>
            ))}
          </ol>
          <p className="landing__note">Every status change is recorded, so staff and the resident can see what happened and when.</p>
        </section>

        <section className="landing__section" aria-labelledby="who-heading">
          <h2 id="who-heading">Who it is for</h2>
          <ul className="roles">
            {ROLES.map((item) => (
              <li key={item.role}>
                <h3>{item.role}</h3>
                <p>{item.text}</p>
              </li>
            ))}
          </ul>
        </section>

        <section id="resident-app" className="landing__section landing__app" aria-labelledby="app-heading">
          <h2 id="app-heading">The resident app</h2>
          <p>Residents can report an emergency, add photos and location, and follow each report until it is closed.</p>
          <p className="landing__notice">Not published yet. Ask your team lead for the demo build.</p>
        </section>

        <section className="landing__section" aria-labelledby="privacy-heading">
          <h2 id="privacy-heading">Privacy</h2>
          <p className="landing__note">Privacy notice (pending review).</p>
        </section>
      </main>

      <footer className="landing__footer">
        <div className="landing__footer-inner">
        <div className="landing__footer-brand">
          <span className="public-header__mark" aria-hidden="true">DR</span>
          <span>Disaster Rescue</span>
        </div>
        <div className="landing__footer-cols">
          <div>
            <p className="landing__footer-title">Staff</p>
            <Link className="landing__footer-link" to="/login">Sign in to the staff web</Link>
          </div>
          <div>
            <p className="landing__footer-title">Credits</p>
            <p>{COURSE}</p>
          </div>
        </div>
        <p className="landing__footer-hotline">Demonstration site. A local emergency hotline has not been configured.</p>
        </div>
      </footer>
    </div>
  );
}
