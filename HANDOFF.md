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
- Next: Phase 4 Playwright tests and the visual check of Tailwind's base styles.
- (Superseded) OPEN DECISION (Airen): Software Build Guidelines (`~/Downloads/Software Build Guidelines/project-standards`) name Next.js + TypeScript + Tailwind + shadcn/ui, React Hook Form + Zod, Vitest + Playwright for applications. We use React + Vite in plain JS and CSS, and Express in plain JS. Guidelines say existing projects need a scoped migration decision, not an automatic rewrite. Not changed yet. Options are in the chat.
- Next: Task 17 per X-PLAN.md (paused on the stack decision above for web).
- Not verified: real device, APK build (NDK still corrupt).
- Open for Task 13: deactivation must set claims `{role, active:false}`, never `{}`; `POST /api/users/self` must be idempotent, accept an empty body, and refuse (409) if the account is disabled or has a non-resident role.
- Airen's manual steps still open: Firebase project, service account file, Cloudinary keys (see `docs/firebase-setup.md`). Android NDK at `~/Library/Android/sdk/ndk` is corrupt; delete that folder so Gradle re-downloads it before any APK build.
- Resume prompt: "Read HANDOFF.md and .superpowers/sdd/X-PLAN/progress.md in /Users/rien/Documents/FINAL_PROJECT. Continue the X-PLAN subagent-driven build at Task 12 (uncommitted mobile work present)."
