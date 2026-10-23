import { useEffect, useState } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { getFirebaseDb } from '../../firebase';

export interface HotlineNumber {
  label: string;
  number: string;
}

export interface Hotlines {
  numbers: HotlineNumber[];
  residentNotice: string;
}

const EMPTY: Hotlines = { numbers: [], residentNotice: '' };

// The hotline numbers and the resident notice, saved by the admin settings screen in config/hotlines.
export function useHotlines(): Hotlines {
  const [hotlines, setHotlines] = useState<Hotlines>(EMPTY);
  useEffect(() => onSnapshot(doc(getFirebaseDb(), 'config', 'hotlines'), (snap) => {
    const data = snap.data() as Partial<Hotlines> | undefined;
    setHotlines({ numbers: data?.numbers ?? [], residentNotice: data?.residentNotice ?? '' });
  }, () => setHotlines(EMPTY)), []);
  return hotlines;
}
