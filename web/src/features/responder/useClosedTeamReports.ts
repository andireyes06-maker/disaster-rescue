import { useEffect, useState } from 'react';
import { collection, query, where, orderBy, limit, onSnapshot, type FirestoreError } from 'firebase/firestore';
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
    // Server-bounded: current team, terminal statuses only, newest change first, at most RECENT_CLOSED_LIMIT documents.
    const q = query(
      collection(getFirebaseDb(), 'reports'),
      where('assignedTeamId', '==', teamId),
      where('status', 'in', [...TERMINAL_STATUSES]),
      orderBy('updatedAt', 'desc'),
      limit(RECENT_CLOSED_LIMIT),
    );
    return onSnapshot(
      q,
      { includeMetadataChanges: true },
      (snap) => {
        const reports = snap.docs.map((d) => convertReport(d.id, d.data()));
        setState({ reports, loading: false, error: null, fromCache: snap.metadata.fromCache });
      },
      (error) => setState((s) => ({ ...s, loading: false, error })),
    );
  }, [teamId, attempt]);

  const retry = () => setAttempt((n) => n + 1);
  return { ...state, retry };
}
