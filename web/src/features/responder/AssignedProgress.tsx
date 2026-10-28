import ActivityHistory, { ActivityNote } from '../../components/calm/ActivityHistory';
import Banner from '../../components/calm/Banner';
import { useReportUpdates } from '../reports/useReport';
import { formatTime } from '../reports/format';

// Read-only progress history for an active assignment. Staff read these entries through the Firestore rules, which
// allow a responder to read a report's updates only while it is assigned to the responder's current team.
export function progressSectionId(reportId: string): string {
  return `progress-history-${reportId}`;
}

// Moves the reader to the history and puts focus on its heading. The fragment is set with replaceState,
// so there is no page load, no route change and no new history entry; the router's own state is kept.
export function focusProgressHistory(reportId: string): void {
  const section = document.getElementById(progressSectionId(reportId));
  section?.closest('[data-progress-panel]')?.dispatchEvent(new Event('reveal-progress'));
  section?.scrollIntoView({ block: 'start' });
  document.getElementById(`${progressSectionId(reportId)}-heading`)?.focus({ preventScroll: true });
  if (window.location.hash !== `#${progressSectionId(reportId)}`) {
    window.history.replaceState(window.history.state, '', `#${progressSectionId(reportId)}`);
  }
}

// `scope` is the signed-in identity. Its change drops the rendered history and unsubscribes the old listener.
export default function AssignedProgress({ reportId, scope = '' }: { reportId: string; scope?: string }) {
  const history = useReportUpdates(reportId, scope);
  const headingId = `${progressSectionId(reportId)}-heading`;
  return (
    <section id={progressSectionId(reportId)} className="assignment__progress" aria-labelledby={headingId}>
      <h3 id={headingId} tabIndex={-1} className="queue__type">Progress history</h3>
      {history.error && (
        <Banner tone="error" role="alert">
          Could not load the progress history. Try again. If your team has changed, reload the page.{' '}
          <button type="button" className="btn btn--ghost" onClick={history.retry}>Try again</button>
        </Banner>
      )}
      {history.loading && !history.error && <p className="plain" role="status">Loading progress history</p>}
      {!history.loading && !history.error && history.updates.length === 0 && <p className="plain">No progress entries have been recorded yet.</p>}
      {history.updates.length > 0 && (
        <ActivityHistory
          scrollable
          updates={history.updates}
          listClassName="closed-history"
          hasMore={history.hasMore && !history.loading && !history.error}
          onLoadOlder={history.loadOlder}
          renderItem={(u) => (
            <>
              <strong>{u.status}</strong>
              {u.peopleRescued > 0 && <span className="plain"> · {u.peopleRescued} rescued</span>}
              {u.note && <ActivityNote text={u.note} />}
              <time dateTime={u.at ? u.at.toISOString() : undefined}>{u.at ? formatTime(u.at) : 'Time unknown'}</time>
            </>
          )}
        />
      )}
    </section>
  );
}
