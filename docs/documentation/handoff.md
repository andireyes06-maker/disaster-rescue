# Handoff: Rescue Reports documentation and fixes

Status as of 25 October 2026. Branch `fix/audit-2026-10-24`, head `db2a113`, pushed. `build/disaster-rescue` is at `fa3bd8b` and does not yet include the screenshot baselines (`db2a113`).

## Start here
- Read `docs/documentation/README.md` first. It indexes the docs.
- Code state: API 505 pass, web 512 pass, rules 160 pass, API emulator 66 pass, Flutter 231 pass, web end-to-end 8 pass (2 skipped).
- Deployed: web (Vercel) and API (Render) from `fa3bd8b`. Debug APK built from `fa3bd8b` at `/Users/rien/Documents/RescueReports-APK/rescue-reports-debug-fa3bd8b.apk`, not installed on a phone.

## Next steps
1. Merge `fix/audit-2026-10-24` into `build/disaster-rescue` (fast-forward) if you approve, then redeploy the web app so the live site matches.
2. Install the APK on a phone and test resident and rescuer flows.
3. Confirm the Render deploy is the latest commit.

## Open questions (owner decides)
- Can rescuers see the reporter's name and phone? (audit A-1)
- Can rescuers see report photos? (A-2)
- Release a team when a report is resolved, or only when closed? (A-8)
- Per-address submission limit: 30 per 15 minutes is a placeholder (A-3).
- Responder list window: oldest 50 ignores priority (M-6).

## Gotchas
- Run web tests with `--maxWorkers=2`.
- Web end-to-end needs `web/.env.local` (git-ignored). Copy it from the main checkout, then add `VITE_API_BASE_URL`.
- Vercel: link the repository root, not `web/`, and deploy from the repository root.
- Firestore index builds are async. Queries error until they finish.
- The root `HANDOFF.md` belongs to an older session and is not current. This file replaces it for the rescue work.
