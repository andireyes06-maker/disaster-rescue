import { useEffect, useState } from 'react';
import { collection, query, where, onSnapshot, type FirestoreError } from 'firebase/firestore';
import { getFirebaseDb } from '../../firebase';
import type { Report } from '../../types/domain';
import { convertReport } from '../reports/useReports';
import { isOpen } from '../reports/format';

const time = (v: unknown): number => (v instanceof Date ? v.getTime() : 0);

export interface AssignedReportsState {
  reports: Report[];
  loading: boolean;
  error: FirestoreError | null;
  retry: () => void;
}

// One equality filter in the query (assignedTeamId); status filtering and sorting happen in memory.
export function useAssignedReports(teamId: string | null | undefined): AssignedReportsState {
  const [state, setState] = useState<Omit<AssignedReportsState, 'retry'>>({ reports: [], loading: true, error: null });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!teamId) {
      setState({ reports: [], loading: false, error: null });
      return undefined;
    }
    setState({ reports: [], loading: true, error: null });
    const q = query(collection(getFirebaseDb(), 'reports'), where('assignedTeamId', '==', teamId));
    return onSnapshot(
      q,
      (snap) => {
        const reports = snap.docs
          .map((d) => convertReport(d.id, d.data()))
          .filter(isOpen)
          .sort((a, b) => time(b.createdAt) - time(a.createdAt));
        setState({ reports, loading: false, error: null });
      },
      (error) => setState((s) => ({ ...s, loading: false, error })),
    );
  }, [teamId, attempt]);

  const retry = () => setAttempt((n) => n + 1);
  return { ...state, retry };
}
