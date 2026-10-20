import { useEffect, useState } from 'react';
import { collection, query, limit, orderBy, onSnapshot, type DocumentData, type FirestoreError } from 'firebase/firestore';
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
  return { ...data, id, createdAt: toDate(data.createdAt), updatedAt: toDate(data.updatedAt) } as Report;
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

export function useReports(): ReportsState {
  const [state, setState] = useState<Omit<ReportsState, 'retry'>>({ reports: [], loading: true, error: null, fromCache: false });
  const [attempt, setAttempt] = useState(0);
  const [windowSize, setWindowSize] = useState(50);

  useEffect(() => {
    setState((s) => (s.error ? { ...s, loading: true, error: null } : s));
    const q = query(collection(getFirebaseDb(), 'reports'), orderBy('createdAt', 'desc'), limit(windowSize));
    const unsubscribe = onSnapshot(
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
    return unsubscribe;
  }, [attempt, windowSize]);

  const retry = () => setAttempt((n) => n + 1);
  return { ...state, retry, windowSize, loadMore: () => setWindowSize(n => n + 50) };
}
