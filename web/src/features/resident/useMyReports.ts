import { useEffect, useState } from 'react';
import { collection, query, where, onSnapshot, type FirestoreError } from 'firebase/firestore';
import { getFirebaseDb } from '../../firebase';
import { convertReport } from '../reports/useReports';
import type { Report } from '../../types/domain';

const time = (v: unknown): number => (v instanceof Date ? v.getTime() : 0);

export interface MyReportsState {
  reports: Report[];
  loading: boolean;
  error: FirestoreError | null;
  retry: () => void;
}

// Live list of one resident's reports. The rules allow this read only for the reporter's own reports.
// Sorted on the client so no composite index is needed.
export function useMyReports(uid: string): MyReportsState {
  const [state, setState] = useState<Omit<MyReportsState, 'retry'>>({ reports: [], loading: Boolean(uid), error: null });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!uid) {
      setState({ reports: [], loading: false, error: null });
      return undefined;
    }
    setState((s) => (s.error ? { ...s, loading: true, error: null } : s));
    const q = query(collection(getFirebaseDb(), 'reports'), where('reporterId', '==', uid));
    return onSnapshot(
      q,
      (snap) => {
        const reports = snap.docs
          .map((d) => convertReport(d.id, d.data()))
          .sort((a, b) => time(b.createdAt) - time(a.createdAt));
        setState({ reports, loading: false, error: null });
      },
      (error) => setState((s) => ({ ...s, loading: false, error })),
    );
  }, [uid, attempt]);

  const retry = () => setAttempt((n) => n + 1);
  return { ...state, retry };
}
