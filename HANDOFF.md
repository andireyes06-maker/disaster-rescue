# HANDOFF

## Start here

**Project:** IT 305 final project, Disaster Rescue Reporting and Monitoring System (Flutter + React + Express + Firebase). Due Nov 2, 2026.
**Branch:** `build/disaster-rescue`. Nothing merged to `master`. Repo: https://github.com/andireyes06-maker/disaster-rescue (private).
**Website pass (Oct 16, 2026):** the latest work is in [CLAUDE-HANDOFF.md](CLAUDE-HANDOFF.md). Read that first. It records the layouts, retry controls, tests, and open decisions.
**Status:** committed on this branch, see the commit named in CLAUDE-HANDOFF.md. Deployed to production at https://disaster-rescue-web.vercel.app (live Firebase project `flutter-5094e`, not the emulator). Sign-in not verified on the live site.
**Redesign:** spec `REDESIGN-SPEC.md` awaits Airen's review. Option B (staff layout) and the local emulator check route are approved. The staff screens are not remade yet. Plan `REDESIGN-PLAN.md` still needs revising for Option B and the emulator route before any staff-screen code.

**Verified (Oct 16):** web 172 tests pass (24 files), `tsc --noEmit` clean, Impeccable detector 0 findings on changed UI, `git diff --check` clean.
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
1. **Website decisions** (listed in CLAUDE-HANDOFF.md): audit-log phone treatment, incident photo thumbnails, whether to wire Reticle, and any whole visual direction change.
2. **Live sign-in:** the demo accounts exist only in the local emulator. Decide whether to create demo logins on `flutter-5094e`.
3. **Redesign:** approve `REDESIGN-SPEC.md`.
4. **Course docs:** fill `docs/contributions.md`; replace the `000-0000` LDRRMO placeholder in `config/hotlines`; get legal review of `docs/privacy-and-coordination.md`.
5. **Push and PR:** nothing pushed, no PR. Needs your approval.

## Open questions
- Admin role: code has `admin`, spec says dispatcher-equivalent. Web app has no admin role.
- Firestore rules let responders read teams; the API does not.
- Public placeholders still open: hotline number, privacy text, credits.

## Gotchas
- Never run `dart format` on folders (it rewrote 27 files once).
- Firestore queries use at most one equality filter; the rest filter in memory.
- Sign-out calls `DELETE /api/devices/:token` (wired via `beforeSignOut` in `mobile/lib/main.dart`). Keep it.
- Local emulators: Auth 9099, Firestore 8180 (the app hardcodes 8080 in `web/src/firebase.ts`; port 8080 is held by an unrelated process). Seeded API 3101.
- `mobile/web/` and `.vscode/` are untracked and deliberately not committed.

## Resume prompt
"Read HANDOFF.md and CLAUDE-HANDOFF.md in /Users/rien/Documents/FINAL_PROJECT. Continue from 'Waiting on Airen'. Older history is in docs/history.md."
