import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight, Check, Download, Radio, ShieldCheck, Smartphone, TriangleAlert, Waves, Flame, Mountain, LocateFixed, Camera, MapPin } from 'lucide-react';
import PublicHeader from '../components/PublicHeader';
import Brand from '../components/Brand';
import LandingFilm from '../components/LandingFilm';
import LandingQuestions from '../components/LandingQuestions';
import PriorityBadge from '../features/reports/PriorityBadge';
import StatusBadge from '../features/reports/StatusBadge';
import './public.css';
import './landing.css';
import './landing-header.css';
import './landing-story.css';
import { ANDROID_APK_URL } from '../config/downloads';
const NAV = [{ href: '#how-it-works', label: 'How it works' }, { href: '#residents', label: 'For residents' }, { href: '#access', label: 'Access' }];
function DistrictMap() {
  return (
    <svg className="console__map" viewBox="0 0 520 300" role="img" aria-label="Incident area and response route">
      <rect className="console__map-ground" width="520" height="300" rx="10" />
      <path className="console__map-river" d="M0 214C92 180 168 242 262 206S408 164 520 196V300H0Z" />
      <g className="console__map-roads">
        <path d="M36 74H484M36 168H484M166 24V276M374 24V276" />
      </g>
      <g className="console__map-blocks">
        <rect x="52" y="90" width="92" height="60" rx="5" />
        <rect x="186" y="90" width="162" height="60" rx="5" />
        <rect x="392" y="90" width="92" height="60" rx="5" />
        <rect x="186" y="182" width="74" height="20" rx="5" />
        <rect x="392" y="182" width="92" height="20" rx="5" />
      </g>
      <path className="console__map-zone" d="M200 146C228 124 290 130 312 158S314 200 276 206S190 178 200 146Z" />
      <path className="console__map-route" pathLength={1} d="M250 173C292 160 330 118 368 86" />
      <g className="console__map-pin">
        <path d="M250 124c-10 0-18 8-18 18 0 13 18 31 18 31s18-18 18-31c0-10-8-18-18-18z" />
        <circle cx="250" cy="142" r="5" />
      </g>
      <g className="console__map-team">
        <rect x="364" y="60" width="26" height="26" rx="6" />
        <path d="M377 65v16M369 73h16" />
      </g>
    </svg>
  );
}
function ProductScene() {
  return <figure className="response-scene" aria-label="Response workspace">
    <figcaption><span><Radio size={15} aria-hidden="true" />Response workspace</span><span>From first report to field update</span></figcaption>
    <div className="response-scene__body"><div className="response-scene__queue">
      <div className="response-scene__queue-title">Incident inbox <span>3</span></div>
      <div className="sample-incident is-selected"><Waves size={19} aria-hidden="true" /><div><strong>Flood report</strong><small>Riverside District</small><PriorityBadge priority="critical" /></div></div>
      <div className="sample-incident"><Flame size={19} aria-hidden="true" /><div><strong>Fire report</strong><small>Market Quarter</small><PriorityBadge priority="high" /></div></div>
      <div className="sample-incident"><Mountain size={19} aria-hidden="true" /><div><strong>Landslide report</strong><small>Hillside Road</small><PriorityBadge priority="medium" /></div></div>
      <div className="sample-assignment"><ShieldCheck size={17} aria-hidden="true" /><span>Assigned to<br /><strong>Harbor Rescue Unit</strong></span></div>
    </div><div className="response-scene__map"><DistrictMap /><div className="sample-location"><MapPin size={15} aria-hidden="true" />Riverside District</div><div className="sample-update"><span><Radio size={19} aria-hidden="true" /></span><div><strong>Team reached the access point.</strong><small>Latest field update</small></div><StatusBadge status="Rescue in Progress" /></div></div></div>
  </figure>;
}
export default function Landing() {
  useEffect(() => { document.title = 'Rescue Reports · Report clearly. Respond together.'; }, []);
  return <div className="service-site">
    <a className="skip-link" href="#main-content">Skip to content</a>
    <PublicHeader description="Incident reporting & response" links={NAV} action={<Link className="btn btn--ghost" to="/login">Administrator sign in<ArrowUpRight size={15} aria-hidden="true" /></Link>} />
    <main id="main-content" tabIndex={-1}>
      <section className="service-opening" aria-labelledby="landing-title"><div className="service-opening__copy"><h1 id="landing-title">Report clearly.<br />Respond together.</h1><p>Report emergencies, share the location, and follow response updates. Rescue Reports connects residents with the people reviewing and coordinating each incident.</p><div className="service-opening__actions"><p className="service-text-link">Residents use the Rescue Reports mobile app.</p></div><ul className="service-opening__promise" aria-label="Report features"><li><Check size={15} aria-hidden="true" />Photos and location</li><li>Report tracking</li><li>Team updates</li></ul><div className="service-safety"><TriangleAlert size={19} aria-hidden="true" /><p>Submitting a report through this app does not automatically guarantee immediate rescue. If you are in danger, call your local emergency hotline.</p></div></div><LandingFilm fallback={<ProductScene />} /></section>
      <section className="service-journey" id="how-it-works"><div className="service-section-intro"><h2>One report.<br />A connected response.</h2><p>Residents, rescue teams, and administrators work from the same incident record. You can see what changed and what happens next.</p></div><ol className="service-journey__steps"><li><span className="service-step-icon"><Camera size={23} aria-hidden="true" /></span><h3>Show what happened</h3><p>Describe the emergency. Add photos if it is safe, and pinpoint where help is needed.</p></li><li><span className="service-step-icon"><LocateFixed size={23} aria-hidden="true" /></span><h3>Connect the response</h3><p>An administrator reviews the report, validates it by hand, and assigns a rescue team.</p></li><li><span className="service-step-icon"><Radio size={23} aria-hidden="true" /></span><h3>Stay informed</h3><p>Follow status changes and updates from the field through to resolution and closure.</p></li></ol></section>
      <section className="service-resident" id="residents"><div className="service-resident__graphic" aria-hidden="true"><div className="sample-phone"><div className="sample-phone__top"><Brand compact /><span>My reports</span></div><span className="sample-phone__icon"><Waves size={31} /></span><strong>Flood report</strong><span className="sample-phone__place">Riverside District</span><StatusBadge status="Rescue in Progress" /><div className="sample-phone__history"><span><Check size={13} />Report submitted</span><span><Check size={13} />Validated by administrator</span><span><Check size={13} />Team assigned</span><span><Radio size={13} />Response in progress</span></div><small>Your incident, in one place</small></div></div><div><h2>Your report doesn't<br />end at “Submit”.</h2><p>Keep your incident details and response updates together. Return to your reports whenever you need to check the status.</p><p className="service-resident__actions">Residents send reports and follow updates in the Rescue Reports mobile app.{ANDROID_APK_URL && <> <a className="service-text-link" href={ANDROID_APK_URL} download>Download the Android app<Download size={15} aria-hidden="true" /></a></>}</p></div></section>
      <section className="service-team"><div><h2>Built for the people<br />behind the response.</h2><Link className="service-text-link" to="/login">Administrator sign in<ArrowUpRight size={17} aria-hidden="true" /></Link></div><dl><div><dt>Administrators</dt><dd>Validate reports by hand, set priorities, assign teams, and export summaries.</dd></div><div><dt>Responders</dt><dd>Review your team's assignments here. Acknowledge and record field progress in the mobile app or on this website.</dd></div></dl></section>
      <LandingQuestions />
      <section className="service-closing" aria-labelledby="start-report-title">
        <div><h2 id="start-report-title">Start with what you know.</h2><p>Send a report from the Rescue Reports mobile app, then follow its status and updates there.</p></div>
        <div className="service-closing__actions">{ANDROID_APK_URL && <a className="btn" href={ANDROID_APK_URL} download>Download Android app<Download size={17} aria-hidden="true" /></a>}<a className="btn" href="#residents">Get the mobile app<ArrowUpRight size={17} aria-hidden="true" /></a></div>
      </section>
      <section className="service-access" id="access" aria-labelledby="access-title"><h2 id="access-title" className="visually-hidden">Access and privacy</h2><div><Smartphone size={22} aria-hidden="true" /><h3>Report from the mobile app</h3><p>Use the Rescue Reports mobile app to submit reports, add a location and check updates. The website is for administrators and rescue teams.</p></div><div id="privacy"><ShieldCheck size={22} aria-hidden="true" /><h3>Privacy</h3><p>Share only the details needed to explain the incident. Avoid sensitive personal information in photos and descriptions.</p></div><div><Radio size={22} aria-hidden="true" /><h3>Coordinated response</h3><p>Keep the report, assigned team, and field updates connected as the response progresses.</p></div></section>
    </main>
    <footer className="service-footer"><Brand /><nav aria-label="Footer"><a href="#residents">Residents</a><Link to="/login">Administrator sign in</Link><a href="#access">Access and privacy</a></nav><p>Rescue Reports · Community incident reporting and response coordination.</p><small>For immediate danger, contact your local emergency service.</small></footer>
  </div>;
}
