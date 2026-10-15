import { useEffect, useState } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { getFirebaseDb } from '../../firebase.js';
import { convertReport } from './useReports.js';

export const MAX_DUPLICATE_IDS = 10;

export function useReport(id) {
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState({ report: null, loading: true, error: null, notFound: false, removed: false });

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
export function useReportsByIds(ids) {
  const key = (ids || []).slice(0, MAX_DUPLICATE_IDS).join('|');
  const [byId, setById] = useState({});

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
