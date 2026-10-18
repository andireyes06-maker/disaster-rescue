**Successor state audit (Oct 17–18):** Read `../admin-state-audit-2026-10-17/HANDOFF.md` for the deeper Admin and broader loading/error/empty review, fixes and current 354-test evidence. The gaps below are historical where that successor supplies newer evidence. Real persisted mutations and transport remain open.

# Full-page audit and finishing pass — October 17, 2026

Airen asked for complete pages after the landing, not a list of small compliance repairs. This pass reviewed the full compositions, hierarchy, real content, primary tasks, responsive layouts and important states of all **16 existing routes after the landing**, plus a new missing-page route. The approved Geist / violet / indigo system remains. Nothing committed, pushed or deployed.

## What changed by page

| Page | Full-page result |
|---|---|
| `/login` | Form and indigo guidance align from the top, without the previous floating/vertically centered composition. Password reveal/conceal, focusable busy action, staff-specific support guidance and required semantics. Existing error and state motion retained. |
| `/register` | Same composed access family, form first on phones, properly sized guidance panel. Reveal/conceal for both passwords, confirmation has an explicit required error, and pending submission is guarded without dropping button focus. Incident-area copy no longer implies a location filter. |
| `/forbidden` | Recovery card sits nearer the top within the access family. Existing signed-out/recognized-role/unrecognized-role recovery preserved. |
| `/my` | Replaced marketing headline with the resident’s real in-progress report count and task guidance. Report rows include addresses to distinguish incidents; empty state points to first report. Renamed the public map Incident areas because it does not filter by the viewer’s GPS. |
| `/my/report` | Retained the existing category/description, location, evidence and contact composition after full desktop/phone inspection. Exercised empty validation and manual decimal coordinates in the browser, with no submission. Existing safety and field motion retained. |
| `/my/reports/:id` | Current status now has a resident-facing explanation; submitted/address facts and narrative are grouped. Attached evidence was missing entirely and is now visible with explicit new-tab links. Staff rejection reason is shown when present. Missing/read-failure/loading states stay distinct. |
| `/dashboard` | Reviewed the complete populated inbox and preview, search, quick views and filters; retained the task-specific layout. Search reset/focus recovery from the preceding pass preserved. |
| `/incidents/:id` | Explicit No contact provided fallback, shaped loading skeleton, correct Back to monitor wording for DMO. Reviewed the whole populated detail and its action overlays. Team selector error now exposes aria-invalid and its associated message. |
| `/map` | Reviewed the full filter/legend/map composition. Preceding 44px hit areas, Enter/Space navigation, on-focus labels and empty/reset states preserved. Attribution underline made specific enough to survive late Leaflet CSS loading. |
| `/monitor` | Reviewed with the actual DMO demo account as well as the admin view. Read-only detail route has no Verify control and has a correctly named return link. |
| `/teams` | Search, availability filtering, result count, no-match/reset state. Create/rename validation is local to the field, named and focused; existing busy guards preserved. |
| `/users` | Search by name/email/ID and role filtering, no-match/reset state and useful empty state. Missing emails use the actual account ID to distinguish duplicate names. Create fields expose validation messages/invalid states; loading uses a skeleton. |
| `/analytics` | Reviewed complete populated charts, tables, filters and exports at desktop and phone; retained the composition. Preceding readable ticks and keyboard table regions preserved. |
| `/audit` | Reviewed full filter and change-table layout. Clear audit filters now works and returns focus to the first filter, matching the recovery copy. |
| `/assignments` | Reviewed an actual responder with a populated assignment, its location/action block and expanded operation form, rather than relying on an admin’s no-team screen. Field errors are associated and announced locally; loading has a shared skeleton. |
| `/admin` | Four native grouped work areas replace one continuous stack. Account list has a bounded, named keyboard-scrollable region and identifier fallback; account creation is disclosed when needed. Staff/team/settings forms expose validation, guards and busy states. Settings load and health failures have retry actions. Phone default page is about 1,323px versus the earlier 7,019px capture. |
| Unknown address | A real Page not found screen replaces silent redirection to the landing, with home/sign-in recovery and page title. |
| Shared loading and overlays | Branded, visibly labeled PageLoading serves lazy routes and session restoration. Portaled dialogs have consistent spacing, viewport-constrained scrolling and 44px team selectors, including WebKit; grouped disclosures and fields retain the existing motion system. |

The landing’s own review is documented in the preceding landing/header/content handoffs. It was deliberately not rebuilt again here.

## Verification

