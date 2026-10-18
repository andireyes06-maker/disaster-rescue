# Shared UI state motion — October 17, 2026

Airen asked for motion throughout the website, explicitly including registration error text. This extends the page/landing/notification motion system. The preceding Claude fixes to notification row specificity, immediate focus return, rapid reopen, and the composited skeleton sweep are preserved.

## Implemented

- **Validation:** registration, sign-in, and incident reporting use a shared `FieldError` message. New or replaced error text enters with a small 220ms movement at full opacity. Resolved errors leave the accessible tree immediately; validation, IDs, descriptions, field focus, and values are preserved.
- **Form flow:** `MotionForm` replaces native form wrappers across twelve feature files, including staff, admin, responder, and filter forms. It preserves native form props and submission behavior. Existing fields reposition with a 220ms FLIP transform when feedback changes layout. Measurements are relative to the form, so scrolling and the page entrance do not create spurious movement. No height tween, per-frame React update, or animation dependency. Viewport changes reset the measured baseline.
- **Messages:** shared banners enter and animate changed copy without replacing the alert node. Inline alerts, date-range errors, success/status messages, and busy-button feedback have short arrivals. Important messages stay fully opaque.
- **Data states:** loading/empty surfaces, report lists, table containers, incident selection previews, report settings disclosures, attachments, response-history entries, and changed status text receive bounded entrances. Category selection and notification read backgrounds have state transitions. Existing skeleton animation remains unchanged. Stable mounted content does not repeatedly replay on unrelated renders.
- **Disclosures and overlays:** native details animate their revealed content on opening. Shared select popovers and dialogs have entry/exit rules. Assignment, rejection, and photo dialogs now keep their root mounted while closed, allowing Radix to retain content through the exit. Assignment data is fetched only while open. Dialog focus returns when the trap releases, without waiting for the animation, and rapid reopen brings focus back inside. Native details still close using the browser's immediate close behavior; no fake hidden form controls are retained.
- **Reduced motion:** all new CSS and form/banner WAAPI motion have explicit reduced-motion paths. Validation remains immediate. Active form/banner effects cancel on preference change.

Primary additions: `web/src/components/MotionForm.tsx`, `FieldError.tsx`, `useMessageMotion.ts`, `useDialogFocusReturn.ts`, and `MotionForm.test.tsx`. Motion rules live in the existing `product-motion.css`; feature forms and shared Field/Banner primitives use the additions.

## Verified

- Web suite: **294 tests across 45 files**, including TypeScript. Production build passed; `git diff --check` clean.
- New tests verify feedback insertion/removal moves existing controls while preserving values/focus/ARIA, immediate reduced-motion validation, changing banner copy without replacing its alert, and no team fetch while the assignment dialog is closed.
- Chromium 156, cached Firefox 155, and cached WebKit 27.2: registration and sign-in at **1440 and 390px**. Five registration error entrances, real form-reflow animation IDs, removal/reflow after correcting the name, first-invalid-field focus, and no horizontal overflow. Reduced-motion repetitions recorded zero running animations.
- The same three engines at 390px: rejection and assignment dialog entry/exit, Escape focus return, and Escape → Enter while exiting. All six runs reopened exactly one panel with focus inside. No staff action was submitted.
- Existing photo-viewer tests passed. The new photo exit/focus path shares the tested dialog mechanism but was not separately measured in a browser.
- Evidence: `evidence/state-motion-checks.json`, `dialog-state-motion-checks.json`, and `state-errors-{chromium,firefox,webkit}-{1440,390}.png`. Logs are in `checks/codex-state-motion-*.log` and `checks/codex-dialog-motion-browser.log`.

These are source, unit, and sampled browser checks—not an exhaustive browser run of every loading/failure permutation. No new device-performance trace, screen-reader announcement audit, physical device run, or Flutter work was performed in this pass. Browser staff checks were guarded local demo-emulator sign-in and open/close actions only; registration checks deliberately failed client validation and created no account. No production action, commit, push, or deployment.

## Claude continuation

Read this document after `MOTION-IMPLEMENTATION.md` and the cross-browser motion review. Preserve the new state-motion layer and all prior fixes. Airen explicitly wants motion throughout UI state changes, including registration errors; do not strip it back to a static implementation. Continue remaining screen-reader/device/performance verification and inspect real state changes before changing animation behavior. Keep validation immediate, values and focus intact, reduced motion supported, and production untouched. Do not commit, push, or deploy without Airen's instruction.
