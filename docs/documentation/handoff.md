# Handoff: Rescue Reports documentation and fixes

Status as of 25 October 2026. `build/disaster-rescue` and `fix/audit-2026-10-24` are at `73a2c5a` on origin. Local worktree `feat/rescuer-web-access` is at the same commit and clean.

## Start here
- Full state, deliverable locations and open decisions: `SUBMISSION-2026-10-20/DELIVERABLES-AND-STATUS-2026-10-25.md` (in the submission folder, not in git).
- Read `docs/documentation/README.md` first. It indexes the docs.
- Code state: API 505 pass, web 512 pass, rules 160 pass, API emulator 66 pass, Flutter 231 pass, web end-to-end 8 pass (2 skipped). No code changed since; the 25 Oct changes were docs and screenshots only.
- Deployed: web (Vercel, `disaster-rescue-web.vercel.app`) from `73a2c5a`. API (Render) from `fa3bd8b`, which is current because `api/` has not changed. Debug APK from `fa3bd8b`, not installed on a phone.

## Next steps
1. Product decisions (owner): reporter name and phone for rescuers, photos for rescuers, team release at resolve or close, submission limit.
2. Re-record the video from `SUBMISSION-2026-10-20/Video/SCRIPT-2026-10-25.md`. Members confirm contributions.
3. Install `SUBMISSION-2026-10-20/Android/Rescue-Reports-Online-2026-10-25.apk` on a phone and test resident and rescuer flows.

## Open questions (owner decides)
- Can rescuers see the reporter's name and phone? (audit A-1)
- Can rescuers see report photos? (A-2)
- Release a team when a report is resolved, or only when closed? (A-8)
- Per-address submission limit: 30 per 15 minutes is a placeholder (A-3).
- Responder list window: oldest 50 ignores priority (M-6).

## Gotchas
- Run web tests with `--maxWorkers=2`.
- Web end-to-end needs `web/.env.local` (git-ignored). Copy it from the main checkout, then add `VITE_API_BASE_URL`.
- Vercel: the project Root Directory is `web`. Deploy from the repository root with the link in the root `.vercel/` folder. Running from `web/` fails with "Root Directory does not exist". Keep `.vercel/` out of commits.
- Firestore index builds are async. Queries error until they finish.
- The root `HANDOFF.md` belongs to an older session and is not current. This file replaces it for the rescue work.
