import { useEffect, useState } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { getFirebaseDb } from '../../firebase';

export interface DemoIndicator {
  label: string;
}

// The demo flag lives in config/demo and is written only by the local demo seed.
// Null when the workspace is live, the flag is off, or the read fails. A failed read never shows demo content.
export function useDemoIndicator(): DemoIndicator | null {
  const [demo, setDemo] = useState<DemoIndicator | null>(null);
  useEffect(() => onSnapshot(doc(getFirebaseDb(), 'config', 'demo'), (snap) => {
    const data = snap.data() as { active?: unknown; label?: unknown } | undefined;
    setDemo(data?.active === true && typeof data.label === 'string' ? { label: data.label } : null);
  }, () => setDemo(null)), []);
  return demo;
}
