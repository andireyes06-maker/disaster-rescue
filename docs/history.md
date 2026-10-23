# Project history (archived from HANDOFF.md, Oct 15, 2026)

# HANDOFF

## Start here

**Project:** IT 305 final project, Disaster Rescue Reporting and Monitoring System (web + Flutter). Due Nov 2, 2026. Build window Oct 12 to 30.
**Path:** Big task. Brainstorm, X-SPEC.md, review against code, X-PLAN.md, then build. No code before spec approval.

**Status (Oct 15, 2026):**
- Spec and plan APPROVED. Executing X-PLAN.md with subagent-driven development on branch `build/disaster-rescue`.
- Phase 1 (Foundation) DONE: tasks 1 to 6 (scaffold + tokens, auth/role middleware, status workflow, privacy/duplicates/validation, repo port + fakes + audit, Firebase rules/indexes/seed). API suite 72 tests, rules suite 117 tests, all passing.
- Task ledger lives in `.superpowers/sdd/X-PLAN/progress.md` (git-ignored). Trust it plus `git log` after any reset.

**AIREN MANUAL STEPS (not done yet):** create the Firebase project (Spark), enable Email/Password auth, create Firestore, download service account to `api/serviceAccount.json`, create a Cloudinary account and fill `api/.env`. Exact steps in `docs/firebase-setup.md`. Seed real project only with `--real` and `SEED_PASSWORD`.

