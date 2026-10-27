import { useEffect, useState } from 'react';
import { collection, query, limit, where, orderBy, type FirestoreError } from 'firebase/firestore';
import { watchTeamReports } from './watchTeamReports';
import { getFirebaseDb } from '../../firebase';
import { TERMINAL_STATUSES, type Report } from '../../types/domain';
import { convertReport } from '../reports/useReports';

// The newest terminal reports the responder sees. Enforced by the query, so the listener never reads more.
export const RECENT_CLOSED_LIMIT = 10;

export interface ClosedTeamReportsState {
  // Terminal reports of the team, most recently changed first, at most RECENT_CLOSED_LIMIT. The caller shows the same cap.
  reports: Report[];
  loading: boolean;
  error: FirestoreError | null;
  fromCache: boolean;
  retry: () => void;
}

// The same team equality query as useAssignedReports (no extra filter or limit). It keeps the terminal
// reports that the open list drops. Status changes set updatedAt, so it orders closed reports by when they changed.
export function useClosedTeamReports(teamId: string | null | undefined): ClosedTeamReportsState {
  const [state, setState] = useState<Omit<ClosedTeamReportsState, 'retry'>>({ reports: [], loading: true, error: null, fromCache: false });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!teamId) {
      setState({ reports: [], loading: false, error: null, fromCache: false });
      return undefined;
    }
    setState({ reports: [], loading: true, error: null, fromCache: false });
    // Server-bounded: the team's terminal reports only, newest change first, at most RECENT_CLOSED_LIMIT documents.
    // Reports assigned to several teams are joined in.
    const db = getFirebaseDb();
    const single = query(collection(db, 'reports'), where('assignedTeamId', '==', teamId), where('status', 'in', [...TERMINAL_STATUSES]), orderBy('updatedAt', 'desc'), limit(RECENT_CLOSED_LIMIT));
    const many = query(collection(db, 'reports'), where('assignedTeamIds', 'array-contains', teamId), orderBy('updatedAt', 'desc'), limit(RECENT_CLOSED_LIMIT * 2));
    return watchTeamReports(
      [single, many],
      convertReport,
      {
        keep: (r) => (TERMINAL_STATUSES as readonly string[]).includes(r.status),
        order: (a, b) => b.updatedAt.getTime() - a.updatedAt.getTime(),
        limit: RECENT_CLOSED_LIMIT,
      },
      (reports, fromCache) => setState({ reports, loading: false, error: null, fromCache }),
      (error) => setState((s) => ({ ...s, loading: false, error })),
    );
  }, [teamId, attempt]);

  const retry = () => setAttempt((n) => n + 1);
  return { ...state, retry };
}