- **340 web tests / 50 files**, clean typecheck and successful production build. Six new tests in this pass cover password reveal without submit, list filtering/recovery, field validation, resident evidence and health-check recovery. Existing assignment validation tests now assert field associations. Logs saved here.
- **39 Chromium page/width combinations:** ten staff routes through admin access plus three resident routes at 390/768/1440px. `final.json`: no axe findings, horizontal overflow or uncaught page errors in that capture pass.
- **Nine final targeted combinations:** final admin and two resident detail variants at 390/768/1440px, including submitted evidence; zero axe findings or overflow. `targeted.json` supersedes earlier admin/detail captures where the final account loading/identifier and evidence changes matter.
- **26 full-flow captures:** actual resident, responder, DMO and admin accounts at 390/1440px. Grouped admin work areas, account invalid submit, users/teams reset, responder operation validation, DMO read-only navigation and resident manual location. Final `walkthrough.json`: zero axe findings/overflow and **zero attempted writes**. All write requests were intercepted defensively; none were needed.
- **36 Chromium/Firefox/WebKit access/admin cases:** normal access pages, missing address, registration empty submit, password visibility and admin grouped sections/validation at 390/1440. Zero axe findings, overflow or uncaught page errors. `cross-browser.json`.
- **Six three-engine dialog cases:** rejection and assignment open/close/reopen at 390px. Focus returns on exit and moves back inside on interruption; axe clean. The final WebKit visual check exposed a native select sizing issue that the automated scans did not identify. Scoped dialog control and spacing rules fix it. Final measurements are in `dialog-state-motion-checks.json`.
- **Real delayed session restoration:** held only the emulator token response. Branded account-check state has one main and three skeleton rows, then reaches Dashboard after release. Visible text is duplicated in raw textContent because the shared Skeleton deliberately hides the visual children from assistive technology and provides one separate accessible status label. `states.json`, `session-restore-390.png`.
- **State harness:** queue/map loading → error → retry → empty rendering verified using a browser-local replacement of the reports hook, then actual demo search recovery restored 24 rows. This does not establish real Firestore transport reconnection.

Screenshots were visually opened for access default/error layouts, Forbidden/missing route, desktop queue/teams/users/audit/monitor/resident layouts, phone report/record/admin/management layouts, actual responder assignment and invalid operation form, expanded admin settings, evidence and branded loading, and the WebKit assignment dialog. The remaining screenshots are automated capture evidence, not a claim that every pixel of every image was manually read. Incumbent full-page captures came from ../staff-readability-2026-10-17 and fresh captures here.

## Remaining verification and owner inputs

This is a completed first full-page review and a substantial finishing pass; it is not a production release signoff.

- Actual mutation success and service-failure paths were not exercised live in this pass: no new account, report, assignment, settings or status write was allowed. Relevant unit coverage passes, and earlier emulator success checks remain separate evidence.
- Every page’s normal composition was reviewed, but the entire cross-product of roles × statuses × empty/error/offline × widths × browsers is not claimed. DMO and responder were newly exercised; dispatcher chrome relies on the earlier role-specific audit plus the same shared staff components.
- Every dialog/field/error branch, stale-data reconnection, image/tile failures and extremely long content are not exhaustively verified. The health retry has a component test; its final failure/retry branch was not newly forced in the browser.
- This pass preserved motion and checked incident dialog interruption. It did not repeat the full motion performance trace, physical-device tests, text-only enlargement, forced-colors matrix or screen-reader speech.
- Physical devices, Flutter, real GPS/camera/push, production authentication, live release environment validation and a new Lighthouse run remain outside this web pass.
- Hotline and final privacy text still need the owner’s factual inputs. No number, policy, endorsement or response guarantee was invented.

## Reproduction and provenance

Local React demo: **http://localhost:5174**. Before sign-in, scripts assert a demo-* Firebase project and enabled Auth emulator. Never substitute 127.0.0.1:5174; that separate Flutter/live-config process was untouched. Production was untouched. No dependencies added, no services stopped, no credentials printed.

Scripts here use the already installed local Playwright/cached browsers and axe path. Each script creates its own contexts; keep the demo stack running. `surface-check.cjs final`, `walkthrough.cjs`, `cross-browser.cjs`, `final-targets.cjs targeted`, `states.cjs`, `dialogs.cjs`, and `access-captures.cjs after` produce the respective records. Some screenshots/logs predate only the final narrowly scoped health-retry/shared-loading/dialog changes; their specific final evidence is identified above. Keep earlier evidence instead of overwriting other audit folders.

Design method: direct full-page rendered/code review using PRODUCT.md, DESIGN.md, Impeccable craft/polish guidance and the design-critique skill’s page-level criteria. The Impeccable launcher was unavailable earlier in this session; no deterministic detector or independent dual-assessment score is claimed. No design suppression or sidecar was changed.
