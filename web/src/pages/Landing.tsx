import { Link } from 'react-router-dom';
import PublicHeader from '../components/PublicHeader';

const HOTLINE_PLACEHOLDER = '000-0000';

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
          <h1 id="hero-heading">Disaster Rescue Reporting and Monitoring System</h1>
          <p className="landing__lede">
            Report an emergency, track the response, and see how the community is affected.
          </p>

          <div className="landing__doors">
            <article className="door">
              <h2>I need to report an emergency</h2>
              <p>Residents use the mobile app to report with photos and location, and to follow the status.</p>
              <a className="btn btn--ghost door__action" href="#resident-app">Get the resident app</a>
            </article>
            <article className="door">
              <h2>I work for the response team</h2>
              <p>Dispatchers, responders, and the DMO sign in to the staff web.</p>
              <Link className="btn door__action" to="/login">Sign in to the staff web</Link>
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
            <p>Team names and roles: to be added.</p>
            <p>{COURSE}</p>
          </div>
        </div>
        <p className="landing__footer-hotline">Emergency hotline: {HOTLINE_PLACEHOLDER} (placeholder)</p>
        </div>
      </footer>
    </div>
  );
}
