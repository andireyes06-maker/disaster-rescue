import { useEffect, useState } from 'react';
// Normal CSS exit is 140ms. An interrupted/missing animation-end event must not
// leave a closed nested dialog retaining the parent's accessibility/focus lock.
export function useDialogPresence(open: boolean) {
  const [retained, setRetained] = useState(open);
  useEffect(() => {
    if (open) { setRetained(true); return; }
    const timer = window.setTimeout(() => setRetained(false), 300);
    return () => window.clearTimeout(timer);
  }, [open]);
  return open || retained;
}
