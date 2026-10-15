import { useEffect, useState } from 'react';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { getFirebaseDb } from '../../firebase.js';

const toDate = (v) => (v && typeof v.toDate === 'function' ? v.toDate() : v);
const time = (v) => (v instanceof Date ? v.getTime() : 0);

export function convertReport(id, data) {
  return { ...data, id, createdAt: toDate(data.createdAt), updatedAt: toDate(data.updatedAt) };
}

export function useReports() {
  const [state, setState] = useState({ reports: [], loading: true, error: null });

  useEffect(() => {
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
  }, []);

  return state;
}
