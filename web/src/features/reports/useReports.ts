import { useEffect, useState } from 'react';
import { collection, query, where, limit, orderBy, onSnapshot, type DocumentData, type FirestoreError } from 'firebase/firestore';
import { getFirebaseDb } from '../../firebase';
import type { Report } from '../../types/domain';

interface TimestampLike {
  toDate: () => Date;
}

const isTimestamp = (v: unknown): v is TimestampLike =>
  typeof v === 'object' && v !== null && 'toDate' in v && typeof v.toDate === 'function';

const toDate = (v: unknown): Date => (isTimestamp(v) ? v.toDate() : (v as Date));
const time = (v: unknown): number => (v instanceof Date ? v.getTime() : 0);

// Boundary: Firestore documents are untyped. Timestamps become Date; other fields are trusted to match Report.
export function convertReport(id: string, data: DocumentData): Report {
  // verifiedAt is written by the API when an administrator validates a report.
  const verifiedAt = data.verifiedAt === undefined || data.verifiedAt === null ? undefined : toDate(data.verifiedAt);
  return { ...data, id, createdAt: toDate(data.createdAt), updatedAt: toDate(data.updatedAt), verifiedAt } as Report;
}

export interface ReportsState {
  reports: Report[];
  loading: boolean;
  error: FirestoreError | null;
  fromCache: boolean;
  retry: () => void;
  windowSize?: number;
  loadMore?: () => void;
}

export function useReports(status?: Report['status']): ReportsState {
  const [state, setState] = useState<Omit<ReportsState, 'retry'> & { scope?: Report['status'] }>({ reports: [], loading: true, error: null, fromCache: false });
  const [attempt, setAttempt] = useState(0);
  const [windowSize, setWindowSize] = useState(50);

  useEffect(() => {
    let active = true;
    setState(s => s.scope !== status ? { reports: [], loading: true, error: null, fromCache: false, scope: status } : s.error ? { ...s, loading: true, error: null } : s);
    const q = query(collection(getFirebaseDb(), 'reports'), ...(status ? [where('status', '==', status)] : []), orderBy('createdAt', 'desc'), limit(windowSize));
    const unsubscribe = onSnapshot(
      q,
      { includeMetadataChanges: true },
      (snap) => {
        if (!active) return;
        const reports = snap.docs
          .map((d) => convertReport(d.id, d.data()))
          .sort((a, b) => time(b.createdAt) - time(a.createdAt));
        setState({ reports, loading: false, error: null, fromCache: snap.metadata.fromCache, scope: status });
      },
      (error) => { if (active) setState((s) => ({ ...s, loading: false, error })); },
    );
    return () => { active = false; unsubscribe(); };
  }, [attempt, windowSize, status]);

  const retry = () => setAttempt((n) => n + 1);
  return { ...(state.scope === status ? state : { reports: [], loading: true, error: null, fromCache: false }), retry, windowSize, loadMore: () => setWindowSize(n => n + 50) };
}
