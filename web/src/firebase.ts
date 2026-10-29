import { getFirestore, connectFirestoreEmulator, type Firestore } from 'firebase/firestore';
import { attachEmulatorLifecycle } from './firebase-emulator-lifecycle';
import { getFirebaseApp, shouldUseEmulators } from './firebase-auth';
export { getFirebaseAuth, shouldUseEmulators } from './firebase-auth';

let db: Firestore | undefined;
const firestorePort = () => Number(import.meta.env.VITE_FIRESTORE_EMULATOR_PORT) || 8080;

export function getFirebaseDb(): Firestore {
  if (db) return db;
  db = getFirestore(getFirebaseApp());
  if (shouldUseEmulators(import.meta.env)) {
    connectFirestoreEmulator(db, 'localhost', firestorePort());
    const detach = attachEmulatorLifecycle(db);
    import.meta.hot?.dispose(detach);
  }
  return db;
}
