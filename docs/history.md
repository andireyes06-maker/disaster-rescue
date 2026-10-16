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
