# Busy-control audit continuation — October 17, 2026

Completed the five component groups left in Claude’s continuation: AccountsPanel, UsersPage, TeamsPage, ExportButtons, and NotificationBell. Existing changes in the shared tree were preserved. Nothing committed, pushed, or deployed.

## Changes

- Busy action buttons use aria-disabled and aria-busy while remaining keyboard focusable. Shared button and notification CSS retain the disabled appearance and wait cursor.
- Synchronous ref guards block duplicate requests, including repeated Enter before a render. Accounts and notifications guard per identifier; users, exports, and each team form guard their own request.
- Users/team form validation still runs through the existing schemas. Empty form buttons remain focusable with aria-disabled; schema validation prevents submission.
- When a successful role save removes its button, focus returns to its role selector if the user is still in that control group. When a successful notification read removes its button, focus moves to the panel’s close button only if focus was on that action. Neither steals focus from a user who moved elsewhere.

## Verification

- Typecheck clean. Web suite: **328 tests across 49 files**, including nine new tests for pending focus, repeated activation, failure recovery, and focus when actions disappear. Production build succeeds. Logs saved here.
- Actual local demo browser checks: Chromium at 1440px and WebKit at 390px. Team creation, team rename, staff account creation, account activation/deactivation, and CSV download each retain focus while pending and after failure; repeated Enter produces exactly one request.
- Runtime project checked as demo-disaster-rescue with Auth emulator enabled before sign-in. Write and export requests intercepted with delayed 503 responses; no audit writes persisted. JSON records saved alongside this file. The script records the actual environment and aborts for non-demo auth.
- Reproduction: `node design-plans/busy-focus-2026-10-17/browser-check.cjs` for Chromium desktop; append `WebKit 390` for WebKit phone. Requires the same local demo stack and cached browsers. Script uses absolute local paths.

## Still open

S06 is implemented for these remaining controls, with browser evidence for the five actions listed above. AccountsPanel role/create and NotificationBell delayed/success behavior have component tests; their changed paths have not been newly browser-verified. Claude’s earlier report/incident/assignment changes were not re-exercised during delayed saves here. Firefox remains unverified for this continuation.

S10 timed session-restore skeleton is still not browser-verified. S05 staff typography remains open; this pass does not resolve the small text counts. Populated queue, empty/error states and marker interaction remain broader audit work. No physical-device, Flutter, screen-reader or live production verification is claimed. Hotline/privacy owner inputs remain outstanding.
