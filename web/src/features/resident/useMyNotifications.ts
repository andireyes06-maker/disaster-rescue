import { useEffect, useState } from 'react';
import { collection, query, where, onSnapshot, type FirestoreError } from 'firebase/firestore';
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
export function useMyNotifications(uid: string): { notifications: MyNotification[]; error: FirestoreError | null } {
  const [state, setState] = useState<{ notifications: MyNotification[]; error: FirestoreError | null }>({ notifications: [], error: null });

  useEffect(() => {
    if (!uid) return undefined;
    const q = query(collection(getFirebaseDb(), 'notifications'), where('recipientUid', '==', uid));
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
        setState({ notifications, error: null });
      },
      (error) => setState((s) => ({ ...s, error })),
    );
  }, [uid]);

  return state;
}
