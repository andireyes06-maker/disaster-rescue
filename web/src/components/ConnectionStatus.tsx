import { useSyncExternalStore } from 'react';
import Banner from './calm/Banner';

const subscribe = (notify: () => void) => {
  window.addEventListener('online', notify);
  window.addEventListener('offline', notify);
  return () => { window.removeEventListener('online', notify); window.removeEventListener('offline', notify); };
};
const snapshot = () => navigator.onLine;
const serverSnapshot = () => true;
const useOnline = () => useSyncExternalStore(subscribe, snapshot, serverSnapshot);

export function ConnectionStatus() {
  const online = useOnline();
  return online ? null : <div className="connection-status"><Banner tone="info" role="status">You are offline. Reports and assignments may be out of date. Reconnect before relying on their status or sending changes.</Banner></div>;
}

export function ConnectionNotice({ fromCache }: { fromCache?: boolean }) {
  const online = useOnline();
  return online && fromCache ? <Banner tone="info" role="status">Showing saved information. Statuses may be out of date while the connection is being confirmed.</Banner> : null;
}
