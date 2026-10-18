import { useLayoutEffect, useRef, type ComponentPropsWithoutRef } from 'react';

// FLIP bridges ordinary layout changes. Validation uses its local feedback animation:
// translating old fields across newly inserted errors makes the text overlap.
export default function MotionForm(props: ComponentPropsWithoutRef<'form'>) {
  const ref = useRef<HTMLFormElement>(null);
  const previous = useRef(new Map<Element, { x: number; y: number }>());
  const viewport = useRef(0);
  const previousFeedback = useRef('');
  useLayoutEffect(() => {
    const form = ref.current;
    if (!form || !window.matchMedia || !Element.prototype.animate) return;
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
    const animations: Animation[] = [];
    const next = new Map<Element, { x: number; y: number }>();
    const feedback = JSON.stringify(Array.from(form.querySelectorAll('.field-error, .calm-field__error, .calm-banner, [role="alert"]'), element => [element.id, element.textContent]));
    const feedbackChanged = previousFeedback.current !== feedback;
    previousFeedback.current = feedback;
    const origin = form.getBoundingClientRect();
    const items = Array.from(form.children).flatMap((element) => element.classList.contains('report-workspace')
      ? Array.from(element.querySelectorAll('.report-form__group')).flatMap((group) => Array.from(group.children))
      : [element]);
    for (const element of items) {
      const box = element.getBoundingClientRect();
      // Ignore viewport scrolling and the separate page entrance on the parent workspace.
      const point = { x: box.left - origin.left, y: box.top - origin.top };
      next.set(element, point);
      const before = previous.current.get(element);
      if (feedbackChanged || preference.matches || viewport.current !== window.innerWidth || !before || box.height === 0) continue;
      const x = before.x - point.x, y = before.y - point.y;
      if (Math.abs(x) < 1 && Math.abs(y) < 1) continue;
      const animation = element.animate([{ transform: `translate(${x}px, ${y}px)` }, { transform: 'none' }], {
        duration: 220, easing: 'cubic-bezier(0.16, 1, 0.3, 1)',
      });
      animation.id = 'form-reflow';
      animations.push(animation);
    }
    previous.current = next;
    viewport.current = window.innerWidth;
    const stop = () => animations.forEach((animation) => animation.cancel());
    const onChange = () => { if (preference.matches) stop(); };
    preference.addEventListener('change', onChange);
    return () => { stop(); preference.removeEventListener('change', onChange); };
  });
  return <form {...props} ref={ref} />;
}
