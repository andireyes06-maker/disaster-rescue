# Integration refresh, round 3 (18 October 2026, afternoon)

Read `round3/ROUND3.md` for the detailed results. This file is the start-here.

## State (verify before continuing)

- Worktree: `/private/tmp/rescue-release-integration-2026-10-18`, branch `integration/redesign-functional-2026-10-18`, HEAD `76e54ff`.
- Uncommitted integration: 203 status entries, unchanged this round. Nothing committed, pushed, deployed, or merged.
- Local stack for this integration (still running when this was written): web 5179, API 3106, Auth 9599, Firestore 8490, project `demo-integrated-release`. Started by the integration's own `stack.mjs`. Restart through that launcher only: stopping the API alone stops the whole stack.
- Fixtures are fictional: `maya.torres` (resident), `marco.reyes` (dispatcher), `elena.cruz` (admin), `daniel.flores` (responder), password `Demo-Sample#2026`, emulator only.
- Emulator data is ephemeral. Every stack restart reseeds.

## Round 3 results

- Incident, responder and admin workflows: 18 of 18 across Chromium, Firefox and WebKit, each read back through the API.
- Page error boundary: not shown on 54 route loads across three engines.
- Module and React errors: a harness race (navigating while a lazy chunk loads). Fixed in the harness. Not a product defect.
- Geist font 403s: dev-only (Vite serves no files outside its root). The production build bundles the fonts.
- WebKit: two Firestore Listen errors on each full page navigation. Recovers. Not error-free.
- Flutter: analysis clean. Tests 128 of 128 when the golden reference folder is linked. The reference folder is untracked and absent from the worktree.
- Idempotency: duplicate reproduced after a failed completion write once the 120 s stale window passes. Retry while pending is refused correctly. Reload limit confirmed by code reading, not in a browser.

## Blocked: cannot be verified without owner input

- Cloudinary upload: needs the owner's Cloudinary account (`docs/firebase-setup.md`).
- Email and push delivery: needs a non-production delivery target.
- Hosted WebKit: needs a non-production hosted Firebase project.
- Physical device or Flutter on hardware: no phone attached.
- Hotline number and resident wording: owner must supply.

## Decisions needed

1. Idempotency fix: approve a spec for atomic report-plus-claim writes and a reload-safe key. Changes the report write path and the client form.
2. Golden references: decide whether the Flutter golden set should be tracked in the repo, so the tests run without the external folder.
3. Commit scope and deployment authorization for the integration, once the owner decides on the gates above.

## Gotchas

- The API limit is 300 requests per 15 minutes. Long probing runs hit 429 and invalidate the run. Reset only through the launcher.
- The launcher kills all children when any child exits.
- Do not symlink into the worktree's `design-plans` folder without checking the target first. A symlink created inside an existing directory lands inside it.
- Playwright 1.64 expects newer Firefox and WebKit builds than installed. Launch through `executablePath` with the installed builds.
