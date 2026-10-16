import { Link } from 'react-router-dom';

const HOTLINE_PLACEHOLDER = '000-0000';

const AUDIENCE = [
  { role: 'Residents', text: 'Report an emergency with photos and location, and follow its status.' },
  { role: 'Dispatchers', text: 'Verify, prioritize, and assign reports.' },
  { role: 'Responders', text: 'Acknowledge assignments and post rescue updates.' },
  { role: 'DMO', text: 'Monitor trends and export summaries.' },
];

const FLOW = ['Submitted', 'Verified', 'Assigned', 'In progress', 'Resolved', 'Closed'];

// Shown as the "current" step in the example rail. Purely illustrative.
const EXAMPLE_CURRENT = 2;

const COURSE = 'IT 305 Advance Web Development, BSIT 3J, Bulacan State University';

export default function Landing() {
  return (
    <main className="landing">
      <header className="landing__brand">
        <span className="landing__mark" aria-hidden="true">DR</span>
        <span>Disaster Rescue</span>
      </header>

      <section className="landing__hero" aria-labelledby="hero-heading">
        <svg className="landing__art" viewBox="0 0 400 300" aria-hidden="true" focusable="false">
          <rect x="0" y="0" width="400" height="300" fill="none" />
          <g fill="none" stroke="currentColor" strokeWidth="1.5" opacity="0.5">
            <path d="M0 80 H400 M0 160 H400 M0 240 H400 M90 0 V300 M190 0 V300 M300 0 V300" />
            <path d="M0 200 C90 150 150 230 240 170 S360 110 400 130" strokeWidth="6" opacity="0.7" />
          </g>
          <g fill="currentColor">
            <circle cx="90" cy="80" r="9" />
            <circle cx="240" cy="170" r="11" />
            <circle cx="300" cy="240" r="8" />
          </g>
          <g fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="240" cy="170" r="22" opacity="0.5" />
          </g>
        </svg>
        <div className="landing__hero-copy">
          <p className="landing__eyebrow">Emergency reporting for residents and response teams</p>
          <h1 id="hero-heading">Disaster Rescue Reporting and Monitoring System</h1>
          <p className="landing__lede">
            Report an emergency, track the response, and see how the community is affected.
          </p>
          <div className="landing__actions">
            <Link className="btn" to="/login">Sign in to the staff web</Link>
            <a className="btn btn--ghost" href="#resident-app">Get the resident app</a>
          </div>
        </div>

        <aside className="landing__rail" aria-label="Example of how a report moves">
          <p className="landing__rail-title">How a report moves</p>
          <ol className="landing__steps">
            {FLOW.map((step, i) => (
              <li
                key={step}
                className={`landing__step${i < EXAMPLE_CURRENT ? ' is-done' : ''}${i === EXAMPLE_CURRENT ? ' is-current' : ''}`}
                aria-current={i === EXAMPLE_CURRENT ? 'step' : undefined}
              >
                <span className="landing__dot" aria-hidden="true" />
                <span>{step}</span>
              </li>
            ))}
          </ol>
          <p className="landing__muted">Every status change is recorded, so staff and the resident can see what happened and when.</p>
        </aside>
      </section>

      <section className="landing__section" aria-labelledby="who-heading">
        <h2 id="who-heading">Who it is for</h2>
        <ul className="landing__audience">
          {AUDIENCE.map((item) => (
            <li key={item.role}>
              <h3>{item.role}</h3>
              <p>{item.text}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="landing__section landing__safety" aria-labelledby="safety-heading">
        <h2 id="safety-heading">Safety and privacy</h2>
        <p className="landing__safety-text">
          Submitting a report through this app does not automatically guarantee immediate rescue. If you are in danger, call your local emergency hotline.
        </p>
        <a className="btn landing__hotline" href={`tel:${HOTLINE_PLACEHOLDER}`}>
          Emergency hotline (placeholder)
        </a>
        <p className="landing__muted">Privacy notice (pending review).</p>
      </section>

      <section id="resident-app" className="landing__section" aria-labelledby="app-heading">
        <h2 id="app-heading">The resident app</h2>
        <p>The resident app is not published yet. Ask your team lead for the demo build.</p>
      </section>

      <footer className="landing__footer">
        <div>
          <p className="landing__footer-title">Staff access</p>
          <Link className="landing__footer-link" to="/login">Sign in to the staff web</Link>
        </div>
        <div>
          <p className="landing__footer-title">Credits</p>
          <p>Team names and roles: to be added.</p>
          <p>{COURSE}</p>
        </div>
      </footer>
    </main>
  );
}
