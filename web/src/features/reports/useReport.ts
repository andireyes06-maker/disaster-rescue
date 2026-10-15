import { useEffect, useState } from 'react';
import { doc, onSnapshot, type FirestoreError } from 'firebase/firestore';
import { getFirebaseDb } from '../../firebase';
import type { Report } from '../../types/domain';
import { convertReport } from './useReports';

export const MAX_DUPLICATE_IDS = 10;

export interface ReportState {
  report: Report | null;
  loading: boolean;
  error: FirestoreError | null;
  notFound: boolean;
  removed: boolean;
}

export interface ReportEntry {
  report: Report | null;
  loading: boolean;
}

export function useReport(id: string) {
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<ReportState>({ report: null, loading: true, error: null, notFound: false, removed: false });

  useEffect(() => {
    let seen = false;
    setState({ report: null, loading: true, error: null, notFound: false, removed: false });
    const unsubscribe = onSnapshot(
      doc(getFirebaseDb(), 'reports', id),
      (snap) => {
        if (snap.exists()) {
          seen = true;
          setState({ report: convertReport(snap.id, snap.data()), loading: false, error: null, notFound: false, removed: false });
        } else {
          setState({ report: null, loading: false, error: null, notFound: !seen, removed: seen });
        }
      },
      (error) => setState({ report: null, loading: false, error, notFound: false, removed: false }),
    );
    return unsubscribe;
  }, [id, attempt]);

  return { ...state, retry: () => setAttempt((n) => n + 1) };
}

// One doc listener per id. byId[id] is { report, loading } where report is null when unavailable.
export function useReportsByIds(ids: string[] | undefined): Record<string, ReportEntry> {
  const key = (ids || []).slice(0, MAX_DUPLICATE_IDS).join('|');
  const [byId, setById] = useState<Record<string, ReportEntry>>({});

  useEffect(() => {
    const list = key ? key.split('|') : [];
    setById(Object.fromEntries(list.map((id) => [id, { report: null, loading: true }])));
    const unsubs = list.map((id) => onSnapshot(
      doc(getFirebaseDb(), 'reports', id),
      (snap) => setById((m) => ({ ...m, [id]: { report: snap.exists() ? convertReport(snap.id, snap.data()) : null, loading: false } })),
      () => setById((m) => ({ ...m, [id]: { report: null, loading: false } })),
    ));
    return () => unsubs.forEach((u) => u());
  }, [key]);

  return byId;
}
