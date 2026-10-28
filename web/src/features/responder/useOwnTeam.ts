import { useEffect, useState } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { getFirebaseDb } from '../../firebase';
import type { Team } from '../../types/domain';

// A document read, never a collection read: responders may see only their own team.
export function useOwnTeam(id: string | null | undefined) {
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<{ id: string | null; team: Team | null; loading: boolean; failed: boolean }>({ id: null, team: null, loading: true, failed: false });
  useEffect(() => {
    if (!id) return;
    let active = true;
    setState({ id, team: null, loading: true, failed: false });
    const unsubscribe = onSnapshot(doc(getFirebaseDb(), 'teams', id), snap => {
      if (active) setState({ id, team: snap.exists() ? { ...snap.data(), id } as Team : null, loading: false, failed: !snap.exists() });
    }, () => { if (active) setState({ id, team: null, loading: false, failed: true }); });
    return () => { active = false; unsubscribe(); };
  }, [id, attempt]);
  return { ...(state.id === id ? state : { id, team: null, loading: !!id, failed: false }), retry: () => setAttempt(n => n + 1) };
}
