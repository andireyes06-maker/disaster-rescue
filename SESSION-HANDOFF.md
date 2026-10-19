> Historical record. Read HANDOFF.md for the current source, repair status and recovery bundle. Older counts and recovery instructions below are superseded.

# Session handoff

> Generated: 2026-10-16 (late session)
> Project: IT 305 Disaster Rescue Reporting, `/Users/rien/Documents/FINAL_PROJECT`, branch `build/disaster-rescue`
> Session summary: added a resident web interface, an admin screen, and admin-level staff permissions; deployed the web app and Firestore rules; the new API is not yet live.

## Goal

Finish the IT 305 project for submission on Nov 2, 2026. The website should have a resident view (sign up, report, track, public rounded map), an admin screen (accounts, roles, teams, settings, audit), and admins holding every staff permission. The website and rules should be live on `flutter-5094e` and Vercel, and the new API should be live on Render. Airen (the user) is the owner and makes all calls on scope, pushes, and deploys.

## Current State

**Working (verified this session):**
- API tests: 254 passing (`cd api && npx vitest run`).
- Firestore rules tests: 121 passing on the emulator at 127.0.0.1:8180 (`cd firebase && FIRESTORE_EMULATOR_HOST=127.0.0.1:8180 npm test`).
- Web tests: 216 passing (`cd web && npx vitest run`). Typecheck clean (`npx tsc --noEmit`). Production build OK.
- Web deployed: https://disaster-rescue-web.vercel.app (Vercel production, deployment `disaster-rescue-en2karsio-personalfranz.vercel.app`). `/login` returns 200. Sign-in on the live site NOT tested.
- Firestore rules deployed to live project `flutter-5094e` (`npx firebase-tools deploy --only firestore:rules --project flutter-5094e`).
- Emulator admin created by `api/scripts/create-admin.js` (tested on emulator: creates admin with claim `{role:'admin', active:true}`, refuses duplicate email).
- Latest commits on `build/disaster-rescue`: `c5f9845` (handoff), `f65cb96` (admins hold every staff permission), earlier `346f788`, `2c8fff8`, `a8b325a`. Ledger of every ruling: `.superpowers/sdd/2026-10-16-web-resident-redesign/progress.md`.

