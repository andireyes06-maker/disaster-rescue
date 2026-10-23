import { useEffect, useState } from 'react';
import { collection, query, orderBy, onSnapshot, type DocumentData, type FirestoreError } from 'firebase/firestore';
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
  retry: () => void;
}

export function useReports(): ReportsState {
  const [state, setState] = useState<Omit<ReportsState, 'retry'>>({ reports: [], loading: true, error: null });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    setState((s) => (s.error ? { ...s, loading: true, error: null } : s));
    const q = query(collection(getFirebaseDb(), 'reports'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(
      q,
      (snap) => {
        const reports = snap.docs
          .map((d) => convertReport(d.id, d.data()))
          .sort((a, b) => time(b.createdAt) - time(a.createdAt));
        setState({ reports, loading: false, error: null });
      },
      (error) => setState((s) => ({ ...s, loading: false, error })),
    );
    return unsubscribe;
  }, [attempt]);

  const retry = () => setAttempt((n) => n + 1);
  return { ...state, retry };
}
