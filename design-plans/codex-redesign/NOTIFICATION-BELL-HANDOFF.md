# Resident notification bell

Implemented October 17, 2026 at Airen's request. This update supersedes the dashboard notification list described in earlier captures.

## Implemented

- Notifications live in the resident header on every resident page, behind a 44px bell button with an actual unread count (visually capped at 99+).
- Removed the notification card and its subscription from the resident dashboard. The reports and nearby-incidents layout stays intact.
- Nonmodal Radix popover displays the full notification collection in a bounded scroll area. Escape, outside click, and the close control dismiss it. Escape restores trigger focus.
- Each notification provides its title, body, timestamp, and a report link where available. Links close the panel.
- Explicit “Mark as read” uses the existing authenticated PATCH `/notifications/:id/read` API. The unread count changes only after success. Failures leave the notification unread and allow retry. Opening the panel alone does not mark anything read.
- Loading, empty, subscription-error, and mutation-error states are implemented. Header component state is keyed to the signed-in UID.
- New source: `web/src/features/resident/NotificationBell.tsx`, `notifications.css`, and `NotificationBell.test.tsx`. Header/dashboard source and tests updated. No native or backend changes.

## Verification

Web suite: 284 tests across 43 files passed, including TypeScript. Production build passed. Unit coverage includes disclosure, Escape/focus return, report navigation, successful/failed read updates, loading, empty, and subscription-error states.

Rendered and inspected local demo at 1440 and 390px; no horizontal overflow, and Escape restores focus. Screenshots: `evidence/bell-dashboard-1440.png`, `bell-dashboard-390.png`, `bell-open-1440.png`, `bell-open-390.png`; geometry recorded in `evidence/bell-checks.json`.

Browser actions were sign-in, opening/closing the bell, and rendering. No notification read mutation was sent from the browser; that path was verified with a mocked API in unit tests. Physical device checks were not repeated for this web-only change.

The timeline detector suppression in `web/.impeccable/config.json` was left untouched. No commit, push, deployment, or production changes.

## Prompt for Claude

Read `design-plans/codex-redesign/HANDOFF.md` and `design-plans/codex-redesign/NOTIFICATION-BELL-HANDOFF.md`, then inspect the current code and renders. Codex implemented Airen's requested notification bell: keep notifications behind the resident header bell and keep the long notification card off the dashboard. Preserve unread counts, bounded scrolling, report links, keyboard dismissal/focus return, explicit mark-as-read, and all loading/error/empty states. Use the relevant installed design, accessibility, and motion skills. Preserve other uncommitted functional and design repairs. Continue the remaining audit using local demo emulators; verify real read persistence there if needed. Do not touch production, commit, push, or deploy without Airen's instruction. Report actual evidence and remaining gaps without restarting the redesign.
