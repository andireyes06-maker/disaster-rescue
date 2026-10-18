# Page ledger (release audit, 18 October 2026)

Status key: **Passed**, **Failed** (product defect reproduced), **Partial** (inspected, part of the surface not tested), **Blocked** (needs a service or device this environment lacks), **Not tested**.

Target: branch `fix/release-audit-f01-f10` at `be3e71d`, emulator stack `demo-release-audit`. Widths: 390, 768, 1024, 1440 px (layout sweep). "axe" is automated WCAG 2.x A/AA on 390 and 1440 px.

| Surface | Route | Layout 390–1440 | axe | Functional | Status | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| Landing | `/` | Overflow 0; no errors | 0 violations | Redirects to role home when signed in | **Partial** | Screenshots not reviewed in detail. Public demo banner (Finding 1). |
| Login | `/login` | Overflow 0; no errors | 0 violations | Wrong password refused; Forgot password sends reset; reset code applied; role redirect | **Passed** | Forgot password delivery unverified (F02). |
| Registration | `/register` | Overflow 0 | 0 violations | Creates resident; lands on `/my`; email stored | **Passed** | Duplicate and interrupted setup not tested. |
| Forbidden | `/forbidden` | Overflow 0 | 0 violations | Resident on `/dashboard` redirected | **Passed** | - |
| 404 | any unknown path | Overflow 0 | - | Redirects to `/`, no 404 page on this branch | **Failed** | Finding 2. Working tree has a `NotFound` page (not on branch). |
| Resident hub | `/my` | Overflow 0 | 0 violations | Lists own reports; live notifications not checked | **Partial** | Finding 3 (emergency card without a number). |
| Report submission | `/my/report` | Overflow 0 | 0 violations | Empty submit shows errors; GPS location; submit succeeds; unsaved navigation guarded (F06) | **Partial** | Real photo upload blocked. Declined-navigation and accepted navigation verified. Browser Back not guarded. |
| Resident report detail | `/my/reports/:id` | Overflow 0 | 0 violations | Live status updates across users; offline notice and clear (F07) | **Passed** | Cancellation not tested. |
| Dispatcher dashboard | `/dashboard` | Overflow 0 | 0 violations | Lists open reports; 390 layout reviewed | **Passed** | Filters and search not exercised beyond the default list. |
| Incident details | `/incidents/:id` | Overflow 0 | 0 violations | Verify, assign team (persisted), reject with reason (persisted) | **Partial** | Priority, classification, duplicates not tested. |
| Operational map | `/map` | Overflow 0 | 0 violations | Loads | **Partial** | Priority markers small at 390 (Finding 5); marker interaction not tested. |
| DMO monitor | `/monitor` | Overflow 0 | 0 violations | Loads | **Partial** | Same marker note; read-only behavior not exercised. |
| Responder assignments | `/assignments` | Overflow 0 | 0 violations | Sees assigned team's report; acknowledge; progress; resolve (persisted) | **Passed** | Offline and priority-change behavior not tested in browser. |
| Teams | `/teams` | Overflow 0 | 0 violations | Renders; create and rename verified through the API (F09) | **Partial** | Teams UI create and rename not driven in the browser. |
| Users | `/users` | Overflow 0 | 0 violations | Team selector assigns and clears (F03, persisted); roles and deactivation through the API | **Partial** | Browser deactivation and reactivation not driven. |
| Analytics | `/analytics` | Overflow 0 | 0 violations | CSV downloads; row count matches stats (F04) | **Partial** | PDF totals not parsed; date and status filter UI not exercised. |
| Audit log | `/audit` | Overflow 0 | 0 violations | Renders; entries for account and report actions visible | **Partial** | Team audit entries verified through the API, not on screen. |
| Admin: accounts and roles | `/admin` | Overflow 0 | 0 violations | Role dropdowns and status shown; creation by API | **Partial** | Browser creation through Accounts panel not driven. Team control missing (Finding 8). |
| Admin: system health and settings | `/admin` | Overflow 0 | 0 violations | Empty hotline blocked by the form, with message; API refuses empty (F10) | **Passed** | Saving a valid value not tested. |
| Admin: teams panel | `/admin` | Overflow 0 | 0 violations | Renders; rename buttons present | **Partial** | Rename not driven. |
| Admin: audit and exports | `/admin` | Overflow 0 | 0 violations | Renders the audit list and filter fields | **Partial** | Filters not exercised. |
| Last-admin protection | API | - | - | Race correct on two fresh stacks | **Passed** | - |
| Authorization | API | - | - | Resident cannot list users; responder cannot export; dispatcher cannot change an admin | **Passed** | Full route matrix not repeated in this pass (covered by the October audit). |
| Cross-browser | Chromium, Firefox, WebKit | - | - | Sign-in, dashboard, map load in all three | **Partial** | Full flows only in Chromium. WebKit Listen errors (Finding 6). |
| Realtime and keyboard | resident detail; sign-in | - | - | Cross-user update without reload; logical focus order; visible focus | **Passed** | - |
| Real uploads | Cloudinary | - | - | - | **Blocked** | No non-production Cloudinary configuration. |
| Email and push delivery | Firebase | - | - | - | **Blocked** | No non-production delivery target. |
| Physical devices (GPS, camera, permissions) | - | - | - | - | **Blocked** | No device. |
