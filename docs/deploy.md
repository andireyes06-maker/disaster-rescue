# Deployment plan

Status: PLAN ONLY. Nothing in this document has been run. Every step is marked NOT RUN. No hosting account has been created, no deploy has been made, and nothing has been run against the real Firebase project or Cloudinary.

Source material: `HANDOFF.md`, `X-SPEC.md` (sections 3, 9, 14), `docs/firebase-setup.md`, `docs/backup-and-recovery.md`, and the code at commit f7c5b96.

## 1. What has to be hosted

| Part | What it is | Build or start command (from the repo) |
|---|---|---|
| API | Express app in `api/`, reads `PORT`, `TRUST_PROXY`, `CORS_ORIGINS`, Cloudinary keys, and the Firebase service account | `npm start` (`node src/server.js`) |
| Web | React and Vite app in `web/`, built to static files | `npm run build` (`vite build`) |
| Mobile | Flutter app in `mobile/` | `flutter build apk --release` (Android), not yet built |
| Firebase | Auth, Firestore rules and indexes, FCM | Rules and indexes deployed from `firebase/` (NOT RUN) |
| Photos | Cloudinary, called by the API | Account and keys only (NOT RUN) |

Environment variables for the API are listed in `api/.env.example`. Do not copy the real values into any document or commit.

## 2. Options

### 2.1 API host

| Option | Notes | Status |
|---|---|---|
| Render (web service) | Runs `npm start`. Free tier sleeps when idle (UNVERIFIED: check current terms) | NOT RUN |
| Railway | Runs `npm start`. Trial or paid usage model (UNVERIFIED: check current terms) | NOT RUN |

Both need: the service account JSON added as a secret file or an environment variable (the API reads `serviceAccountPath`, see `api/src/config.js`), the Cloudinary keys, and `CORS_ORIGINS` set to the web app's HTTPS origin.

### 2.2 Web host

| Option | Notes | Status |
|---|---|---|
| Firebase Hosting | Same Firebase project as the database. Static build from `web/dist` (UNVERIFIED: the Hosting config file is not in the repo yet) | NOT RUN |
| Vercel | Static build from `web/`. A Vercel account is needed (UNVERIFIED: no Vercel project is linked) | NOT RUN |

The web app's Firebase keys are public client values, but they still belong in the build settings, not in the repo.

### 2.3 Mobile release

- Command: `flutter build apk --release` from `mobile/`. NOT RUN.
- Blocker (from `HANDOFF.md`): the Android NDK folder at `~/Library/Android/sdk/ndk` is corrupt. Delete that folder so Gradle downloads it again before any APK build. NOT RUN.
- Release builds must use HTTPS for the API. The progress notes say cleartext HTTP is the default and must be changed before release (task 21). UNVERIFIED: how the API base URL is set for release builds.
- Real phone test is not done. Push notifications and GPS accuracy are not checked on a device.

## 3. Steps (all NOT RUN)

Order matters. Each step lists what to check afterwards.

1. **Decide the hosts** (section 4). NOT RUN.
2. **Create the accounts** the team chose, each with a named owner (section 4, item 4). NOT RUN.
3. **Firebase project check.** Confirm the project is on the plan chosen in section 4, that Email/Password sign-in is on, and that Firestore is in Native mode. Steps are in `docs/firebase-setup.md`. NOT RUN.
4. **Deploy Firestore rules and indexes** from `firebase/`. Check that the indexes finish building in the console before the first real query. NOT RUN.
5. **Set API secrets.** Service account file or secret, Cloudinary keys, `CORS_ORIGINS`, and `TRUST_PROXY` set to the number of proxies in front of the API (the code reads an integer; set it to match the host, UNVERIFIED value). Without `TRUST_PROXY`, the rate limit sees one IP for everyone behind the proxy. NOT RUN.
6. **Deploy the API.** Check that an API route such as `GET /api/reports` returns 401 without a token (UNVERIFIED status code), which shows the auth check runs. NOT RUN.
7. **Build and deploy the web app** with the API URL set. Check the login page loads over HTTPS and that a request reaches the API. NOT RUN.
8. **Seed the real project only if needed**, with `--real` and the four `SEED_PASSWORD_<ROLE>` variables (see `firebase/seed.js` and `docs/firebase-setup.md`). The seed creates test accounts. Delete or change their passwords before any demo. NOT RUN.
9. **Replace the placeholder hotline number** in `config/hotlines` with the local LDRRMO number. NOT RUN.
10. **Build the APK** after the NDK fix (section 2.3). NOT RUN.
11. **Real-device test.** Install the APK, sign in as each role, submit one report, and check notifications. NOT RUN.
12. **Backup.** Set up the scheduled Firestore export described in `docs/backup-and-recovery.md`. The written recovery note is in that file. No recovery drill has been run. NOT RUN.
13. **Smoke test the full flow** with all four roles on the deployed system (report, verify, assign, rescue, close). NOT RUN.

## 4. Decisions needed

1. **API host:** Render or Railway?
2. **Web host:** Firebase Hosting or Vercel?
3. **Blaze plan:** Is Blaze needed? The current design does not need it: photos go to Cloudinary through the API, and FCM is sent from the API with the Admin SDK (`X-SPEC.md` section 14). Confirm that the team does not need Cloud Functions or Cloud Storage. If the team wants Blaze anyway for hosting, decide that now.
4. **Account owner:** Who owns each account (Firebase, API host, web host, Cloudinary)? Accounts should not be tied to a personal address for a shared project without the team agreeing.
5. **Cost:** Who pays if a free tier limit is hit? Check each plan's limits before choosing (UNVERIFIED).
6. **Domain:** Use the host's default URL, or a custom domain?
7. **Hotline number:** Who gets the official LDRRMO number, and who confirms it?
8. **Test accounts:** Keep the seed accounts for the demo, or create real staff accounts only?

## 5. Not verified in this plan

- Current free-tier and plan limits for each host and for Firebase.
- Whether the Firebase Hosting config exists (it does not appear in the repo).
- The API base URL setting for the Flutter release build.
- Every number in `TRUST_PROXY` for the chosen host.
- Everything in section 3. None of it was run.
