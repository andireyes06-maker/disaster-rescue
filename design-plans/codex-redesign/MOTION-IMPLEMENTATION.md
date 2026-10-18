# Product motion implementation — October 17, 2026

Airen explicitly requested a dynamic website with notification opening/closing, page transitions, and a flow of motion. This implementation supersedes the earlier static-motion direction. Preserve the preceding skeleton optimization and all other working-tree repairs.

## Motion design

- Focal sequence: the public response workspace introduces its queue, draws the response route, then presents the field update. The opening copy arrives with the scene. Major lower-page compositions reveal once when reached; content is visible by default if scripting or observer support is unavailable.
- Continuity: resident, staff, authentication, and Forbidden workspaces enter on navigation. Persistent navigation is stationary. History navigation reverses the small vertical direction. Lazy-loaded pages animate when actual content is ready. No route-key remounting, duplicate subscriptions, delayed action enablement, or loading data replay choreography.
- Notification feedback: 300ms origin-aware expansion, 160ms exit, a brief bell acknowledgement, an unread-count arrival on changes, and a capped five-row/140ms stagger. Radix retains closing content until the exit finishes and restores focus.
- Controls: press compression, directional CTA icons, navigation underline progression, and smooth landing anchor travel. No parallax or perpetual decorative loop.
- Budget: CSS/WAAPI transform and opacity for routine motion; a bounded public panel mask and short schematic SVG route draw for the focal sequence. No animation dependency, React per-frame state updates, or scroll event listener. IntersectionObserver handles section arrival. Finished route animations are not held with forwards fill; cleanup cancels old motion on navigation.
- Reduced motion: no spatial entrances, drawing, scroll animation, or notification choreography. Preference changes cancel running WAAPI effects immediately. Content remains present and interactive.

## Implementation

`web/src/components/ProductMotion.tsx` coordinates route/public effects. `product-motion.css` provides popover lifecycle animations and interaction feedback. `App.tsx` installs the coordinator above Suspense; existing route/auth/form behavior is retained. `NotificationBell.tsx` keys the count badge by unread count so actual changes receive feedback. Root `DESIGN.md` now records the requested motion direction.

## Evidence and checks

- `npm test`: 290 tests across 44 files passed, including TypeScript. New tests cover preserving workspace input through navigation, lazy content, reduced motion, and immediate cancellation on preference changes.
- `npm run build`: passed. `git diff --check`: clean.
- Local browser at 1440 and 390px recorded running notification-open, notification-close, notification-row, bell, and route animations with actual durations; route samples had no horizontal overflow. Escape closed the popover and returned focus. Form input remained usable during navigation entrances.
- Signed-out landing recorded actual hero/route/update sequences and section reveal effects. Reduced-motion checks recorded zero running animations on landing, notifications, and resident navigation, with the heading visible.
- `evidence/motion-checks.json` is the runtime record. `motion-landing-entry.png` and `motion-notifications-enter-{1440,390}.png` deliberately capture intermediate frames, not settled opacity/contrast.
- `evidence/product-motion-preview.webm` records the actual browser sequence, including the landing entrance, scroll travel, sign-in, desktop/phone notifications, navigation, and reduced-motion checks. It uses local demo content only.
- Browser used a guarded local demo Firebase emulator context. No report or notification mutation was sent. Production and Flutter were untouched.

This is runtime/interaction verification on desktop Chromium and a phone viewport, not a physical-device performance certification. No GPU/frame-time trace or real mobile Safari/Android profiling was completed. No commit, push, or deployment.

## Claude continuation prompt

Read `DESIGN.md`, `design-plans/codex-redesign/HANDOFF.md`, `NOTIFICATION-BELL-HANDOFF.md`, and `MOTION-IMPLEMENTATION.md`. Airen explicitly wants a dynamic interface: preserve the new notification lifecycle animations, page content transitions, landing sequence, scroll arrivals, and control feedback. Do not treat “zero animations after load” as a requirement that removes interaction motion. Keep reduced-motion support, form/state preservation, and stationary navigation. Use the relevant installed motion/design/accessibility skills and inspect actual animations in the browser. Continue unresolved checks, especially interruption, supported-browser rendering, and real-device frame timing when hardware is available. Preserve previous skeleton optimization and functional repairs. Do not touch production, commit, push, or deploy without Airen's instruction.
