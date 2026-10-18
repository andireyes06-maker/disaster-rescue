# Error signs — October 18, 2026

Airen requested visible error signs in place of generic “something went wrong” presentation. Web changes only; no Flutter UI changes in this pass.

- Shared error Banner now has a consistent CircleAlert icon, red error border treatment and existing readable message/recovery action. Info/notice banners remain without an error sign.
- FieldError now includes a smaller matching sign, including registration/reporting field validation, shared Field, date-range errors and notification load/save errors. Existing IDs, aria-describedby, alert roles, focus behavior and message motion remain.
- Removed manually inserted text crosses/warnings and “Problem:” prefixes to avoid duplicate signs. Icon is decorative (aria-hidden, focusable=false); error text still explains the failure rather than relying on color or icons alone.
- Queue and system-health standalone failures now use the shared Banner. Page-level failure recovery also has an error sign.
- Replaced six generic fallback messages with context-specific unconfirmed assignment/report/account/team/acknowledgement/update messages. Existing permission/conflict/network special cases remain.

Verification: 361 web tests across 52 files, clean TypeScript and production build. Existing sign-in assertion updated to check readable error content and hidden icon instead of a literal “Problem:” prefix. An early run exposed that an extra span changed exact-text query targets; the FieldError was adjusted to keep text directly in its associated paragraph, and all tests now pass.

Eight Chromium/WebKit cases at 390/1440px verify empty-registration errors and a mocked Admin account-read failure. Icons present, zero axe findings and horizontal overflow. Chromium phone registration and WebKit desktop Admin captures were visually opened. No application writes; real local emulator authentication only, with project/emulator asserted. These checks do not establish screen-reader speech or every error branch.

No generic “Something went wrong” remains in web source. Native Flutter error copy was not included. No commit, push, deployment or production change.
