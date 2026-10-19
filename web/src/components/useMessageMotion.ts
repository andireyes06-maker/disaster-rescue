import { useLayoutEffect, useRef } from 'react';

// A mounted banner may change from failure to success or receive a new server message.
export function useMessageMotion() {
  const ref = useRef<HTMLDivElement>(null);
  const previous = useRef<string | null>(null);
  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) return;
    const text = element.textContent;
    const changed = previous.current !== null && previous.current !== text;
    previous.current = text;
    if (!changed || !window.matchMedia || !element.animate) return;
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (preference.matches) return;
    const animation = element.animate([{ transform: 'translateY(-3px)', opacity: 1 }, { transform: 'none', opacity: 1 }], { duration: 200, easing: 'cubic-bezier(.16,1,.3,1)' });
    animation.id = 'message-update';
    const stop = () => animation.cancel();
    preference.addEventListener('change', stop);
    return () => { stop(); preference.removeEventListener('change', stop); };
  });
  return ref;
}
