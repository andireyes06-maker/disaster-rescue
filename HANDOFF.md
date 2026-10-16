# HANDOFF

## Start here

**Project:** IT 305 final project, Disaster Rescue Reporting and Monitoring System (Flutter + React + Express + Firebase). Due Nov 2, 2026.
**Branch:** `build/disaster-rescue`. Nothing merged to `master`. Repo: https://github.com/andireyes06-maker/disaster-rescue (private). Vercel project `disaster-rescue-web` is linked, not deployed.
**Redesign in progress (Oct 16, 2026):** whole web product, ground-up, approved in `REDESIGN-SPEC.md`; tasks in `REDESIGN-PLAN.md` (8 phases, one commit each).
- Done: phase 1 primitives (`web/src/components/calm/`, commits 5547b39, dc5bfe1); phase 2 shell with mobile menu (e2efb93); phase 3 public pages with `public.css` and landing tests (commit below).
- Done: phase 4 dispatcher queue as DataTable with EmptyState (commit below).
- Done: phase 5 incident details. Reject and Assign dialogs return focus to their buttons; shared dialog sets aria-modal (commit below).
- Done: phase 6 map and audit empty states (commit below). Monitor reuses the map; export buttons already had text labels.
- Done: phase 7 teams and responder empty states, responder tests (commit below). Form labels were already in place.
- Phase 8 (partial): public pages checked in Chromium, Firefox, WebKit at 375/768/1440, no overflow, no errors. Stylesheet cleanup done (dead `.overlay` and `.dialog` removed). Not done: staff screens browser check. It needs the seed password (`SEED_PASSWORD`, not on this machine) from Airen.
- Oct 16 remake request (Airen): colour scheme replaced with bold public-safety palette (navy harbour, blue primary, red hotline only, amber notices). Tokens in `tokens.css` and `docs/design-tokens/tokens.json` updated. Landing remade (full-bleed navy hero, raised door cards).
- Not finished: staff screens (dashboard, incident details, analytics, monitor, users, teams, assignments, operation form) still use the old layouts and only got shared messages/badges/cards. Remake them on the new palette, then browser-check (needs SEED_PASSWORD from Airen).
- Next: remake the staff screens; then the staff browser check. Staff screens cannot be browser-checked without test credentials (Airen to provide).
- Resume prompt: "Read HANDOFF.md and REDESIGN-PLAN.md in /Users/rien/Documents/FINAL_PROJECT. Continue the remake: staff screens on the new palette, then the staff browser check."

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
