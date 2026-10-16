# HANDOFF

## Start here

**Project:** IT 305 final project, Disaster Rescue Reporting and Monitoring System (Flutter + React + Express + Firebase). Due Nov 2, 2026.
**Branch:** `build/disaster-rescue`. Nothing merged to `master`. Repo: https://github.com/andireyes06-maker/disaster-rescue (private).
**Resident web and admin (Oct 16, 2026, late):** committed on this branch (latest `f65cb96`). Web deployed to Vercel production (includes the resident pages and admin screen). Firestore rules deployed to `flutter-5094e`. **API not yet live:** Render deploys from GitHub, so the new API routes (public map, admin, admin-everything permissions) need a push of `build/disaster-rescue`, which waits for Airen's approval. Plan: `docs/superpowers/plans/2026-10-16-web-resident-redesign.md`. Ledger with every ruling and deviation: `.superpowers/sdd/2026-10-16-web-resident-redesign/progress.md`. Spec amendment in `X-SPEC.md`.
**Website pass (Oct 16, 2026):** see [CLAUDE-HANDOFF.md](CLAUDE-HANDOFF.md) for the layouts, retry controls, and open decisions.
**Status:** committed on this branch, see the commit named in CLAUDE-HANDOFF.md. Deployed to production at https://disaster-rescue-web.vercel.app (live Firebase project `flutter-5094e`, not the emulator). Sign-in not verified on the live site.
**Redesign:** the staff screens already match the approved operations-console direction (checked by rendering); `REDESIGN-SPEC.md` and `REDESIGN-PLAN.md` are older and need reconciling.
**Admins hold every staff permission** (decided Oct 16, late). This reverses the earlier 'no admin exports' rule: admins now get exports and the full report view. Residents-only actions (file, cancel) stay resident-only.

**Verified (Oct 16, late):** API 248 tests, rules 118 (emulator 8180), web 215 tests (3 full runs stable), `tsc` clean, production build OK, Impeccable 0 findings on the changed UI, `git diff --check` clean.
**Open from the redesign:** the last-admin check is not atomic (security review finding, deferred; needs a transactional repo method). Only a `build/disaster-rescue` push will put the new API live. Populated staff screens (assignment cards, queue rows, incident details with data) were not rendered: the emulator has no reports. Analytics and users pages not rendered.
**Not verified:** physical phones, screen readers, Firefox and WebKit, signed-in live pages, real device features (GPS, camera, push, map tiles), real Cloudinary.

## Decisions locked
- Firestore, not PostgreSQL (`docs/schema.md`).
- Express API in JavaScript. Web: React + Vite + TypeScript. Calm Clarity UI, bold public-safety palette: navy `#0B2A4A`, blue `#1E5BC6`, red `#C8102E` (hotline and critical only), amber `#B45309`.
- Photos through Cloudinary, signed. No Firebase Storage (needs Blaze).
- Hosts: Vercel (web), Render (API), Firebase Spark.

## Live
- Web: https://disaster-rescue-web.vercel.app (Vercel production, project `disaster-rescue-web`). Deployment protection is on for the deployment-specific URL.
- API: https://disaster-rescue-api.onrender.com (Render free plan). Health: `/api/health`.
- Firestore rules and indexes deployed to `flutter-5094e`. Test reports left on the real project (DR-T49M76 and others) should be closed or deleted before the demo.

## Waiting on Airen
1. **Push the branch so Render deploys the new API** (approve the push of `build/disaster-rescue`). Without it the live resident map and admin screen will not work.
1b. **Later (not yet planned in detail):** QR code and biometric sign-in, as the professor mentioned. Plan these once the main work is settled and only light work is left.
2. **Live sign-in:** the demo accounts exist only in the local emulator. Decide whether to create demo logins on `flutter-5094e`.
3. **Redesign:** approve `REDESIGN-SPEC.md`.
4. **Course docs:** fill `docs/contributions.md`; replace the `000-0000` LDRRMO placeholder in `config/hotlines`; get legal review of `docs/privacy-and-coordination.md`.
5. **Push and PR:** nothing pushed, no PR. Needs your approval.

## Open questions
- Admin role: now a real web role (admin screen). The API lets admins manage accounts and teams; they get no exports.
- Responders read only their own team, in the rules and the API (done).
- Public placeholders still open: hotline number, privacy text, credits.

## Gotchas
- Never run `dart format` on folders (it rewrote 27 files once).
- Firestore queries use at most one equality filter; the rest filter in memory.
- Sign-out calls `DELETE /api/devices/:token` (wired via `beforeSignOut` in `mobile/lib/main.dart`). Keep it.
- Local emulators: Auth 9099, Firestore 8180 (the app hardcodes 8080 in `web/src/firebase.ts`; port 8080 is held by an unrelated process). Seeded API 3101.
- `mobile/web/` and `.vscode/` are untracked and deliberately not committed.

## Resume prompt
"Read HANDOFF.md and CLAUDE-HANDOFF.md in /Users/rien/Documents/FINAL_PROJECT. Continue from 'Waiting on Airen'. Older history is in docs/history.md."