**Broken / not yet live:**
- The API on Render (https://disaster-rescue-api.onrender.com) is OLD. It does not have `/api/public/incidents`, `/api/admin/*`, or the admin permission changes. Render auto-deploys from GitHub, so the branch must be pushed. The remote `origin` has `build/disaster-rescue` at an older commit and `master`. Push NOT done: needs Airen's explicit approval.
- Consequence on the live site: the resident dashboard's public map shows "Could not load the map"; the admin screen's health/accounts/teams calls fail against the old API. Resident sign-up calls `/api/users/self` which exists in the old API, so that part works.
- Live project has no admin account. `create-admin.js` needs a password from Airen and must be run with `--confirm-live` (it refuses otherwise).
- Live test accounts (`resident/dispatcher/responder/dmo@test.dev`) share the password `AuditOnly#2026`, which is the same as the emulator demo password. Recommend changing it.

## Files in Play

| File | Why It Matters |
|------|---------------|
| `HANDOFF.md` | Project handoff (committed, ~49 lines). Status, live URLs, waiting-on-Airen list. Update this at task boundaries. |
| `CLAUDE-HANDOFF.md` | Website pass handoff (the earlier Oct 16 work). Has a "Resident web and admin" section. |
| `X-SPEC.md` | Approved spec. Has an Oct 16 amendment for resident web interface and admin role. |
| `docs/superpowers/specs/2026-10-16-web-resident-redesign-design.md` | Approved design for this work. Section 9a = builder check. |
| `docs/superpowers/plans/2026-10-16-web-resident-redesign.md` | 19-task plan. Tasks 1–13 built; 14–18 verified in place (no restyle); 19 = verification. |
| `.superpowers/sdd/2026-10-16-web-resident-redesign/progress.md` | Execution ledger with every ruling and deviation. Read before changing decisions. |
| `api/src/middleware/auth.js` | `requireRole` and `grants()`: admin passes any guard except resident-only routes. |
| `api/src/domain/workflow.js` | Status transitions. Uses `grants()`, so admin can make every staff step. |
| `api/src/domain/privacy.js` | `projectReportForRole`: admin gets the full report. `coarsen()` does 500 m rounding for public map. |
| `api/src/services/publicIncidentService.js` | Public rounded incidents (no ids, contacts, photos, addresses). |
| `api/src/services/adminService.js` | Health, hotline/notice settings (stored in `config/hotlines`, field `residentNotice`). |
| `api/src/services/userService.js` | createStaff/updateStaff with caller role, last-admin guard (409 `last_admin`), revokes refresh tokens on any role change. |
| `api/src/services/notificationService.js` | `notifyRole('dispatcher')` also reaches admins. |
| `api/scripts/create-admin.js` | First-admin setup. Reads password from terminal. Refuses live unless `--confirm-live`. |
| `api/src/app.js` | Mounts `/api/public` and `/api/admin`. |
| `firebase/firestore.rules` | `isStaff()` includes admin; teams readable by responder only for own team; users readable by admin. |
| `web/src/App.tsx` | All routes. Staff routes include `'admin'`. Resident routes wrapped in `ResidentLayout`. Admin route wrapped in `AppShell`. |
| `web/src/features/resident/*` | Sign-up, dashboard, report form, report detail, public map, notifications, hotlines, layout. |
| `web/src/features/admin/*` | AdminPage (4 sections), AccountsPanel, TeamsPanel, SettingsPanel, HealthPanel. No export panel. |
| `web/src/layout/AppShell.tsx` | Staff nav. Admin nav = all staff pages plus Admin. |
| `web/src/routes/landing.ts` | Role landing: resident `/my`, admin `/admin`. |
| `web/src/lib/schemas.ts` | Client zod schemas (sign-up, report, settings checks). Mirror API rules. |
| `web/src/api/client.ts` | `api()` helper; token attached from Firebase. |
| `web/vite.config.js` | `testTimeout: 20000` (raised because full parallel run timed out at 5 s). |
| `web/src/styles.css` | Resident layout, admin tables, public circle colours (use tokens, no raw hex). |
| `render.yaml` | Render blueprint for the API (rootDir `api`). |
| `firebase.json` | Points rules at `firebase/firestore.rules`. |

## What Has Been Tried (and Why It Failed)

### Attempt 1: Vite dev server started without the emulator flag
- **What:** restarted Vite as `npx vite --host 127.0.0.1 --port 5173` with only `VITE_API_BASE_URL`.
- **Why it failed:** `web/src/firebase.ts` only connects to the Auth emulator when `VITE_USE_EMULATORS=true`. Without it, sign-in went to the REAL Firebase Auth (`identitytoolkit.googleapis.com`). Two sign-in attempts with the demo password were rejected by the live project; no data changed. Fix: always start Vite with `VITE_USE_EMULATORS=true VITE_API_BASE_URL=http://127.0.0.1:3101/api`.

### Attempt 2: re-run the seeded emulator API
- **What:** `node design-plans/fixes-2026-10-16/support/emulator-api.mjs` after code changes.
- **Why it failed:** the script seeds users with fixed uids; `createUser` throws `auth/uid-already-exists` on a second run. Fix: a scratch launcher that copies the script without the seed loop (in the scratchpad, not the repo) — start API on 3101 without reseeding.

### Attempt 3: dev API base default
- **What:** the app defaults `VITE_API_BASE_URL` to `http://localhost:8080/api`.
- **Why it failed:** port 8080 is held by an unrelated `node` process (PID 82217) that returns 404 for everything. Do not kill it. Use the env var above.

### Attempt 4: a multi-line `sed` in a chained shell command
- **What:** `sed -i` with a multi-line pattern, chained with `&&` to a `cat > file` heredoc.
- **Why it failed:** sed errored, so the chained `cat` never ran, and `AccountsPanel.tsx` was silently not written. Fix: use Python for multi-line edits and check the file exists.

### Attempt 5: `api` helper used as generic
- **What:** `api<{id: string}>(...)`.
- **Why it failed:** `api()` in `web/src/api/client.ts` is not generic; TS error. Fix: cast the result.

### Attempt 6: Admin tests passing a `hotlines` option to `makeTestApp`
- **What:** `makeTestApp({ hotlines: ... })`.
- **Why it failed:** `makeTestApp` only accepts `{notifier, sender, corsOrigins, rateLimit, trustProxy}`. Fix: seed with `t.repo.saveHotlines(...)`.

### Attempt 7: admin-user tests without Auth records
- **What:** created users in the repo only.
- **Why it failed:** `updateStaff` calls `auth.setCustomUserClaims`, and the fake Auth has no record: "No user adm-2". Fix: seed both repo and `t.auth.users`.

### Attempt 8: `createReport` used as returning an object
- **What:** `(await t.repo.createReport(...)).id`.
- **Why it failed:** the fake repo returns the id string. Fix: use the return value directly.

### Attempt 9: Team rename input (race)
- **What:** inputs initialised from an effect that copied team names into state.
- **Why it failed:** the input showed empty until the effect ran; a fast edit was overwritten, so the PATCH body was wrong intermittently. Fix: show the saved name by default and keep only the edits.

### Attempt 10: Full web suite under parallel load
- **What:** default 5 s test timeout, and `expect` right after `user.type`.
- **Why it failed:** jsdom + userEvent under the full parallel run exceeded 5 s; assertions ran before the async API call. Fix: `testTimeout: 20000` in `web/vite.config.js` and `waitFor` around the API-call assertions.

### Attempt 11: Security review on the admin work
- The automated review flagged (1) admin download of the summary PDF, which lists incident coordinates: FIXED then REVERSED by Airen's later decision (admins now have all staff permissions); (2) stale claims after a role change: FIXED (refresh tokens revoked on any role change; API uses `verifyIdToken(token, true)`); (3) non-atomic last-admin check: DEFERRED (needs a transactional repository method; none exists).

## Current Best Theory

The code is complete for this scope and the local suites are green. The remaining gap is deployment: the live site needs the new API, which needs a push of `build/disaster-rescue` (Render builds from GitHub). Once pushed and Render has redeployed, the live map and admin should work. After that the most valuable checks are: sign-in on the live site, creating the first live admin, and a rendered pass over populated staff screens (the emulator has no reports).

## Next Steps

1. **Ask Airen to approve the push** of `build/disaster-rescue` to `origin`. Do not push without that approval. Then wait for Render to redeploy and check `https://disaster-rescue-api.onrender.com/api/public/incidents` returns `{"incidents":[...]}`.
2. **Test sign-in on the live site** with the four `@test.dev` accounts (password is the one Airen set; `AuditOnly#2026` was set on them). Check resident, dispatcher, responder, DMO, and that the public map loads.
3. **Create the first live admin** only after Airen gives a password: `cd api && GOOGLE_APPLICATION_CREDENTIALS=serviceAccount.json FIREBASE_PROJECT_ID=flutter-5094e node scripts/create-admin.js --email <email> --confirm-live`, entering the password at the hidden prompt. Verify the admin screen loads at `/admin`.
4. **Recommend changing** the live shared password `AuditOnly#2026` (on the four `@test.dev` accounts), if Airen agrees.
5. **Rendered check of populated screens** on the emulator: create a few reports (resident flow), then check queue rows, incident details, assignment cards, analytics, and users. Start Vite with `VITE_USE_EMULATORS=true VITE_API_BASE_URL=http://127.0.0.1:3101/api`.
6. **Reconcile** `REDESIGN-SPEC.md` and `REDESIGN-PLAN.md` with what was built (they still describe the teal palette and the real-project sign-in).
7. **Deferred:** make the last-admin check atomic (Firestore transaction in `api/src/adapters/firestoreRepo.js`, then use it in `userService.updateStaff`).
8. **Later, after the main work settles:** QR code and biometric sign-in (the professor mentioned both). Plan only; not started.

## Key Constraints

- **Do not push, deploy, or touch the live project without Airen's explicit approval.** Vercel web deploy and rules deploy were approved and done; the API push is NOT approved.
- **No production credentials in the repo or chat.** Service account is `api/serviceAccount.json` (git-ignored). Passwords are never stored in the repo.
- **Admins hold every staff permission** (Airen, Oct 16 late). Residents-only actions (file, cancel own report) stay resident-only. This reverses the earlier "no admin exports" decision.
- **Last admin cannot be removed; admins cannot change their own account** (409 `last_admin`, 403). Keep these.
- **Commit after each plan phase**, with the Co-Authored-By line `Claude Haiku 5.5 <noreply@anthropic.com>`.
- **Verify before saying done;** report what was not checked (phones, screen readers, Firefox/WebKit, live sign-in, populated screens).
- **Writing rule:** no em dashes in user-facing text. Address the user as Airen.
- **Do not kill PID 82217** (unrelated process on 8080).
- **Untracked, deliberately not committed:** `.vscode/`, `mobile/web/`, `PRODUCT.md`, several `design-plans/*.md` files. Check with Airen before adding.
- **Not the project:** `/Users/rien/Documents/ninie-work-full-backup/foryou/firestore.rules` was opened in the IDE; it belongs to a different project. Do not act on it.
- **Local stack** (if still running): Auth emulator 9099, Firestore emulator 8180, seeded API 3101 (scratch launcher), Vite 5173. Emulator accounts: `dispatcher@audit.test`, `responder@audit.test`, `dmo@audit.test`, `resident@audit.test`, `admin@audit.test`, all password `AuditOnly#2026`.
- **Ruling list** for admin/resident decisions: see the progress ledger. Changing a decision means updating the spec amendment in `X-SPEC.md` too.

## Memory Pointers

- Claude-mem search was not run for this handoff. The project files above and `.superpowers/sdd/2026-10-16-web-resident-redesign/progress.md` are the source of truth.
- Searches worth re-running later: "admin everything permissions", "resident web redesign ledger", "Render API deploy push".
