# 001: Create coherent interaction motion

- **Status:** PROPOSED; execution not authorized
- **Commit:** `162f2fc` plus existing working-tree edits
- **Severity:** MEDIUM
- **Category:** Cohesion, accessibility, performance, purposeful motion
- **Estimated scope:** shared tokens/styles, dialog/select/button primitives, navigation, and proposed inbox preview

## Problem and current evidence

Airen requested a complete motion redesign while retaining the instruction not to change code. This plan defines the future target; it does not claim measured jank or broken runtime behavior.

- `web/src/styles.css:123–124` wraps `.btn, .navlink { transition: background-color 0.15s ease; }` in `prefers-reduced-motion: no-preference`.
- `web/src/components/ui/dialog.tsx:42` uses `duration-100` with open/closed fade animation classes.
- `web/src/components/ui/dialog.tsx:65` uses `duration-100` with open/closed fade and `zoom-in-95`/`zoom-out-95` classes. No local reduced-motion variant is specified in that class string. Runtime dependency behavior must be inspected before asserting the complete reduced-motion behavior.
- `web/src/components/ui/button.tsx:7` includes `transition-all` and `active:not-aria-[haspopup]:translate-y-px`. This Button reaches dialog close controls via `dialog.tsx`; most feature actions instead use the separate `.btn` class.
- `web/src/features/map/IncidentMap.tsx` uses `map.fitBounds(..., { padding: [36, 36], maxZoom: 14, animate: false })`. Preserve that intentional non-animated update.
- Stack: React, CSS/Tailwind, tw-animate-css, Radix dialog/select, Leaflet. No additional animation framework is required.

## Target

Use a shared named duration/easing system instead of independent class values. Exact proposed tokens:

| Token | Value | Use |
|---|---|---|
| `--motion-press` | `120ms` | Pointer press feedback |
| `--motion-feedback` | `160ms` | Small state feedback |
| `--motion-popover` | `160ms` | Trigger-anchored small popup |
| `--motion-dialog-open` | `200ms` | Occasional modal entrance |
| `--motion-dialog-close` | `160ms` | Modal exit |
| `--motion-drawer` | `240ms` | Mobile navigation entrance |
| `--motion-ease-out` | `cubic-bezier(0.23, 1, 0.32, 1)` | Enter/exit |
| `--motion-ease-in-out` | `cubic-bezier(0.77, 0, 0.175, 1)` | Deliberate movement |
| `--motion-ease-drawer` | `cubic-bezier(0.32, 0.72, 0, 1)` | Navigation slide |

Values are proposed within the motion skill's interaction budgets. They are not existing project tokens. Define them once in the existing theme owner `web/src/theme/tokens.css`, then reconcile consumers rather than adding a parallel animation package.

### Behavior by interaction

- **Frequent selection:** selected report, filter results, keyboard route navigation, and repeated list actions update immediately. Do not animate the entire pane or replay its contents on every selection. Focus stays on the initiating control unless the user explicitly opens a new view.
- **Buttons:** immediate pressed styling. For a pointer-activated ordinary button, allow scale `1` to `0.98` over `120ms`; return over `160ms`, using the ease-out token. Never scale an entire row or move a keyboard-focused button. Color-only hover feedback may use `150ms ease`. Restrict animated properties explicitly; remove `transition-all` in reached Button consumers.
- **Dialogs:** content opacity `0 → 1`, scale `0.97 → 1`, `200ms`, centered origin. Exit reverse over `160ms`. Overlay fades without scale. Keep existing centering transforms separate so animation cannot overwrite `translate(-50%, -50%)`. Maintain Radix presence long enough for exit; do not delay focus acquisition until animation completion.
- **Select/popover:** preserve the Radix-provided transform origin. Opacity and scale `0.97 → 1` over `160ms`; remove decorative slide if it makes the popup drift away from its anchor. Do not animate native HTML select menus.
- **Mobile navigation:** proposed modal drawer enters from its own left edge, transform `translateX(-100%) → translateX(0)`, `240ms` using the drawer curve. Exit `200ms`. Scrim fades. If the existing inline menu is retained instead, use an immediate disclosure; do not apply drawer semantics to inline navigation accidentally.
- **Disclosures:** update expanded layout immediately. Optional opacity `0 → 1` over `160ms` for newly exposed content; no animated height, clipping of focused inputs, or delayed validation access.
- **Saving:** show the pending label immediately; reserve its space. A spinner may rotate at `700ms linear infinite` only while a visible request is pending, and must stop when hidden/unmounted. Do not invent a minimum waiting time or animate counts upward.
- **Success/error:** show meaningful inline text immediately. A decorative confirmation icon may fade over `160ms`; critical errors never slide in late or shake the form. Announce the result once.
- **Photo viewer:** reuse dialog opening; switching photos is immediate. Preserve labels, next/previous eligibility, Escape, and focus return. No sideways image sweep.
- **Map/charts:** preserve non-animated automatic bounds changes and non-animated data bars. No camera movement or number tweening after background updates.
- **Routes:** no universal page slide or fade. Preserve ordinary browser scroll restoration and explicit focus/heading behavior. No artificial delay when switching roles or opening emergency guidance.

