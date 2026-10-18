import { useEffect } from 'react';
import { useLocation, useNavigationType } from 'react-router-dom';
import './product-motion.css';

// One motion coordinator; route changes never remount forms or duplicate live subscriptions.
// Default content stays visible when WAAPI or IntersectionObserver is unavailable.
export default function ProductMotion() {
  const { pathname } = useLocation();
  const navigationType = useNavigationType();

  useEffect(() => {
    if (!window.matchMedia || !Element.prototype.animate) return;
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (preference.matches) return;
    const animations: Animation[] = [];
    let revealObserver: IntersectionObserver | undefined;
    let started = false;
    const ease = 'cubic-bezier(0.16, 1, 0.3, 1)';
    function play(element: Element | null, frames: Keyframe[], duration = 340, delay = 0) {
      if (element) animations.push(element.animate(frames, { duration, delay, easing: ease, fill: 'backwards' }));
    }
    function start() {
      if (started) return;
      const content = document.querySelector('.resident__body, .shell__main, .login-page main, .service-site main');
      if (!content) return; // Suspense/auth may still be resolving; observe until the actual page exists.
      started = true;
      pending.disconnect();
      if (pathname === '/' && document.querySelector('.service-site')) {
        // Keep the headline, description, and safety guidance readable immediately;
        // fading this large text block also delayed the landing's measured LCP.
        play(document.querySelector('.service-opening__copy'), [{ transform: 'translateY(18px)' }, { transform: 'none' }], 550);
        play(document.querySelector('.response-scene'), [{ opacity: .2, clipPath: 'inset(0 0 12% 0 round 16px)', transform: 'translateY(20px)' }, { opacity: 1, clipPath: 'inset(0 0 0% 0 round 16px)', transform: 'none' }], 680, 100);
        document.querySelectorAll('.sample-incident').forEach((row, i) => play(row, [{ opacity: .3, transform: 'translateX(-12px)' }, { opacity: 1, transform: 'none' }], 360, 200 + i * 70));
        play(document.querySelector('.console__map-route'), [{ strokeDashoffset: '1' }, { strokeDashoffset: '0' }], 850, 420);
        play(document.querySelector('.sample-update'), [{ opacity: 0, transform: 'translateY(10px)' }, { opacity: 1, transform: 'none' }], 420, 650);
        if ('IntersectionObserver' in window) {
          revealObserver = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
              if (!entry.isIntersecting) return;
              revealObserver?.unobserve(entry.target);
              // Reveal each major composition once; never conceal offscreen content with CSS.
              play(entry.target, [{ opacity: .35, transform: 'translateY(24px)' }, { opacity: 1, transform: 'none' }], 520);
            });
          }, { threshold: .12 });
          document.querySelectorAll('.service-journey, .service-resident, .service-team, .service-access').forEach((section) => revealObserver?.observe(section));
        }
      } else {
        const direction = navigationType === 'POP' ? -1 : 1;
        // Persistent navigation remains stationary; only the page workspace changes.
        play(content, [{ opacity: .25, transform: `translateY(${direction * 10}px)` }, { opacity: 1, transform: 'none' }], 320);
        play(document.querySelector('.resident-band'), [{ opacity: .4, transform: 'translateY(6px)' }, { opacity: 1, transform: 'none' }], 280);
      }
    }
    const pending = new MutationObserver(start);
    pending.observe(document.getElementById('root') ?? document.body, { childList: true, subtree: true });
    start();
    function stop() {
      pending.disconnect();
      revealObserver?.disconnect();
      animations.forEach((animation) => animation.cancel());
    }
    const onPreferenceChange = () => { if (preference.matches) stop(); };
    preference.addEventListener('change', onPreferenceChange);
    return () => { stop(); preference.removeEventListener('change', onPreferenceChange); };
  }, [pathname, navigationType]);

  return null;
}
