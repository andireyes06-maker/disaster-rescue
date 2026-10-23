import { useEffect, useState } from 'react';
import { collection, query, limit, orderBy, where, onSnapshot, type FirestoreError } from 'firebase/firestore';
import { getFirebaseDb } from '../../firebase';

export interface MyNotification {
  id: string;
  title: string;
  body: string;
  reportId: string;
  read: boolean;
  createdAt: Date;
}

const time = (n: MyNotification) => n.createdAt.getTime();

// Notifications addressed to this resident, newest first. The rules allow this read only for recipientUid == uid.
export function useMyNotifications(uid: string): { notifications: MyNotification[]; error: FirestoreError | null; loading: boolean; windowSize?: number; loadMore?: () => void } {
  const [windowSize, setWindowSize] = useState(50);
  // loading stays true until the first answer, so an empty list is not shown as "none" before the read finishes (W06).
  const [state, setState] = useState<{ notifications: MyNotification[]; error: FirestoreError | null; loading: boolean }>({ notifications: [], error: null, loading: true });

  useEffect(() => {
    if (!uid) { setState({notifications: [], error: null, loading: false}); return undefined; }
    setState({notifications: [], error: null, loading: true});
    const q = query(collection(getFirebaseDb(), 'notifications'), where('recipientUid', '==', uid), orderBy('createdAt', 'desc'), limit(windowSize));
    return onSnapshot(
      q,
      (snap) => {
        const notifications = snap.docs
          .map((d) => {
            const data = d.data();
            const created = data.createdAt && typeof data.createdAt.toDate === 'function' ? data.createdAt.toDate() : new Date(0);
            return { id: d.id, title: data.title, body: data.body, reportId: data.reportId, read: data.read === true, createdAt: created };
          })
          .sort((a, b) => time(b) - time(a));
        setState({ notifications, error: null, loading: false });
      },
      (error) => setState((s) => ({ ...s, error, loading: false })),
    );
  }, [uid, windowSize]);

  return { ...state, windowSize, loadMore: () => setWindowSize(n => n + 50) };
}
