import { useEffect, useRef, type RefObject } from 'react';

// Wait for the closed state to release the focus trap, not for the exit animation.
export function useDialogFocusReturn(open: boolean, trigger: RefObject<HTMLElement | null> | undefined, content?: RefObject<HTMLElement | null>) {
  const wasOpen = useRef(open);
  useEffect(() => {
    if (wasOpen.current && !open) trigger?.current?.focus();
    // Radix reuses content when reopening during an exit, so its mount autofocus does not run.
    if (!wasOpen.current && open) content?.current?.focus();
    wasOpen.current = open;
  }, [open, trigger, content]);
}
