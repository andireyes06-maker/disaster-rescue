# Setup, run, test and deploy

Commands are for macOS or Linux, run from the repository root unless a step says otherwise. Commit `978fe7e` was the tested state.

## 1. What you need installed

| Tool | Version used | Needed for |
|---|---|---|
| Node.js | 22 | web, API, rules tests |
| npm | bundled with Node | installing packages |
| Flutter SDK | Dart 3.12 or newer | mobile app, APK |
| Java | 11 or newer (tested with 25) | Firebase emulators (database and sign-in tests) |
| Firebase CLI | `npx firebase-tools@latest` | emulators, rules and index deploys |
| Vercel CLI | `npx vercel` | web deploy |
| Android SDK with NDK | matches Flutter | APK build |

Never commit `.env` files, service-account JSON, keystores or `local.properties`. They are git-ignored, and they must stay that way.

## 2. Install

```bash
cd web      && npm ci && cd ..
cd api      && npm ci && cd ..
cd firebase && npm ci && cd ..
cd mobile   && flutter pub get && cd ..
```

On macOS, `sed -i` needs an empty string argument: `sed -i '' ...`.

## 3. Environment variable names

Values are not written here. Get them from Render (API), Vercel (web) or the Firebase console, and put local values in a git-ignored file.

**API** (`api/.env.example` lists them):

| Name | Purpose |
|---|---|
| `PORT` | port (local default 3103 in the demo) |
| `FIREBASE_PROJECT_ID` | Firebase project |
| `GOOGLE_APPLICATION_CREDENTIALS` | path to the service-account JSON (Render: `/etc/secrets/serviceAccount.json`) |
| `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` | photo storage |
| `CORS_ORIGINS` | allowed web origins, comma separated |
| `TRUST_PROXY` | `1` behind Render, so rate limits see the client address |

**Web** (`web/.env.example`):

| Name | Purpose |
|---|---|
| `VITE_API_BASE_URL` | API address, for production `https://disaster-rescue-api.onrender.com/api` |
| `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_APP_ID`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID` | Firebase web configuration (public client values) |
| `VITE_USE_EMULATORS`, `VITE_AUTH_EMULATOR_PORT`, `VITE_FIRESTORE_EMULATOR_PORT` | local emulator use only |

**Mobile** (passed with `--dart-define`, see `mobile/README.md`):

| Name | Purpose |
|---|---|
| `FIREBASE_API_KEY`, `FIREBASE_APP_ID`, `FIREBASE_MESSAGING_SENDER_ID`, `FIREBASE_PROJECT_ID` | Firebase configuration |
| `API_BASE_URL` | API address. A release build must use HTTPS |
| `USE_EMULATORS` | `true` only for local emulator testing |

## 4. Run the demo locally

The demo runs on its own emulator project (`demo-harbor-presentation`), with fictional data, so it never touches production.

```bash
cd api && node scripts/start-presentation.mjs
```

This starts:

- the Firebase emulators for Firestore (port 8290) and Auth (port 9399)
- the API on http://127.0.0.1:3103 (health: `/api/health`)
- the web app on http://localhost:5176

The script refuses to run if those ports are busy. Stop it with Ctrl-C. Accounts are in [accounts.md](accounts.md).

To run only the web app against a running API, use `cd web && npm run dev`.

## 5. Run the tests

| Suite | Command | Last result (978fe7e) |
|---|---|---|
| Web: types and unit tests | `cd web && npm test` (runs `tsc --noEmit` then Vitest) | typecheck clean; 589 tests pass in 82 files |
| Web: under load | `cd web && npx vitest run --maxWorkers=2` | use this; the default worker count times out on this machine |
| API: unit and route tests | `cd api && npm test` | 486 pass, 36 skipped (the emulator tests) |
| API: emulator tests | `cd api && npx firebase-tools@latest emulators:exec --config ../firebase/firebase.demo.json --only firestore,auth --project demo-disaster-rescue "npx vitest run test/demo-seed.emulator.test.js test/adapters/submission"` | 18 pass; 3 time out at 5 s under load and pass at 30 s |
| API: identity emulator test | same wrapper with `npx vitest run --testTimeout=30000 test/adapters/submission-identity.emulator.test.js` | 6 of 6 pass |
| Firestore rules | `cd firebase && npx firebase-tools@latest emulators:exec --config firebase.demo.json --only firestore --project demo-rules "node --test rules.test.js"` | 160 of 160 pass |
| Mobile: static analysis | `cd mobile && flutter analyze` | no issues |
| Mobile: tests | `cd mobile && flutter test` | 224 pass |
| Web: end-to-end | `cd web && npm run e2e` (Playwright) | not run in this audit |

Emulator tests need Java and the Firebase emulators. Under load, raise the timeout to 30 seconds rather than changing the test logic.

## 6. Deploy

Deploy in this order. Each step lists its check.

1. **Push** the branch: `git push origin HEAD:refs/heads/build/disaster-rescue`. Only fast-forward pushes. Do not force-push the shared branch.
2. **API (Render).** Render deploys the service from the repository's `api/` folder (see `render.yaml`). Check: `curl https://disaster-rescue-api.onrender.com/api/health` returns `{"ok":true}`. The first request after a quiet period can take about a minute (free plan).
3. **Web (Vercel).** The Vercel project's root directory is `web`, relative to the repository root. Link the repository root (the `.vercel` folder must be at the repository root, not inside `web/`), then run from the repository root:
   ```bash
   npx vercel deploy --prod --yes
   ```
   Check: the deployment status is Ready in `npx vercel ls disaster-rescue-web`, and https://disaster-rescue-web.vercel.app/login loads. Check that the bundle contains the expected text.
