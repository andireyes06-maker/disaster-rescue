# Accounts and credentials

## 1. Demo accounts (local emulator only)

These accounts exist only in the local demo (`demo-harbor-presentation` emulator, started by `api/scripts/start-presentation.mjs`). They are fictional. They do not exist in the production Firebase project.

**Password for every demo account:** `Demo-Sample#2026`

This is the default in `api/scripts/seed-demo.js`, set by the `DEMO_PASSWORD` variable. It is written in the repository on purpose, so the demo can be started by anyone. Because it is public, it must never be used on a production account.

| Name | Email | Role | Team | Website sign-in | What it tests |
|---|---|---|---|---|---|
| Elena Cruz | elena.cruz@harbor.example | administrator | none | allowed, lands on `/admin` | the full administrator workflow: queue, validation, assignment, teams, users, analytics, audit |
| Marco Reyes | marco.reyes@harbor.example | dispatcher (retired) | none | refused with "Website access is for administrators only" | the retired-role refusal at sign-in |
| Sofia Lim | sofia.lim@harbor.example | dispatcher (retired) | none | refused the same way | the same refusal, second account |
| Adrian Santos | adrian.santos@harbor.example | DMO (retired) | none | refused the same way | the DMO refusal |
| Daniel Flores | daniel.flores@harbor.example | rescuer | Alpha (`demo-team-alpha`) | allowed, lands on `/assignments` | the rescuer website: team assignments, post update |
| Clara Navarro | clara.navarro@harbor.example | rescuer | Bravo (`demo-team-bravo`) | allowed | team isolation: must not see Alpha's assignments |
| Rafael Castillo | rafael.castillo@harbor.example | rescuer | Delta (`demo-team-delta`) | allowed | the same, third team |
| Nina Bautista | nina.bautista@harbor.example | rescuer | Foxtrot (`demo-team-foxtrot`) | allowed | the same, fourth team |
| Maya Torres | maya.torres@harbor.example | resident | none | sent to `/forbidden` (mobile app notice). Still signed in | resident report flow on the phone; website refusal |
| Noah Garcia | noah.garcia@harbor.example | resident | none | same as Maya | a second resident, for multi-resident data |
| Isabel Ramos | isabel.ramos@harbor.example | resident | none | same as Maya | a third resident |
| Leo Mendoza | leo.mendoza@harbor.example | resident | none | same as Maya | a fourth resident |

Residents use the phone app. To test the phone app against the demo, run the Flutter app with `USE_EMULATORS=true` and the emulator ports (see [setup-and-run.md](setup-and-run.md)).

### Sign in to the demo

1. Start the demo: `cd api && node scripts/start-presentation.mjs`.
2. Open http://localhost:5176/login.
3. Enter an email from the table and the demo password. Sign in.
4. To switch accounts, choose "Sign out" in the top bar first.

Also: a resident who signs in on the website is sent to `/forbidden` but stays signed in. Use "Sign out" on that page. A dispatcher or DMO is signed out at once.

### Demo data

The demo seeds 19 fictional reports across the districts (Riverside, Hillside, Riverbend, Civic, Market, Warehouse, Central and South), with statuses from Submitted to Closed. The data is generated from `demo-data/scenario.mjs`. The admin dashboard shows 19 reports on a fresh start (All reports 19, Needs verification 6, Active 17).

## 2. Real accounts (production)

- Production accounts are never listed in this repository, and their passwords are not recorded here.
- Staff accounts (administrator and rescuer) are created by an administrator on the Users page. They have no password until the person sets one with "Forgot password".
- Residents create their own accounts in the phone app.
- The seed script can create test accounts in the real project with `--real` and the variables `SEED_PASSWORD_<ROLE>`. Those values must come from a password manager, never from a file in the repository. Delete or rotate the test accounts before any demonstration.
- Keep the demo password out of production. Before a live demonstration, confirm that no production account uses `Demo-Sample#2026`.

## 3. Where secrets live

| Secret | Where it is kept |
|---|---|
| Firebase service-account JSON | Render secret file at `/etc/secrets/serviceAccount.json` (not in the repository) |
| Cloudinary API secret | Render environment variable |
| Vercel production variables (Firebase web config, API address) | Vercel project settings |
| Android release keystore and passwords | the team's password manager and the build machine's environment variables |

If a secret is ever committed or pasted in a chat, rotate it at its source (Firebase, Cloudinary, or Render) before anything else.
