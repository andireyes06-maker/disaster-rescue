import { useEffect, useState } from 'react';
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
  // True when the last result came from the local cache, so statuses and priorities may be out of date (F07).
  fromCache: boolean;
  retry: () => void;
  windowSize?: number;
  loadMore?: () => void;
}

// One equality filter in the query (assignedTeamId); status filtering and sorting happen in memory.
export function useAssignedReports(teamId: string | null | undefined): AssignedReportsState {
  const [state, setState] = useState<Omit<AssignedReportsState, 'retry'>>({ reports: [], loading: true, error: null, fromCache: false });
  const [attempt, setAttempt] = useState(0);
  const [windowSize, setWindowSize] = useState(50);

  useEffect(() => {
    if (!teamId) {
      setState({ reports: [], loading: false, error: null, fromCache: false });
      return undefined;
    }
    setState({ reports: [], loading: true, error: null, fromCache: false });
    // Server-filtered: the current team's open statuses only, oldest first, so the window holds the oldest open
    // assignments (the same order as the Flutter responder list). Reports assigned to several teams are joined in.
    const db = getFirebaseDb();
    const single = query(collection(db, 'reports'), where('assignedTeamId', '==', teamId), where('status', 'in', OPEN_STATUSES), orderBy('createdAt', 'asc'), limit(windowSize));
    const many = query(collection(db, 'reports'), where('assignedTeamIds', 'array-contains', teamId), orderBy('createdAt', 'asc'), limit(windowSize * 2));
    return watchTeamReports(
      [single, many],
      convertReport,
      {
        keep: (r) => OPEN_STATUSES.includes(r.status),
        order: (a, b) => a.createdAt.getTime() - b.createdAt.getTime(),
        limit: windowSize,
      },
      (reports, fromCache) => setState({ reports, loading: false, error: null, fromCache }),
      (error) => setState((s) => ({ ...s, loading: false, error })),
    );
  }, [teamId, attempt, windowSize]);

  const retry = () => setAttempt((n) => n + 1);
  return { ...state, retry, windowSize, loadMore: () => setWindowSize(n => n + 50) };
}
