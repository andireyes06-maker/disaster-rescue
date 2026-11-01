# Handoff: Rescue Reports documentation and fixes

Status as of 25 October 2026. `build/disaster-rescue` is at `e8a7399` on origin (app code at `73a2c5a`, then a docs-only commit). `fix/audit-2026-10-24` is at `73a2c5a`. Local worktree `feat/rescuer-web-access` is at `e8a7399` and clean.

## Start here
- Full state, deliverable locations and open decisions: `SUBMISSION-2026-10-20/DELIVERABLES-AND-STATUS-2026-10-25.md` (in the submission folder, not in git).
- Read `docs/documentation/README.md` first. It indexes the docs.
- Code state: API 505 pass, web 512 pass, rules 160 pass, API emulator 66 pass, Flutter 231 pass, web end-to-end 8 pass (2 skipped). No code changed since; the 25 Oct changes were docs and screenshots only.
- Deployed: web (Vercel, `disaster-rescue-web.vercel.app`) from `73a2c5a`. API (Render) from `fa3bd8b`, which is current because `api/` has not changed. Debug APK from `fa3bd8b`, not installed on a phone.
- Hosting moved on 28 Oct 2026. The Vercel project `disaster-rescue-web` was transferred from the personal account to the LAJR Solute team (Pro Trial, about 14 days left on 28 Oct). Git link confirmed: `andireyes06-maker/disaster-rescue`, branch `build/disaster-rescue`. Live site, `/login` and API health checked after the move (200 and `ok`). The API's allowed origins already include the site address.
- Open on Vercel: remove `VITE_USE_EMULATORS` from the Preview environment (owner, in the dashboard). Decide the plan before the trial ends. `VITE_ANDROID_APK_URL` is not set, so the landing-page APK button is hidden.

## Next steps
0. Submission package for the professor (28 Oct): `DELIVERABLES-2026-10-28/` (checksums verified). Done: screenshots (12, fictional data), schema (checked 28 Oct), sample database export (fictional, from the presentation emulator). Also done: three live sample accounts (admin, rescuer, resident; passwords in `~/.config/i-report/sample-logins.txt`, not in the package) and a full live export, held privately at `~/.config/i-report/live-export/` because it has personal data of the group's members (owner accepted sharing it with the group; not for live use). Still open: phone screenshots, phone test of update14, one app or two. Delete the three sample accounts after marking. Hosting console access is not shared (school login uses email codes).
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
- Vercel: the project Root Directory is `web`. Deploy from the repository root with the link in the root `.vercel/` folder. Running from `web/` fails with "Root Directory does not exist". Keep `.vercel/` out of commits. The project now belongs to the LAJR Solute team, so use that team's dashboard, not the personal account.
- Firestore index builds are async. Queries error until they finish.
- The root `HANDOFF.md` belongs to an older session and is not current. This file replaces it for the rescue work.
