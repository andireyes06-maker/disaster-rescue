import { useEffect, useRef } from 'react';
import { getFirebaseAuth } from '../../firebase-auth';
import { draftGeneration } from './draftStore';

// Every asynchronous action belongs to one mounted view, access generation and Auth user object.
// A same-UID sign-in creates a different user object; it cannot inherit an earlier action.
export function useResponderAction(reportId: string, scope = '') {
  const lifetime = useRef<object | null>(null);
  const currentView = useRef({ reportId, scope });
  currentView.current = { reportId, scope };
  useEffect(() => {
    const lifetimeId = {};
    lifetime.current = lifetimeId;
    return () => { if (lifetime.current === lifetimeId) lifetime.current = null; };
  }, [reportId, scope]);

  return () => {
    const lifetimeId = lifetime.current;
    const generation = draftGeneration(reportId);
    const auth = getFirebaseAuth();
    const user = auth.currentUser;
    const isCurrent = () => lifetimeId !== null && lifetime.current === lifetimeId
      && currentView.current.scope === scope && currentView.current.reportId === reportId && draftGeneration(reportId) === generation
      && auth.currentUser === user;
    return {
      isCurrent,
      getToken: async () => {
        if (!isCurrent()) throw new Error('Responder action ended');
        const token = user ? await user.getIdToken() : null;
        if (!isCurrent()) throw new Error('Responder action ended');
        return token;
      },
    };
  };
}
