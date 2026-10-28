import { useEffect, useRef, useState } from 'react';
import { collection, query, limit, where, orderBy, type FirestoreError } from 'firebase/firestore';
import { watchTeamReports } from './watchTeamReports';
import { getFirebaseDb } from '../../firebase';
import { REPORT_STATUSES, TERMINAL_STATUSES, type Report } from '../../types/domain';
import { convertReport } from '../reports/useReports';

// Every status that is not terminal. The open list reads only these, so closed history is never downloaded.
const OPEN_STATUSES = REPORT_STATUSES.filter((s) => !TERMINAL_STATUSES.includes(s));

export interface AssignedReportsState {
  reports: Report[];
  loading: boolean;
  error: FirestoreError | null;
  partialError?: FirestoreError | null;
  // True when the last result came from the local cache, so statuses and priorities may be out of date (F07).
  fromCache: boolean;
  retry: () => void;
  windowSize?: number;
  loadMore?: () => void;
}

// Each bounded query filters team and status on the server, then the two results are joined.
export function useAssignedReports(teamId: string | null | undefined): AssignedReportsState {
  const [state, setState] = useState<Omit<AssignedReportsState, 'retry'> & { ownerTeam?: string | null }>({ ownerTeam: teamId, reports: [], loading: true, error: null, fromCache: false });
  const [attempt, setAttempt] = useState(0);
  const [windowSize, setWindowSize] = useState(50);
  // "Load more" only widens the window, so the list on screen stays until the larger result arrives.
  const loaded = useRef(`${teamId}|0`);

  useEffect(() => {
    if (!teamId) {
      loaded.current = '';
      setState({ ownerTeam: teamId, reports: [], loading: false, error: null, fromCache: false });
      return undefined;
    }
    const key = `${teamId}|${attempt}`;
    if (key !== loaded.current) {
      loaded.current = key;
      setState({ ownerTeam: teamId, reports: [], loading: true, error: null, fromCache: false });
    }
    // Server-filtered: the current team's open statuses only, oldest first, so the window holds the oldest open
    // assignments (the same order as the Flutter responder list). Reports assigned to several teams are joined in.
    const db = getFirebaseDb();
    const single = query(collection(db, 'reports'), where('assignedTeamId', '==', teamId), where('status', 'in', OPEN_STATUSES), orderBy('createdAt', 'asc'), limit(windowSize));
    const many = query(collection(db, 'reports'), where('assignedTeamIds', 'array-contains', teamId), where('status', 'in', OPEN_STATUSES), orderBy('createdAt', 'asc'), limit(windowSize));
    return watchTeamReports(
      [single, many],
      convertReport,
      {
        keep: (r) => OPEN_STATUSES.includes(r.status),
        order: (a, b) => a.createdAt.getTime() - b.createdAt.getTime(),
        limit: windowSize,
      },
      (reports, fromCache, partialError) => setState({ ownerTeam: teamId, reports, loading: false, error: null, partialError, fromCache }),
      (error) => setState((s) => ({ ...s, loading: false, error })),
    );
  }, [teamId, attempt, windowSize]);

  const retry = () => setAttempt((n) => n + 1);
  const safe = state.ownerTeam === teamId ? state : { reports: [], loading: !!teamId, error: null, fromCache: false };
  return { ...safe, retry, windowSize, loadMore: () => setWindowSize(n => n + 50) };
}
