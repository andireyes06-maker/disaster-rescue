# Admin and whole-page state audit — October 17–18, 2026

Airen requested a full product review, including Admin, because normal pages and test counts alone do not establish a finished experience. This continues the preceding full-page review of all 16 post-landing routes and missing-page recovery. The approved visual system and existing motion remain. Nothing committed, pushed or deployed; production and the separate Flutter/live-config process were untouched.

## Findings fixed

| Surface | Defect and resulting behavior |
|---|---|
| Admin accounts | Added name/email/ID search, role filter, count and clear-filter recovery. Unknown roles remain visible instead of silently looking assignable as a different role. Empty and failed loads are distinct, with named retries. |
| Admin account creation | Successful POST followed by failed GET previously presented the wrong outcome. Creation success now remains visible alongside a separate list-refresh failure and Refresh accounts action. An uncertain creation response instructs the admin to search before retrying. Duplicate email is a focused field error; drafts survive failure. |
| Admin roles | Own role is protected and explained, matching the backend. Pending Auth synchronization is visible and permits a same-role retry. A role save that removes a filtered row deliberately restores focus to search. Last-admin refusal preserves the staged role; an unconfirmed response asks for refresh rather than claiming nothing changed. |
| Admin teams | Failed team loading no longer appears as an empty editor. Skeleton, retry, genuine empty guidance and unavailable-team explanation are separate. Account creation can continue without a team. Pending rename/create inputs cannot accept edits that a late response would erase. |
| Admin settings | Invalid response shapes fail into recovery instead of undefined form values. Pending saves retain button focus, prevent repeat requests and lock the current draft. Saved feedback clears when edits make it stale. Loading and retry are explicit. |
| Admin health | Invalid/stale responses are guarded; a degraded database/API result visibly flags failure and offers retry. Keyboard retries recover focus after the replaced control disappears without stealing focus from someone who moved elsewhere. |
| Admin composition | Health and resident settings share balanced desktop columns and stack on phones. Long names wrap within allocated account columns instead of squeezing identifiers/roles. Safari workspace selectors now render at least 44px with the same chevron and spacing; forced-colors restores native appearance. |
| Audit / Admin audit section | Reversed dates produce an associated field error before any request. Bad response bodies show failure rather than an empty audit. Missing actor/action/report values say Not recorded. Admin has a real link to Analytics and exports. |
| Users / Teams | Invalid list bodies now fail visibly rather than implying no users/teams. Users identifies the signed-in account and omits its forbidden self-deactivation action. |
| Analytics / resident incident map | Invalid top-level response shapes no longer imply zero incidents. These branches display the existing error/retry state. |

No backend implementation was changed in this pass. Current backend code already uses `setStaffGuarded` and `authSyncPending`; the old handoff's non-atomic last-admin note is stale. Frontend retries now match that existing pending-access contract. Backend concurrency was not newly tested here.

## Evidence and verification

- **354 web tests across 51 files**, clean TypeScript check, successful production build; `web-tests.log`, `build.log`. Ten new Admin resilience tests plus targeted malformed-response/date-range cases. The earliest attempted red run failed in a test setup callback; it is not evidence of a reproduced product defect.
- **76 Chromium page/state/width cases**, `all-page-states.json`: dashboard, map, monitor, teams, users, analytics, audit, staff missing detail, resident hub/missing detail and responder assignments. Loading, empty and error states at 390/1440px; malformed responses on the API-list/statistics/map surfaces. Zero axe findings and document overflow in the recorded cases.
- **40 Chromium and 40 WebKit Admin cases**, `Chromium.json`, `WebKit.json`: load/retry focus, real empty versus failed, long names, own/unknown role, no-match reset, POST-success/refresh-failure, pending-access retry, last-admin refusal, duplicate email, settings retry/save failure/stale success, team save failure, degraded health/retry and malformed accounts/settings at 390/1440px. Delayed saves retained focus/draft and sent one request despite repeated Enter. All writes intercepted; no audit data persisted.
- **16 final layout cases** are in `Chromium-final-layout.json` and `WebKit-final-layout.json`: Admin long-content and system composition at 390/768/1024/1440px, including measured visible selector heights. These captures supersede the earlier Admin screenshots for the final column/selector CSS.
- Current screenshots manually opened: Chromium phone creation-success/refresh-failure and pending-access recovery, desktop degraded health; WebKit phone settings failure and desktop long-name state. The long-name visual review caught the compressed Safari selectors/columns despite clean axe/overflow checks; final WebKit 1440/768px long-content captures and Chromium 390px system capture were opened after the CSS correction. Other images are capture evidence, not a claim of individual visual inspection.

### Important test boundaries

The state matrix replaces report hooks **in the browser only** and intercepts API responses. It verifies rendering, accessibility, containment and control behavior; it does not establish real Firestore reconnection, authorization enforcement or persistence. Admin deep tests authenticate with actual demo accounts, but their account/team/settings/health responses are controlled fixtures. Every fixture is labeled as an audit example, and no invented hotline is saved.

WebKit emits Firestore emulator Listen-channel access-control errors while navigating. These are retained separately in each row's `emulatorTransportErrors`, not silently counted as clean console results. Other uncaught page exceptions fail the harness. Thus WebKit's controlled Admin interactions pass, but its real emulator data transport is **not signed off**. Initial mouse-retry focus expectations were also corrected to keyboard activation: Safari does not always focus a mouse-clicked button, and the product intentionally avoids taking focus from an existing element.

Reduced motion is enabled in these state screenshots to make evidence stable. Existing motion remains; this is not a fresh motion/performance signoff. Firefox interception was unavailable with the installed driver, so this state pass does not claim Firefox coverage; earlier normal-page Firefox evidence remains separate.

## Remaining work before release signoff

1. Real emulator write → read/reload checks for account, role, team, settings and operational actions, including failed Auth/profile synchronization. Controlled success fixtures do not close this.
2. Investigate WebKit Firestore emulator transport and verify genuine subscription recovery/stale-data behavior.
3. Image/map tile failures, enlarged text/forced colors and screen-reader announcements across full task paths. Extremely long Admin names were exercised; all other long/missing-content combinations are not claimed.
4. Physical-device/Flutter rendering and GPS/camera/push remain unverified here. No simulator/device was introduced.
5. Verified service hotline and final privacy text still require the owner's facts. No live release check, commit, push or deploy was performed.

Continue from these concrete gaps rather than repeating normal-page audits or old test counts. Preserve the preceding landing, access, resident, staff, dialog, notification and motion work.

## Reproduction

Use **http://localhost:5174** with the existing demo stack. Scripts assert a demo-* project and Auth emulator before sign-in. Never substitute `127.0.0.1:5174`, which is a separate live-config Flutter process.

`node admin-states.cjs Chromium`, `node admin-states.cjs WebKit`, `node all-page-states.cjs`, and `node final-layout.cjs Chromium` / `WebKit` use installed Playwright, cached browsers and the existing temporary axe tool path. They are environment-specific review scripts, not a new CI dependency. All mutations in admin-states are fulfilled in the browser. Keep evidence and limitations together when handing this to Claude.
