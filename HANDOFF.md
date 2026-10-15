# HANDOFF

## Start here

**Project:** IT 305 final project, Disaster Rescue Reporting and Monitoring System (Flutter + React + Express + Firebase). Due Nov 2, 2026.
**Branch:** `build/disaster-rescue`. Nothing merged to `master`. Repo: https://github.com/andireyes06-maker/disaster-rescue (private). Vercel project `disaster-rescue-web` is linked, not deployed.
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

## Waiting on Airen
1. **Done:** private GitHub repo created and pushed. Render (dashboard) still needs setting up from `render.yaml`.
2. **Firebase (Spark):** create project, enable Email/Password, create Firestore, register a web app, and give the four `VITE_FIREBASE_*` values. Download the service account to `api/serviceAccount.json` (never commit it).
3. **Cloudinary:** cloud name, API key, API secret, into `api/.env` and Render.
4. **Android NDK:** delete `~/Library/Android/sdk/ndk` so Gradle re-downloads it, then `flutter build apk --debug`.
5. **Course docs:** fill `docs/contributions.md`; confirm the LDRRMO hotline number; get legal review of `docs/privacy-and-coordination.md` before real use.

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