4. **Firestore indexes.** `npx firebase-tools@latest deploy --only firestore:indexes --project flutter-5094e`. Firestore then builds each index in the background. Until an index is ready, the queries that use it fail. Wait before using the admin queue.
5. **Firestore rules, last.** `npx firebase-tools@latest deploy --only firestore:rules --project flutter-5094e`. Deploy rules only after the API and web code that they must match are live.

Do not deploy the rules before the matching code is live. The rules remove direct reads that old clients depended on.

## 7. Build the Android APK

The release build needs a production keystore, which is not in the repository. Without one, `flutter build apk --release` fails the release checks. The release keystore comes from these environment variables (see `mobile/android/app/build.gradle.kts`):

- `RESCUE_KEYSTORE_PATH`
- `RESCUE_KEY_ALIAS`
- `RESCUE_STORE_PASSWORD`
- `RESCUE_KEY_PASSWORD`

Without them, build a debug APK. It installs on a phone but is not a store-signed release.

```bash
cd mobile
flutter build apk --debug \
  --dart-define=FIREBASE_API_KEY=... \
  --dart-define=FIREBASE_APP_ID=... \
  --dart-define=FIREBASE_MESSAGING_SENDER_ID=... \
  --dart-define=FIREBASE_PROJECT_ID=flutter-5094e \
  --dart-define=API_BASE_URL=https://disaster-rescue-api.onrender.com/api
```

The APK is written to `mobile/build/app/outputs/flutter-apk/`. The Firebase values come from the Vercel production variables and `firebase apps:sdkconfig WEB --project flutter-5094e`. Keep them out of the repository.

The Android NDK folder can be corrupt on some machines. If the build fails in the NDK step, delete `~/Library/Android/sdk/ndk` so Gradle downloads it again.

## 8. Known gaps in setup

- The API's Render auto-deploy was not checked from the Render dashboard in this audit. Confirm that the latest deploy is live.
- The Firestore index build was not confirmed as complete. The CLI does not report build state, and `gcloud` is not installed.
- The release APK needs a keystore from the team. Until then, only debug APKs are produced.
- The web Playwright suite (`npm run e2e`) exists but was not run in this audit.
