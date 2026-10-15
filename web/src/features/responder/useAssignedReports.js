import { useEffect, useState } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { getFirebaseDb } from '../../firebase.js';
import { convertReport } from '../reports/useReports.js';
import { isOpen } from '../reports/format.js';

const time = (v) => (v instanceof Date ? v.getTime() : 0);

// One equality filter in the query (assignedTeamId); status filtering and sorting happen in memory.
export function useAssignedReports(teamId) {
  const [state, setState] = useState({ reports: [], loading: true, error: null });

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
  }, [teamId]);

  return state;
}
