import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';

// Lets a page that holds unsent input (the report form) tell the layout to ask before in-app navigation (F06).
// Reload and tab close are covered separately by beforeunload in the page itself.
interface UnsavedChangesValue {
  dirty: boolean;
  setDirty: (dirty: boolean) => void;
}

const UnsavedChangesContext = createContext<UnsavedChangesValue>({ dirty: false, setDirty: () => {} });

export const LEAVE_MESSAGE = 'You have an unsent report. Leave this page and lose what you entered?';

export function UnsavedChangesProvider({ children }: { children: ReactNode }) {
  const [dirty, setDirty] = useState(false);
  const value = useMemo(() => ({ dirty, setDirty }), [dirty]);
  return <UnsavedChangesContext.Provider value={value}>{children}</UnsavedChangesContext.Provider>;
}

export function useUnsavedChanges(): UnsavedChangesValue {
  return useContext(UnsavedChangesContext);
}

// Returns true when navigation may continue. Declining keeps the user on the page with their entries.
export function confirmLeave(dirty: boolean): boolean {
  return !dirty || window.confirm(LEAVE_MESSAGE);
}
