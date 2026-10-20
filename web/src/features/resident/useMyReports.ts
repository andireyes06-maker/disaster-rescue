import { useEffect, useState } from 'react';
import { collection, query, limit, orderBy, where, onSnapshot, type FirestoreError } from 'firebase/firestore';
import { getFirebaseDb } from '../../firebase';
import { convertReport } from '../reports/useReports';
import type { Report } from '../../types/domain';

const time = (v: unknown): number => (v instanceof Date ? v.getTime() : 0);

export interface MyReportsState {
  reports: Report[];
  loading: boolean;
  error: FirestoreError | null;
  // True when the last result came from the local cache, so statuses may be out of date (F07).
  fromCache: boolean;
  retry: () => void;
  windowSize?: number;
  loadMore?: () => void;
}

// Live list of one resident's reports. The rules allow this read only for the reporter's own reports.
// Newest-first server window; the reporterId/createdAt index is versioned with the app.
export function useMyReports(uid: string): MyReportsState {
  const [state, setState] = useState<Omit<MyReportsState, 'retry'>>({ reports: [], loading: Boolean(uid), error: null, fromCache: false });
  const [attempt, setAttempt] = useState(0);
  const [windowSize, setWindowSize] = useState(50);

  useEffect(() => {
    if (!uid) {
      setState({ reports: [], loading: false, error: null, fromCache: false });
      return undefined;
    }
    setState((s) => (s.error ? { ...s, loading: true, error: null } : s));
    const q = query(collection(getFirebaseDb(), 'reports'), where('reporterId', '==', uid), orderBy('createdAt', 'desc'), limit(windowSize));
    return onSnapshot(
      q,
      { includeMetadataChanges: true },
      (snap) => {
        const reports = snap.docs
          .map((d) => convertReport(d.id, d.data()))
          .sort((a, b) => time(b.createdAt) - time(a.createdAt));
        setState({ reports, loading: false, error: null, fromCache: snap.metadata.fromCache });
      },
      (error) => setState((s) => ({ ...s, loading: false, error })),
    );
  }, [uid, attempt, windowSize]);

  const retry = () => setAttempt((n) => n + 1);
  return { ...state, retry, windowSize, loadMore: () => setWindowSize(n => n + 50) };
}
