# Notification bell audit, October 17, 2026 (Claude)

Scope: the header bell and panel from `NOTIFICATION-BELL-HANDOFF.md`. Demo emulator only (`demo-disaster-rescue`, demo API 3102). Demo resident account. The mark-as-read mutation ran against the emulator.

## Preserved behavior (verified in browser)

- Header bell on the resident page, with an unread count: 17 at sign-in, 16 after one mark-as-read.
- Notifications are not on the dashboard body.
- Keyboard: Enter on the bell opens the panel and moves focus to its close button. Escape closes it and returns focus to the bell.
- Scrolling: the list scrolls inside a bounded area (516px visible of 2,742px, 17 items).
- Mark as read: the count changes only after the API succeeds. A reload shows 16, so the read persisted on the emulator.

## Finding and fix

| Finding | Evidence | Fix |
| --- | --- | --- |
| "Mark as read" button's accessible name did not contain its visible words. Name was "Mark Report received as read". WCAG 2.5.3 Label in Name. | Browser accessibility name read in the open panel | `aria-label` is now `Mark as read: <title>` (`NotificationBell.tsx`) |
| Unread items were marked only by color and a dot. Screen readers got no unread state. | 16 unread items; none contained "unread" text | Visually hidden "Unread:" prefix on unread items only |

Tests added or updated in `NotificationBell.test.tsx`: name starts with visible words, unread stated in text, renamed assertions. 8 bell tests pass.

## Checked, no finding

- Contrast in the open panel and on the badge (checker run before the fix): no failures.
- Phone width (390px in a same-origin frame): panel 366×600, inside the frame, list scrolls, no document overflow.
- Focus indicator on the close button: visible 3px ring.
- Reduced motion: the notification CSS has no animations or transitions. Radix popover default timing is not styled here.
- Accessibility sweep of `web/src` for `tabIndex > 0`, `outline: none`, `<img>` without `alt`, vague link text, and `div`/`span` with `onClick`: no matches.

## Not verified

- Icon-only button sweep beyond the bell and close controls: not exhaustive.
- Panel screen-reader announcements (live region on mark-as-read success): not tested with assistive technology.
- Physical device, Flutter: pending.
- Motion skill guidance: not loaded in this pass.

## Screenshot

`design-plans/codex-redesign/evidence/claude-bell-open-390-2026-10-17.png`. The top-left strip shows a duplicate "Sign out": that is the test frame overlaying the page, not product output.
