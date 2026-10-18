import Brand from './Brand';
import { Skeleton } from './calm/Skeleton';
import './landing-loading.css';

// Reserve the opening composition while the saved session resolves. Decorative
// blocks stay out of the accessibility tree; one status names the real pending work.
export default function LandingLoading() {
  return <div className="landing-loading">
    <header className="landing-loading__header"><Brand /></header>
    <main id="main-content" tabIndex={-1}>
      <h1 className="visually-hidden">Loading Rescue Reports</h1>
      <Skeleton label="Loading your session…">
        <div className="landing-loading__opening">
          <div className="landing-loading__copy">
            <div className="skeleton-block landing-loading__title" />
            <div className="skeleton-block landing-loading__line" />
            <div className="skeleton-block landing-loading__line" />
            <div className="skeleton-block landing-loading__action" />
          </div>
          <div className="skeleton-block landing-loading__scene" />
        </div>
      </Skeleton>
    </main>
  </div>;
}