## Interruption and accessibility

For reversible navigation/disclosure motion, transitions retarget from the current visual state. Rapid open/close must not restart from a hidden baseline, strand an overlay, or trap focus on an unmounted element. If existing keyframes cannot meet this, use CSS transitions with state attributes and the existing primitives' presence lifecycle; do not rebuild focus handling.

Under `prefers-reduced-motion: reduce`, disable translate, scale, rotation, looping effects, and animated smooth scrolling. Immediate updates are valid. Optional `100ms` opacity feedback may remain. Replace any spinner with static pending text. Preserve busy semantics and status announcements. A change to this preference while a panel is open must not remove its content.

Gate pointer hover effects with `(hover: hover) and (pointer: fine)`. Keyboard focus is immediate and visible; no delayed focus ring or animated keyboard navigation. Maintain text-and-shape meaning regardless of motion.

## Repo conventions to follow

Reuse Radix in `web/src/components/ui/dialog.tsx` and `select.tsx`; preserve their focus and keyboard behavior. Use the existing global `.btn` and `Button` owners deliberately, without duplicate motion layers on one control. The current `.btn` reduced-motion guard is the local precedent. Keep map `animate: false`.

## Steps after authorization

1. Recheck the commit, current diff, and actual imported primitive paths. Reconcile drift with the current files; do not overwrite concurrent resident/admin work.
2. Add the named motion tokens to the existing theme owner and record the agreed motion system in the eventual design system documentation.
3. Reconcile `.btn` and reached `Button` transitions, specifying properties and pointer/keyboard behavior. Preserve sizing and existing event handlers.
4. Update shared dialog timing, presence, transform composition, and reduced-motion behavior; verify assignment/rejection/photo/confirmation consumers.
5. Update reached select popups without changing native select controls. Keep origin anchoring.
6. Implement the agreed mobile menu behavior and focused inbox selection flow only as part of their authorized UX changes. Motion must not introduce a second selection state owner.
7. Apply immediate pending and local result feedback to existing forms without changing request contracts. Keep the resident form's in-flight guard.
8. Inspect reduced motion, rapid reversal, keyboard input, and actual data refresh before declaring the system coherent.

## Boundaries

No backend authorization, report transition, Firebase rule, Flutter, hotline value, or production setting changes. No new animation dependency. No idle decorative movement. Do not imply an image mockup proves the motion. Do not impose decorative delays on repeated incident triage.

## Verification after implementation

- Mechanical: `cd web && npm test`, `npm run build`, and targeted Playwright flows must pass against local demo services.
- Open/close assignment, rejection, photo, and access-change dialogs. Escape and focus return work; failed save preserves entered data; pending mutations do not duplicate.
- Reverse mobile navigation before the entrance finishes, repeatedly. No overlay remains after close. Tab cannot reach hidden controls.
- Select reports and filter results using keyboard. Response and focus are immediate; data updates do not replay entrance motion or change selection unexpectedly.
- In DevTools at 10% playback, check modal centering, anchored popovers, simultaneous overlay/content lifecycle, and absence of layout animation.
- Enable reduced motion and repeat the flows. No scale/slide/spin remains; pending, success, error, and focus remain perceivable.
- Inspect on a real phone plus Chromium/Firefox/WebKit where available. Verify menu controls, photos, text reflow, and on-screen keyboard access.
- Done when the reached surfaces follow these values, all listed behaviors are observed, and limitations are recorded honestly. This planning pass runs no tests and claims no runtime pass.
