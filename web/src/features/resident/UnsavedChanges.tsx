import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { UNSAFE_DataRouterContext, useBlocker } from 'react-router-dom';

// Lets a page that holds unsent input (the report form) tell the layout to ask before in-app navigation (F06).
// Reload and tab close are covered separately by beforeunload in the page itself.
interface UnsavedChangesValue {
  dirty: boolean;
  setDirty: (dirty: boolean) => void;
  hasRouterGuard: boolean;
}

const UnsavedChangesContext = createContext<UnsavedChangesValue>({ dirty: false, setDirty: () => {}, hasRouterGuard: false });

export const LEAVE_MESSAGE = 'You have an unsent report. Leave this page and lose what you entered?';

export function UnsavedChangesProvider({ children }: { children: ReactNode }) {
  const [dirty, updateDirty] = useState(false);
  const dirtyRef = useRef(false);
  const hasRouterGuard = Boolean(useContext(UNSAFE_DataRouterContext));
  const setDirty = useCallback((next: boolean) => { dirtyRef.current = next; updateDirty(next); }, []);
  const value = useMemo(() => ({ dirty, setDirty, hasRouterGuard }), [dirty, setDirty, hasRouterGuard]);
  return <UnsavedChangesContext.Provider value={value}>
    {hasRouterGuard && <NavigationGuard dirtyRef={dirtyRef} />}{children}
  </UnsavedChangesContext.Provider>;
}

function NavigationGuard({ dirtyRef }: { dirtyRef: { current: boolean } }) {
  const blocker = useBlocker(({ currentLocation, nextLocation }) => dirtyRef.current && currentLocation.pathname !== nextLocation.pathname);
  useEffect(() => {
    if (blocker.state !== 'blocked') return;
    if (window.confirm(LEAVE_MESSAGE)) blocker.proceed();
    else blocker.reset();
  }, [blocker]);
  return null;
}

export function useUnsavedChanges(): UnsavedChangesValue {
  return useContext(UnsavedChangesContext);
}

// Returns true when navigation may continue. Declining keeps the user on the page with their entries.
export function confirmLeave(dirty: boolean): boolean {
  return !dirty || window.confirm(LEAVE_MESSAGE);
}
