import { useEffect, useState } from 'react';
import { collection, query, where, orderBy, limit, onSnapshot, type FirestoreError } from 'firebase/firestore';
import { getFirebaseDb } from '../../firebase';
import type { Report } from '../../types/domain';
import { convertReport, type ReportsState } from './useReports';
import { AWAITING_STATUSES, sortQueueOldestFirst } from './queueOrder';

// The administrator's queue: reports awaiting action, oldest submission first (professor clarification, 2026-10-23).
// The database returns the oldest open reports first, so a bounded window never hides an older open report
// behind newer ones. Needs the composite index (status ASC, createdAt ASC) in firebase/firestore.indexes.json.
export function useAwaitingReports(): ReportsState {
  const [state, setState] = useState<{ reports: Report[]; loading: boolean; error: FirestoreError | null; fromCache: boolean }>({
    reports: [], loading: true, error: null, fromCache: false,
  });
  const [attempt, setAttempt] = useState(0);
  const [windowSize, setWindowSize] = useState(50);

  useEffect(() => {
    setState((s) => (s.error ? { ...s, loading: true, error: null } : s));
    const q = query(
      collection(getFirebaseDb(), 'reports'),
      where('status', 'in', [...AWAITING_STATUSES]),
      orderBy('createdAt', 'asc'),
      limit(windowSize),
    );
    const unsubscribe = onSnapshot(
      q,
      { includeMetadataChanges: true },
      (snap) => {
        const reports = sortQueueOldestFirst(snap.docs.map((d) => convertReport(d.id, d.data())));
        setState({ reports, loading: false, error: null, fromCache: snap.metadata.fromCache });
      },
      (error) => setState((s) => ({ ...s, loading: false, error })),
    );
    return unsubscribe;
  }, [attempt, windowSize]);

  const retry = () => setAttempt((n) => n + 1);
  return { ...state, retry, windowSize, loadMore: () => setWindowSize((n) => n + 50) };
}
