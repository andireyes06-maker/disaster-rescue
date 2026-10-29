import { disableNetwork, enableNetwork, type Firestore } from 'firebase/firestore';

// WebKit can retry a cancelled emulator Listen request while the old document is
// unloading, producing spurious access-control errors. Stop it before teardown.
// This hook is installed only for the local emulator, never hosted Firestore.
export function attachEmulatorLifecycle(db: Firestore): () => void {
  let paused = false;
  let leaving = false;
  let recovery: ReturnType<typeof setTimeout> | undefined;
  const clearRecovery = () => {
    if (recovery !== undefined) clearTimeout(recovery);
    recovery = undefined;
  };
  const report = (error: unknown) => console.warn('Local Firestore connection lifecycle failed', error);
  const resume = () => {
    if (!paused) return;
    paused = false;
    void enableNetwork(db).catch(report);
  };
  const beforeUnload = () => {
    if (!paused) {
      paused = true;
      void disableNetwork(db).catch(report);
    }
    clearRecovery();
    // If navigation is cancelled, pagehide never fires. Restore the connection
    // after the unload turn, rather than reconnecting during WebKit's teardown.
    recovery = setTimeout(() => {
      recovery = undefined;
      if (!leaving) resume();
    }, 1000);
  };
  const pageHide = () => { leaving = true; clearRecovery(); };
  const pageShow = () => { leaving = false; resume(); };
  window.addEventListener('beforeunload', beforeUnload);
  window.addEventListener('pagehide', pageHide);
  window.addEventListener('pageshow', pageShow);
  return () => {
    clearRecovery();
    window.removeEventListener('beforeunload', beforeUnload);
    window.removeEventListener('pagehide', pageHide);
    window.removeEventListener('pageshow', pageShow);
    resume();
  };
}
