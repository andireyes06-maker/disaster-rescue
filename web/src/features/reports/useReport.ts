import { useEffect, useState } from 'react';
import { collection, doc, limit, onSnapshot, orderBy, query, where, type FirestoreError } from 'firebase/firestore';
import { getFirebaseDb } from '../../firebase';
import type { Report } from '../../types/domain';
import { convertReport } from './useReports';

export const MAX_DUPLICATE_IDS = 10;

export interface ReportState {
  report: Report | null;
  loading: boolean;
  error: FirestoreError | null;
  notFound: boolean;
  removed: boolean;
  // True when the last snapshot came from the local cache (offline or not yet confirmed by the server), so the status may be out of date (F07).
  fromCache: boolean;
}

export interface ReportEntry {
  report: Report | null;
  loading: boolean;
}

export function useReport(id: string) {
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<ReportState>({ report: null, loading: true, error: null, notFound: false, removed: false, fromCache: false });

  useEffect(() => {
    let seen = false;
    setState({ report: null, loading: true, error: null, notFound: false, removed: false, fromCache: false });
    const unsubscribe = onSnapshot(
      doc(getFirebaseDb(), 'reports', id),
      { includeMetadataChanges: true },
      (snap) => {
        if (snap.exists()) {
          seen = true;
          setState({ report: convertReport(snap.id, snap.data()), loading: false, error: null, notFound: false, removed: false, fromCache: snap.metadata.fromCache });
        } else {
          setState({ report: null, loading: false, error: null, notFound: !seen, removed: seen, fromCache: snap.metadata.fromCache });
        }
      },
      (error) => setState({ report: null, loading: false, error, notFound: false, removed: false, fromCache: false }),
    );
    return unsubscribe;
  }, [id, attempt]);

  return { ...state, retry: () => setAttempt((n) => n + 1) };
}

// One doc listener per id. byId[id] is { report, loading } where report is null when unavailable.
export function useReportsByIds(ids: string[] | undefined): Record<string, ReportEntry> {
  const key = (ids || []).slice(0, MAX_DUPLICATE_IDS).join('|');
  const [byId, setById] = useState<Record<string, ReportEntry>>({});

  useEffect(() => {
    const list = key ? key.split('|') : [];
    setById(Object.fromEntries(list.map((id) => [id, { report: null, loading: true }])));
    const unsubs = list.map((id) => onSnapshot(
      doc(getFirebaseDb(), 'reports', id),
      (snap) => setById((m) => ({ ...m, [id]: { report: snap.exists() ? convertReport(snap.id, snap.data()) : null, loading: false } })),
      () => setById((m) => ({ ...m, [id]: { report: null, loading: false } })),
    ));
    return () => unsubs.forEach((u) => u());
  }, [key]);

  return byId;
}

export interface RescueUpdate {
  id: string;
  status: string;
  note: string;
  peopleRescued: number;
  // Optional photos the responder attached. Empty when none were.
  photos?: { url: string }[];
  at: Date | null;
}

// Updates fetched per window: the newest 20 first, then 20 more for each loadOlder() call.
export const UPDATES_PAGE_SIZE = 20;

// Responder progress entries, oldest first. The listener reads only the newest `size` entries
// (orderBy at desc, limit size) and reverses them for display. hasMore is true when the window came back full.
// Firestore rules let staff read them.
// `scope` names the signed-in identity (account, role, team). When it changes, the old listener is unsubscribed,
// the rendered history is dropped at once (see the return value), and late callbacks from the old listener are ignored.
export function useReportUpdates(id: string, scope = '') {
  const [state, setState] = useState<{ reportId: string; scope: string; updates: RescueUpdate[]; error: FirestoreError | null; loading: boolean; hasMore: boolean }>({ reportId: id, scope, updates: [], error: null, loading: true, hasMore: false });
  const [attempt, setAttempt] = useState(0);
  // The window size belongs to one report: a different id starts again at one page.
  const [pageState, setPageState] = useState({ reportId: id, size: UPDATES_PAGE_SIZE });
  const size = pageState.reportId === id ? pageState.size : UPDATES_PAGE_SIZE;

  useEffect(() => {
    let active = true;
    setState((s) => {
      const same = s.reportId === id && s.scope === scope;
      return { reportId: id, scope, updates: same ? s.updates : [], error: null, loading: true, hasMore: same ? s.hasMore : false };
    });
    const q = query(collection(getFirebaseDb(), 'reports', id, 'updates'), orderBy('at', 'desc'), limit(size));
    const unsubscribe = onSnapshot(
      q,
      (snap) => { if (active) setState({
        reportId: id, scope, loading: false,
        hasMore: snap.docs.length === size,
        // Acknowledgements share this subcollection but carry no status; they are not progress entries.
        updates: snap.docs
          .filter((d) => typeof d.data().status === 'string' && d.data().status !== '')
          .map((d) => {
            const data = d.data();
            const at = data.at && typeof data.at.toDate === 'function' ? data.at.toDate() : null;
            return {
              id: d.id,
              status: data.status as string,
              note: typeof data.note === 'string' ? data.note : '',
              peopleRescued: typeof data.peopleRescued === 'number' ? data.peopleRescued : 0,
              photos: Array.isArray(data.photos) ? data.photos.filter((p: unknown): p is { url: string } => typeof (p as { url?: unknown })?.url === 'string').map((p: { url: string }) => ({ url: p.url })) : [],
              at,
            };
          })
          // The query returns newest first; display stays oldest first.
          .reverse(),
        error: null,
      }); },
      // Keep the last good history on a failed refresh; the error is shown beside it.
      (error) => { if (active) setState((s) => { const same = s.reportId === id && s.scope === scope; return { reportId: id, scope, updates: same ? s.updates : [], error, loading: false, hasMore: same ? s.hasMore : false }; }); },
    );
    return () => { active = false; unsubscribe(); };
  }, [id, scope, attempt, size]);

  const retry = () => setAttempt((n) => n + 1);
  const loadOlder = () => setPageState((p) => ({ reportId: id, size: (p.reportId === id ? p.size : UPDATES_PAGE_SIZE) + UPDATES_PAGE_SIZE }));
  // Rendered from the current scope only: an entry from a previous identity is never shown, even for one render.
  return state.reportId === id && state.scope === scope
    ? { ...state, retry, loadOlder }
    : { reportId: id, updates: [], error: null, loading: true, hasMore: false, retry, loadOlder };
}

// The acknowledgement read state and most recent time. Acknowledgements share the updates
// subcollection but carry no status, so this reads the same ordered collection and keeps only those entries.
export function useAcknowledgedAt(id: string) {
  const initial = { id, at: null as Date | null, acknowledged: false, loading: true, error: null as FirestoreError | null };
  const [state, setState] = useState(initial);
  useEffect(() => {
    setState({ id, at: null, acknowledged: false, loading: true, error: null });
    // Only acknowledgement rows are read (an equality filter needs no composite index). The latest is picked in memory.
    const q = query(collection(getFirebaseDb(), 'reports', id, 'updates'), where('kind', '==', 'acknowledge'));
    return onSnapshot(
      q,
      (snap) => {
        const times = snap.docs
          .map((d) => d.data().at)
          .filter((t) => t && typeof t.toDate === 'function')
          .map((t) => t.toDate() as Date);
        const latest = times.length ? new Date(Math.max(...times.map((t) => t.getTime()))) : null;
        setState({ id, at: latest, acknowledged: snap.docs.length > 0, loading: false, error: null });
      },
      (error) => setState({ id, at: null, acknowledged: false, loading: false, error }),
    );
  }, [id]);
  return state.id === id ? state : initial;
}
