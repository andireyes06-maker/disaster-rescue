# HANDOFF

## Start here

**Project:** IT 305 final project, Disaster Rescue Reporting and Monitoring System (Flutter + React + Express + Firebase). Due Nov 2, 2026.
**Branch:** `build/disaster-rescue`. Nothing merged to `master`. Repo: https://github.com/andireyes06-maker/disaster-rescue (private). Vercel project `disaster-rescue-web` is linked, not deployed.
**Redesign in progress (Oct 16, 2026):** whole web product, ground-up. Spec `REDESIGN-SPEC.md`, plan `REDESIGN-PLAN.md`. Palette changed to bold public-safety (navy `#0B2A4A`, blue `#1E5BC6`, red `#C8102E` for hotline and critical only, amber `#B45309`), tokens in `web/src/theme/tokens.css` and `docs/design-tokens/tokens.json`.
- Done: shared components in `web/src/components/calm/` (Card, Badge, Field, DataTable, EmptyState, Banner, PageHeader); shell with mobile menu; public pages (landing remade: full-bleed navy hero, raised door cards); dispatcher queue as DataTable; incident dialogs with aria-modal and focus return; empty states on map, audit, teams, responder; messages, badges and summary cards on shared components. Last commit `22bae48`. 170 web tests pass.
- Not done: the staff screens are not remade. Dashboard, incident details, analytics, monitor, users, teams, assignments and operation form still have their old layouts. Only the palette, messages, badges and cards changed.
- Decided, not yet built: staff layout option B (command toolbar with counts and filters; incident details as two columns with a sticky action rail; cards for assignments). Design presented in chat; approval not confirmed.
- Open decision: the staff browser check needs either (1) four role passwords from Airen as `SEED_PASSWORD_<ROLE>`, with confirmation that the four test accounts on `flutter-5094e` may be reset, or (2) a local emulator run. Do not run `seed.js --real` without that approval.
- Resume prompt: "Read HANDOFF.md and REDESIGN-SPEC.md in /Users/rien/Documents/FINAL_PROJECT. Confirm whether Option B is approved and which staff-check route to use, then continue the staff screens."

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