**Decisions locked:**
- Full scope: all 15 FRs, 4 roles, 3 interfaces, built in vertical slices.
- Backend: Express API in front of Firebase (Auth, Firestore, FCM, Admin SDK). Reads live from Firestore, writes through API.
- Web: React + Vite. Mobile: Flutter (FLUTTER_STYLE_HANDOFF.md does NOT apply here).
- Maps: Leaflet/OSM (web), flutter_map/OSM (mobile). Responder UI on both web and Flutter.
- UI: "Calm Clarity" (off-white #F6F1EA, teal #0F6B66, coral #C83919 for critical only). Own direction, not the brief's navy and red.

**Next step:** Phase 2, Task 7 (POST /reports), then 8 to 12. Photos: Cloudinary with private/signed delivery.

**Open questions:**
- Hosting for API and web app.
- Group size, leader, and roles (only needed for the contribution report).

**Gotchas:**
- Brief suggests PostgreSQL/MySQL, we use Firestore on purpose. Document it in the schema doc.
- No em dashes in user-facing text. Address the user as Airen.
- Cut order if late: PDF export, duplicate detection, DMO charts.
- Cannot verify here: Flutter on a real phone, real push notifications, GPS accuracy.

**Resume prompt:** "Read HANDOFF.md and X-SPEC.md in /Users/rien/Documents/FINAL_PROJECT. The spec is [approved / needs these changes: ...]. Continue to X-PLAN.md."

**PAUSED (Oct 15, 2026). Resume here:**
- Done and committed: Tasks 1 to 11 (last commit `f9af371`). Ledger: `.superpowers/sdd/X-PLAN/progress.md`.
- Task 12 (resident Flutter flow): test failures FIXED (Oct 15). `flutter analyze` clean, `flutter test` 89 passing. Photo chips had duplicate keys (fixed with `ValueKey('photo-chip-$i')`). Role gate test was rewritten, not just patched: resident case now emits `[]` on the reports stream, and the old "Nothing to show yet" check was dropped for residents. Re-check that is intended.
- Task 12 spec check done against `task-12-brief.md` (all files and behaviors present; SocketException maps to ApiException(0, 'network') in api_client.dart). Committed on `build/disaster-rescue`.
- Task 13 (teams, assignment, rescue updates, close, users) DONE. API suite 167 passing. Includes `requireIdentity` for `POST /users/self`, 409 on disabled or non-resident accounts, deactivation keeps claims with `active:false`, and 409 `team_busy` when a team is already on another rescue.
- Task 13 deviations (accepted): team GET open to any signed-in account; a 101-char name gets 400, not truncation; closing frees the team only for its current report.
- Task 14 (notifications, in-app plus FCM) DONE. Stored before send, sender errors caught, removes only dead FCM tokens. API suite 181 passing.
- Security fixes after review (Oct 15): dispatchers cannot modify admins or their own account (403); `GET /api/teams` now dispatcher, dmo, admin only (team status reveals active rescues).
- Device takeover fix (Oct 15): `POST /api/devices` returns 409 `device_claimed` when the token belongs to another account; new owner-only `DELETE /api/devices/:token` (404 for others). API suite 183 passing.
- TODO for clients: call `DELETE /api/devices/:token` on sign-out, or a shared phone's next user gets 409. Not wired yet in Flutter or web.
- Task 15 (web teams, users, responder view) DONE. Web tests 94 passing, build OK. Not checked in a browser or emulator: real listener and API calls end to end.
- Task 16 (Flutter responder mode and notifications) DONE. Flutter 98 tests passing, analyze clean. Photos for operation records out of scope. Not checked on a device: push delivery, maps launch.
- Known gap: if the sign-out DELETE /devices fails offline, the token stays bound and the next user gets 409 on that device.
- Lesson: never run `dart format` on whole folders. It rewrote 27 untouched files; reverted (format-only).
- HTTP hardening (Oct 15): helmet, CORS allowlist from `CORS_ORIGINS`, express-rate-limit (300 req per 15 min per IP). These were installed but unused until now. API suite 187 passing. Behind a proxy in hosting (T21), set `trust proxy` or the limit will see one IP.
- Web migration option B (Airen chose it Oct 15). Spec amendment in X-SPEC.md. Phase 1 DONE: TypeScript (incremental, allowJs, typecheck script), Tailwind v4 with calm- tokens, shadcn/ui primitives added. Typecheck clean, 94 tests pass, build OK. Visual check NOT done: Tailwind preflight may shift base styles; verify with Playwright (Phase 4).
- Phase 2 DONE: React Hook Form + Zod for OperationForm, AssignTeamDialog, Teams and Users forms; shadcn Dialog replaces Dialog.jsx. Web tests 115 passing, typecheck and build OK. Error alert now clears when the field is corrected (timing change, noted).
- Supply chain (Oct 15): the shadcn installer added the `cn` npm package (repo shadcn-ui/cn, maintainer shadcn, so not a look-alike). Replaced with a local `cn` in web/src/lib/utils.ts built on pinned clsx 2.1.1 and tailwind-merge 3.7.0.
- Install-script warnings (not approved, pre-existing): @firebase/util, protobufjs, fsevents, from Firebase's own dependency tree.
- Phase 3 DONE: all 46 web source and test files are .ts/.tsx, allowJs false, no any or suppressions. Typecheck clean, 115 tests pass, build OK.
- Known type casts to tighten later: useReports.ts (`as Report`, `as Date` on Firestore data), AuthProvider.tsx (`claims.role as Role`, safe because unknown roles reach /forbidden), and `as Team[]`/`as User[]` in TeamsPage, UsersPage, AssignTeamDialog. Guidelines prefer runtime validation at these boundaries.
- Phase 4 DONE: Playwright added (`npm run e2e`, Chromium). 3 smoke tests pass (labels, no horizontal scroll at 375px, no console errors). Visual check against pre-Tailwind f30db64 found two preflight regressions on the login page, both fixed in styles.css: h1 lost bold (now 700), and paragraph margins were removed (restored to 1em). Login now matches baseline at 1280px. Signed-in pages were NOT visually compared (sign-in is not allowed in tests). Re-check after real sign-in in a browser before the demo.
- Visual baseline images are in web/e2e/__screenshots__/baseline (pre-Tailwind) and current.
- Task 17 DONE. Web (e697314): Leaflet map with filters, DMO monitor read-only (no buttons), 120 tests. Flutter (cfcdd6a): flutter_map with location rule (exact for reporter and assigned team, coarse for others), 107 tests. Gaps: no e2e visit to the map and no tile-host blocking yet; responder has no web map (their list shows exact location); reports without exact location are not shown on the web map; no browser or device check of the maps.
- Task 18 DONE (a549633): stats, CSV and PDF exports (no contact details; formula-injection guard), audit endpoint (dispatcher and admin). API 213 tests.
- Task 19 DONE (689f746, 47f1e42): analytics with server-side type and status filters, so every number agrees. Text table alternative for each chart. Audit viewer shows before and after as plain text. Dashboard summary cards. Web 129 tests. Open: "Total" shows twice on the dashboard (summary cards and the existing queue cards); Recharts resize warnings not inspected; `admin` is not a web role yet, so the audit page is dispatcher-only in the web app; no browser check.
- Task 20 in progress (hardening and privacy and backup docs).
- Task 21 (deploy and documents) BLOCKED on Airen's approval: deploying needs hosting accounts (Render or Railway for the API, Firebase Hosting or Vercel for web) and public URLs. Docs can be written without deploying.
- Next after 20: Task 21 docs; ask Airen before deploying.
- (Superseded) OPEN DECISION (Airen): Software Build Guidelines (`~/Downloads/Software Build Guidelines/project-standards`) name Next.js + TypeScript + Tailwind + shadcn/ui, React Hook Form + Zod, Vitest + Playwright for applications. We use React + Vite in plain JS and CSS, and Express in plain JS. Guidelines say existing projects need a scoped migration decision, not an automatic rewrite. Not changed yet. Options are in the chat.
- Next: Task 17 per X-PLAN.md (paused on the stack decision above for web).
- Not verified: real device, APK build (NDK still corrupt).
- Open for Task 13: deactivation must set claims `{role, active:false}`, never `{}`; `POST /api/users/self` must be idempotent, accept an empty body, and refuse (409) if the account is disabled or has a non-resident role.
- Airen's manual steps still open: Firebase project, service account file, Cloudinary keys (see `docs/firebase-setup.md`). Android NDK at `~/Library/Android/sdk/ndk` is corrupt; delete that folder so Gradle re-downloads it before any APK build.
- Resume prompt: "Read HANDOFF.md and .superpowers/sdd/X-PLAN/progress.md in /Users/rien/Documents/FINAL_PROJECT. Continue the X-PLAN subagent-driven build at Task 12 (uncommitted mobile work present)."

## Archived HANDOFF "Start here", October 16, 2026 (before the website deploy)

# HANDOFF

## Latest: Codex UI/UX fixes, October 16, 2026

Airen explicitly requested implementation after the full website audit. A local implementation pass is now complete; begin with [CLAUDE-HANDOFF.md](CLAUDE-HANDOFF.md) and `design-plans/fixes-2026-10-16/review.html`. That handoff records the updated shell/dashboard/incident/management/public layouts, map and overflow fixes, tests, and remaining work. Changes are uncommitted and not deployed. The earlier approval-waiting notes below describe the previous stage, not a reason to discard the latest authorized fixes.

## Start here

**Project:** IT 305 final project, Disaster Rescue Reporting and Monitoring System (Flutter + React + Express + Firebase). Due Nov 2, 2026.
**Branch:** `build/disaster-rescue`. Nothing merged to `master`. Repo: https://github.com/andireyes06-maker/disaster-rescue (private). Vercel project `disaster-rescue-web` is linked, not deployed.
**Redesign in progress (Oct 16, 2026):** whole web product, ground-up. Spec `REDESIGN-SPEC.md`, plan `REDESIGN-PLAN.md`. Palette changed to bold public-safety (navy `#0B2A4A`, blue `#1E5BC6`, red `#C8102E` for hotline and critical only, amber `#B45309`), tokens in `web/src/theme/tokens.css` and `docs/design-tokens/tokens.json`.
- Done: shared components in `web/src/components/calm/` (Card, Badge, Field, DataTable, EmptyState, Banner, PageHeader); shell with mobile menu; public pages (landing remade: full-bleed navy hero, raised door cards); dispatcher queue as DataTable; incident dialogs with aria-modal and focus return; empty states on map, audit, teams, responder; messages, badges and summary cards on shared components. Last commit `22bae48`. 170 web tests pass.
- Not done: the staff screens are not remade. Dashboard, incident details, analytics, monitor, users, teams, assignments and operation form still have their old layouts. Only the palette, messages, badges and cards changed.
- Staff layout option B approved Oct 16 (command toolbar with counts and filters; incident details as two columns with a sticky action rail; cards for assignments). Recorded in `REDESIGN-SPEC.md` "Decisions recorded".
- Staff check route: local Firebase emulator (approved Oct 16). No passwords, no changes to `flutter-5094e`. Not yet verified that the emulator runs with seed data.
- Stage: the spec is written and awaits Airen's review. Architectural path: the spec must be approved, then the plan revised (phase 8 step 4 still names the real-project sign-in), then the plan approved, before any code.
- Resume prompt: "Read HANDOFF.md and REDESIGN-SPEC.md in /Users/rien/Documents/FINAL_PROJECT. The spec is awaiting review. If approved, revise REDESIGN-PLAN.md for Option B and the emulator route, then wait for plan approval before building the staff screens."

**Status (Oct 15, 2026):** all 21 plan tasks are built and committed. Remaining work is deployment and the course deliverables.

**Verified on the last run:**
- API 224 tests, web 129 tests, web e2e 3 passing (4 skipped by design), web typecheck and build OK.
- Firestore rules 117 of 117 on the emulator.
- Flutter `flutter analyze` clean, 107 tests passing.

**Not verified:** real device (GPS, camera, push, map tiles), real Firebase or Cloudinary, deployed hosts, signed-in web pages.

## Decisions locked
- Firestore, not PostgreSQL (documented in `docs/schema.md`).
- Express API in JavaScript. Web: React + Vite + TypeScript + Tailwind + shadcn/ui (spec amendment in `X-SPEC.md`).
- Photos through Cloudinary, signed. No Firebase Storage (needs Blaze).
- Hosts: Vercel (web), Render (API), Firebase Spark.
- Calm Clarity UI. Coral is for critical priority only.

## Live (Oct 15)
- API: https://disaster-rescue-api.onrender.com (Render free plan, Blueprint from render.yaml). Health: /api/health.
- Web: https://disaster-rescue-web.vercel.app (Vercel production, linked project disaster-rescue-web). Sign-in page loads with no console errors.
- Production audit: 0 vulnerabilities after firebase-admin 14 (named imports in api/src/server.js).

## Waiting on Airen
Done: Render CORS and redeploy, GitHub repo, Firebase project `flutter-5094e` (service account `api/serviceAccount.json`, git-ignored), Cloudinary keys in `api/.env`, NDK fix. Firestore rules and indexes deployed to `flutter-5094e` (Oct 15). Functional audit (Oct 15): API 224 and web 134 tests pass, the full report lifecycle works across all four roles, and the access and validation checks behave. Fixed: rescue updates now show on the incident page (`useReportUpdates`), and the responder form offers only statuses valid for the report. Test reports on the real project: 4 created, 3 closed, 1 open at Awaiting Assignment (`WsRUEbXwEgIA13kOoqTm`, DR-T49M76). Delete or close them before the demo. Test accounts seeded on `flutter-5094e` (resident, dispatcher, responder, dmo @test.dev); sign-in checked for all four. Passwords are not stored in the repo. `flutter build apk --debug` succeeds (Oct 15). `flutter analyze` clean, 107 tests pass.

5. **Course docs:** fill `docs/contributions.md` (names and roles); replace the `000-0000` LDRRMO placeholder in `config/hotlines` with the real number; get legal review of `docs/privacy-and-coordination.md` before real use.
6. **Push and PR:** nothing pushed, no PR. Needs your approval.

## Open questions
- Admin role: code has `admin`, spec says dispatcher-equivalent. Web app has no admin role.
- Firestore rules let responders read teams; the API does not.
- Recharts resize warnings not inspected.
- Dashboard queue card renamed "All reports" to avoid clashing with the stats "Total reports".

## Gotchas
- Never run `dart format` on folders (it rewrote 27 files once).
- Firestore queries use at most one equality filter; the rest filter in memory.
- Sign-out calls `DELETE /api/devices/:token` (wired via `beforeSignOut` in `mobile/lib/main.dart`). Keep it.
- The web app's "map" and "monitor" routes are not browser-checked.

## Resume prompt
"Read HANDOFF.md in /Users/rien/Documents/FINAL_PROJECT. Continue from 'Waiting on Airen'. Older history is in docs/history.md."

---

## Archived handoff (saved 2026-10-23, before the professor clarification work)

**Newest web redesign completion (October 18):** Read `design-plans/web-redesign-finish-2026-10-18/HANDOFF.md` and its `CLAUDE-PROMPT.md`. The remaining web presentation/state pass is finished, including expanded Admin interiors, form/pending/recovery feedback and response-row motion. 380 tests / 52 files, typecheck/build pass. Controlled state evidence and Firefox normal-route checks are recorded. Integration, real transport, uploads and physical/Flutter verification remain separate release gates. Nothing committed/pushed/deployed.

**Latest completed visual fixes (October 18):** Read `design-plans/visual-motion-fixes-2026-10-18/HANDOFF.md`; paste its `CLAUDE-PROMPT.md` into the next session. M1 validation overlap, V1 landing/bell typography and M2 exit easing are implemented. 377 tests / 52 files, typecheck/build pass; normal-motion Chromium/WebKit validation/interactions verified. The earlier read-only visual report is superseded for those findings. Expanded Admin interiors, remaining state coverage and real release gates remain open. Nothing committed/pushed/deployed.

**Latest web audit continuation (October 18):** Read `design-plans/audit-round2-2026-10-18/HANDOFF.md`. 376 tests / 52 files; typecheck/build/diff checks pass. 82 normal route cases, 28 Chromium/WebKit audit/activity cases, 24 tile failure/recovery cases and three saving-indicator checks. Fixed audit readability/mobile overflow, report-specific update loading/stale callback behavior, resident activity/long notes, map tile retry and visible busy indicators. Real uploads, management persistence/concurrency, complete historical transitions, reconnect and physical devices remain open. Nothing committed/pushed/deployed.

**Fresh web re-audit and required markers (October 18):** Read `design-plans/reaudit-2026-10-18/HANDOFF.md`. All 18 web surfaces revisited in 82 normal cases; landing label defect found and corrected in four rechecks. Required stars/semantics added across web entry forms; optional fields left optional. Fixed incident busy labels/reference/status guidance, same-metadata photo retry collision and responder acknowledgement loading/error race. 371 tests / 52 files; typecheck/build pass. 28 Chromium/WebKit targeted cases, ten final form cases and acknowledgement fixtures recorded. Long staff history fixture tested; actual uploads, transport, management persistence, audit readability and resident complete-status history remain open. Nothing committed/pushed/deployed.

**Error presentation (October 18):** `design-plans/error-signs-2026-10-18/HANDOFF.md` records shared web error/field icons, removal of duplicate text signs/Problem prefixes and context-specific fallback copy. 361 tests, typecheck/build pass; eight Chromium/WebKit phone/desktop error cases have clean axe/overflow. Existing error motion, focus and field associations preserved. Web only, nothing committed/pushed/deployed.

**Resident follow-up (October 18):** Claude records real incident/responder/resident persistence plus mocked failure checks in `design-plans/full-page-audit-2026-10-18/HANDOFF-2026-10-18.md`. Codex reviewed source and fixed misleading non-delivery copy and PhotoImage recovery on URL change; read `CODEX-RESIDENT-REVIEW.md` in that folder. 361 tests / 52 files, typecheck/build pass. Cloudinary, long history, in-app leave behavior and web idempotent retry remain open. Retention-policy explanation is a code comment, not public copy. No new Codex browser/emulator writes in this review.

**Claude continuation entry (October 18):** Start with `CLAUDE-NEXT.md` for the consolidated current brief, all 18 web routes and remaining work, latest copy requirements, evidence boundaries, changed local logins and environment precautions. This is a documentation-only consolidation; no new runtime checks are claimed.

**Product copy direction (Oct 18, Codex, uncommitted):** Airen removed academic credits, demo badges and unfinished team-lead/availability/privacy copy. Read `design-plans/product-copy-2026-10-18/HANDOFF.md` first. Public UI and the re-rendered landing film use product language and fictional Harbor district/team/person content. Flutter banner removed and school-gate hint replaced. Known local fixture accounts now use reserved `@harbor.example` addresses (table in that handoff), with passwords/IDs/roles unchanged; older browser scripts must use the new emails. 354 web / 128 Flutter tests pass, 26 fixture tests pass, analysis/typecheck/build/video checks pass. Browser evidence at 390/1440. Internal emulator protections and historical audit provenance remain. Nothing committed/pushed/deployed; production untouched.

**Admin and page-state continuation (Oct 17–18, Codex, uncommitted):** Read `design-plans/admin-state-audit-2026-10-17/HANDOFF.md` first. Fixed Admin load/empty/retry, searchable accounts, own-role protection, pending-access retry, misleading creation/refresh outcomes, settings draft/success behavior, degraded health, long-name columns and Safari selectors. Also fixed invalid-list/statistics/map outcomes, Users self-action and Audit dates/missing data. 354 tests / 51 files; typecheck/build pass. State evidence: 76 broader Chromium cases, 40 Admin cases per Chromium/WebKit, plus final four-width Admin layout checks. API writes were mocked: persistence and real transport remain open. WebKit emulator Listen errors are recorded separately; do not claim clean real transport. Current backend already has a guarded transaction and authSyncPending; old non-atomic last-admin note below is stale. No backend tests newly run. Nothing committed/pushed/deployed.

**Full-page finishing audit (Oct 17, Codex, uncommitted):** Airen clarified that audit means complete pages, not isolated technical fixes. Read `design-plans/full-page-audit-2026-10-17/HANDOFF.md` and its `PAGE-REVIEW.md`; `CLAUDE-NEXT.md` is ready for a new session. Reviewed all 16 existing routes after the landing plus a new missing-page route. Reworked access compositions/password controls, resident hub/details/evidence, Admin work areas, management search/filter/validation, loading/recovery and dialogs. 340 tests / 50 files; typecheck/build pass. Evidence: 39 responsive surfaces, nine final admin/detail targets, 26 role walkthrough states, 36 three-engine access/admin cases, and six three-engine dialogs. No writes attempted in the role walkthrough; no production change. Mutation success/transport, long/missing content, physical/Flutter and owner hotline/privacy inputs still have explicit gaps. Nothing committed/pushed/deployed.

**Staff readability/state audit (Oct 17, Codex, uncommitted):** read `design-plans/staff-readability-2026-10-17/HANDOFF.md`. Fixed small product typography, phone account/search layout, 44px map marker hit areas and missing keyboard activation, map skeleton and empty/filter/search recovery. 334 tests / 49 files; typecheck/build pass. 39 Chromium surfaces and 12 Firefox/WebKit cases have zero axe/overflow; targeted four-case search recovery passes. Real delayed session restoration verifies S10. S05 measured samples now zero under 13px; S07 interaction fixed. Staff field-validation/transport and physical/Flutter checks remain. Nothing committed, pushed or deployed.

**Busy-control continuation (Oct 17, Codex, uncommitted):** remaining AccountsPanel, UsersPage, TeamsPage, ExportButtons and NotificationBell controls preserve busy focus and block duplicate requests. Action removal now places focus deliberately. 328 tests / 49 files, typecheck and build pass. Delayed failures verified on local demo in Chromium desktop and WebKit phone for five staff/export actions; no writes persisted. Read `design-plans/busy-focus-2026-10-17/HANDOFF.md` for evidence and limits. S05, timed S10 and broader staff-state audit remain open. Nothing pushed or deployed.

# HANDOFF

## Start here

- Full-page audit, continuation (Oct 18, uncommitted): incident, dashboard, responder, resident submit/cancel, admin settings checked on the emulator. Per-page ledger and next steps: `design-plans/full-page-audit-2026-10-18/HANDOFF-2026-10-18.md`. Open owner question: the admin settings save requires a hotline, which is not configured.

**Landing content continuation (Oct 17, Codex, uncommitted):** read `design-plans/landing-content-2026-10-17/HANDOFF.md`. Stronger header followed by clearer service copy, four native reporting questions and a closing resident action. 319 tests / 48 files pass; six-width expanded-content audit and 15 cross-browser edge scenarios are clean, with keyboard disclosure/registration navigation checked in all three engines. Prior Lighthouse scores were not rerun for this version. Claude’s open staff/state findings remain open.

**Header presence after Claude’s access audit (Oct 17, Codex, uncommitted):** landing masthead now uses deep indigo, larger branding, a service descriptor and brighter navigation; light access headers and Claude’s fixes preserved. Read `design-plans/header-presence-2026-10-17/HANDOFF.md`. 319 tests pass. Claude’s LEDGER confirms hosted variable names and the effd53f live bundle’s Render API; the original local missing API variable must not be treated as proof of missing hosting configuration. Staff and whole-product audit gaps remain open.

**Surface audit, continuation (Oct 17, Claude, uncommitted):** sign-in, registration, Forbidden, and resident pages audited at 390/1440 (axe, measured targets and type, Tab order, error and recovery flows). Fixed: focus lost after a failed sign-in or registration; skip links moved ahead of the header; resident pages gained one `<main>`; analytics chart tables are keyboard reachable; phone touch targets. Ledger: `design-plans/landing-release-audit-2026-10-17/LEDGER.md`. **Open:** 11–12px staff chrome text, focus lost on about 15 other busy-disabled forms, populated staff states, Firefox/WebKit for this pass. Vercel Production has all five client variables; the live bundle points at the Render API. 319 web tests pass. Gotchas: demo API CORS allows only `localhost:5174`, and `127.0.0.1:5174` is a live-config Flutter run.

**Landing release audit (Oct 17, Codex, uncommitted):** read `design-plans/landing-release-audit-2026-10-17/REPORT.md` and `CLAUDE-NEXT.md`. Fixed readability/safety order, title/focus/recovery/loading, deferred map/Firestore and unused auth iframe, robots and metadata, responsive/high-contrast states. Added release configuration validation and route-error recovery. 316 tests / 48 files pass. Final Lighthouse measures the actual landing; rejected configuration-screen runs are explicitly separated. Local release preflight remains blocked on missing VITE_API_BASE_URL; hosted settings were not inspected. Remaining routes have regression checks, not full new audits.

**Interactive landing promo (Oct 17, Codex, uncommitted):** revised film with kinetic headlines, cursor demonstrations, camera easing, and a held ending; explicit autoplay plus three seekable chapters with progress. Current master is `rescue-response-promo-master.mp4`, web delivery 584152 bytes. Read `design-plans/codex-redesign/LANDING-VIDEO-HANDOFF.md`. 302 web tests pass; Chromium/Firefox/WebKit playback and interaction checked at 320/390/1440px.

**Public header (Oct 17, Codex, uncommitted):** reorganized desktop brand/navigation/staff action, added a dedicated phone navigation row and demo notice strip, and kept landing anchor headings clear of the sticky header. Read `design-plans/codex-redesign/HEADER-REFINEMENT.md`. Chromium checked at 320–1440px; 300 tests and production build pass.

**Landing film (Oct 17, Codex, uncommitted):** created and integrated a 16-second Hyperframes product animation, with compressed MP4, poster, pause/play, reduced-motion/save-data defaults, and original-scene fallback. Read `design-plans/codex-redesign/LANDING-VIDEO-HANDOFF.md` and `videos/rescue-response/README.md`. 300 web tests pass; actual playback checked in Chromium/Firefox/WebKit at 1440/390px. No deployment or production change.

**Latest Codex UI state motion (Oct 17, uncommitted):** registration/sign-in/reporting validation messages, shared form repositioning, banners, data states, disclosures, and dialog lifecycle/focus now have motion. Read `design-plans/codex-redesign/STATE-MOTION-HANDOFF.md` for implementation, 294-test result, cross-browser evidence, and remaining limits. Preserve Claude's preceding notification/stagger/skeleton repairs.

**Project:** IT 305 final project, Disaster Rescue Reporting and Monitoring System (Flutter + React + Express + Firebase). Due Nov 2, 2026.
**Branch:** `build/disaster-rescue`. Nothing merged to `master`. Repo: https://github.com/andireyes06-maker/disaster-rescue (private).
**Resident web and admin (Oct 16, 2026, late):** committed on this branch (latest `f65cb96`). Web deployed to Vercel production (includes the resident pages and admin screen). Firestore rules deployed to `flutter-5094e`. **Pushed (Oct 16, 2026, evening):** `build/disaster-rescue` pushed to origin at `c5f9845` after Airen approved it. Render redeploys from GitHub; confirm `/api/public/incidents` returns 200 before calling the API live. Plan: `docs/superpowers/plans/2026-10-16-web-resident-redesign.md`. Ledger with every ruling and deviation: `.superpowers/sdd/2026-10-16-web-resident-redesign/progress.md`. Spec amendment in `X-SPEC.md`.
**Website pass (Oct 16, 2026):** see [CLAUDE-HANDOFF.md](CLAUDE-HANDOFF.md) for the layouts, retry controls, and open decisions.
**Status:** committed on this branch, see the commit named in CLAUDE-HANDOFF.md. Deployed to production at https://disaster-rescue-web.vercel.app (live Firebase project `flutter-5094e`, not the emulator). Sign-in not verified on the live site.
**Bell audit (Oct 17, Claude, uncommitted):** notification bell verified on the demo emulator (keyboard open/close, focus return, bounded scroll, mark-as-read persisted across reload). Fixed the mark-as-read accessible name (Label in Name) and added a text "Unread:" state. Record: `design-plans/codex-redesign/checks/bell-audit-2026-10-17.md`. Web suite 286 tests. Not verified: screen-reader announcements, Flutter device.
**Cross-browser motion (Oct 17, Claude, uncommitted):** Chromium, Firefox 155, WebKit 27.2 at 1440 and 390px. Fixed: notification rows did not stagger (specificity reset `animation-delay`); Escape kept focus in the closing panel, so a reopen during the exit was lost. Record: `design-plans/codex-redesign/checks/cross-browser-motion-2026-10-17.md`. Still pending: physical devices and Flutter.
**Redesign:** the staff screens already match the approved operations-console direction (checked by rendering); `REDESIGN-SPEC.md` and `REDESIGN-PLAN.md` are older and need reconciling.
**Admins hold every staff permission** (decided Oct 16, late). This reverses the earlier 'no admin exports' rule: admins now get exports and the full report view. Residents-only actions (file, cancel) stay resident-only.

**Oct 17 review (Claude, uncommitted, working tree):** redesign regression review and fixes. Record: `design-plans/CONFIRM-AND-FIX-PLAN.md`, `design-plans/codex-redesign/checks/review-2026-10-17.md`, `design-plans/codex-redesign/checks/audit-routes-2026-10-17.md`. Fixed: access-page skip links, titles, duplicate banner, favicon, loading skeletons on audit and analytics. API address now explicit: no `localhost:8080` fallback; a missing `VITE_API_BASE_URL` shows a configuration error (`web/src/api/config.ts`, `web/src/components/ApiConfigGate.tsx`). Stopped a local API on port 8080 that ran with the production project's credentials. **Before the next Vercel deploy, confirm `VITE_API_BASE_URL` is set in the Vercel project**; without it production now shows the configuration error.
**Verified (Oct 16, late):** API 248 tests, rules 118 (emulator 8180), web 215 tests (3 full runs stable), `tsc` clean, production build OK, Impeccable 0 findings on the changed UI, `git diff --check` clean.
**Historical redesign note, updated Oct 18:** current backend uses transactional `setStaffGuarded` and `authSyncPending`; the previously deferred non-atomic last-admin finding is no longer an accurate description of the source. This UI audit did not rerun backend concurrency tests. Only a `build/disaster-rescue` push will put the new API live. Populated staff screens (assignment cards, queue rows, incident details with data) were not rendered: the emulator has no reports. Analytics and users pages not rendered.
**Not verified:** physical phones, screen readers, Firefox and WebKit, signed-in live pages, real device features (GPS, camera, push, map tiles), real Cloudinary.

## Decisions locked
- Firestore, not PostgreSQL (`docs/schema.md`).
- Express API in JavaScript. Web: React + Vite + TypeScript. Calm Clarity UI, bold public-safety palette: navy `#0B2A4A`, blue `#1E5BC6`, red `#C8102E` (hotline and critical only), amber `#B45309`.
- Photos through Cloudinary, signed. No Firebase Storage (needs Blaze).
- Hosts: Vercel (web), Render (API), Firebase Spark.

## Live
- Web: https://disaster-rescue-web.vercel.app (Vercel production, project `disaster-rescue-web`). Deployment protection is on for the deployment-specific URL.
- API: https://disaster-rescue-api.onrender.com (Render free plan). Health: `/api/health`. Pushed `c5f9845` on Oct 16; the new routes go live once Render finishes deploying.
- Firestore rules and indexes deployed to `flutter-5094e`. Test reports left on the real project (DR-T49M76 and others) should be closed or deleted before the demo.
- Live test accounts (`resident/dispatcher/responder/dmo@test.dev`) use password `AuditOnly#2026`, set by Airen on Oct 16 evening. Consider a different password before a real demo.

## Waiting on Airen
1. **Confirm the Render deploy** of the new API (`/api/public/incidents` returns 200). Then test live sign-in and the public map.
1b. **Later (not yet planned in detail):** QR code and biometric sign-in, as the professor mentioned. Plan these once the main work is settled and only light work is left.
2. **Live sign-in:** the demo accounts exist only in the local emulator. Decide whether to create demo logins on `flutter-5094e`.
3. **Redesign:** approve `REDESIGN-SPEC.md`.
4. **Course docs:** fill `docs/contributions.md`; replace the `000-0000` LDRRMO placeholder in `config/hotlines`; get legal review of `docs/privacy-and-coordination.md`.
5. **PR to master:** not opened. Needs your approval.

## Open questions
- Admin role: now a real web role (admin screen). Admins manage accounts and teams, and download CSV/PDF summaries from Analytics (the admin audit section points there).
- Responders read only their own team, in the rules and the API (done).
- Public placeholders still open: hotline number, privacy text, credits.

## Gotchas
- Never run `dart format` on folders (it rewrote 27 files once).
- Firestore queries use at most one equality filter; the rest filter in memory.
- Sign-out calls `DELETE /api/devices/:token` (wired via `beforeSignOut` in `mobile/lib/main.dart`). Keep it.
- Web API address: set `VITE_API_BASE_URL` explicitly (see `web/.env.example`). There is no default. `web/.env.local` targets the live project `flutter-5094e` and has no API address, so `npm run dev` shows the configuration error until it is set.
- Local emulators: Auth 9099, Firestore 8180 (the app hardcodes 8080 in `web/src/firebase.ts`). Demo emulator: Auth 9299, Firestore 8190, project `demo-disaster-rescue`, demo API on port 3102 in the review session.
- `mobile/web/` and `.vscode/` are untracked and deliberately not committed.

## Resume prompt
"Read HANDOFF.md and CLAUDE-HANDOFF.md in /Users/rien/Documents/FINAL_PROJECT. Continue from 'Waiting on Airen'. Older history is in docs/history.md."
