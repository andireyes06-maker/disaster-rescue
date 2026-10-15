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
