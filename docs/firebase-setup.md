# Firebase and Cloudinary setup

Part 1 is manual and needs your Google and Cloudinary accounts. Parts 2 and 3 need no accounts.

## 1. Create the real services (manual)

### Firebase project (Spark plan, free)
1. Open https://console.firebase.google.com and sign in.
2. Click **Create a project** (or **Add project**). Name it, for example `disaster-rescue`. Note the **Project ID** shown under the name.
3. Turn Google Analytics off (not needed). Click **Create project**, then **Continue**. Leave the plan as **Spark**. Do not upgrade.
4. Left menu, **Build > Authentication > Get started**. Under **Sign-in method** click **Email/Password**, switch **Enable** on, leave "Email link" off, click **Save**.
5. Left menu, **Build > Firestore Database > Create database**. Pick a location near you (for example `asia-southeast1`), choose **Start in production mode**, click **Create**. Locations cannot be changed later.
6. Deploy the rules and indexes (needs `firebase login` once): from the repo root run
   `firebase deploy --only firestore:rules,firestore:indexes --project <your-project-id>`
7. Service account key: click the gear next to **Project Overview > Project settings > Service accounts > Generate new private key > Generate key**. Move the downloaded JSON to `api/serviceAccount.json`. It is already in `.gitignore`. Never commit or share it.
8. In `api/.env` (copy from `api/.env.example`) set:
   - `GOOGLE_APPLICATION_CREDENTIALS=./serviceAccount.json`
   - `FIREBASE_PROJECT_ID=<your project id>`

### Cloudinary (free plan, photo uploads)
1. Open https://cloudinary.com, click **Sign up for free**, and finish sign-up and email verification.
2. Open the **Dashboard** (or **Settings > API Keys** / **Programmable Media > Dashboard**). The "Product Environment Credentials" box shows the three values.
3. Put them in `api/.env`:
   - `CLOUDINARY_CLOUD_NAME=<Cloud name>`
   - `CLOUDINARY_API_KEY=<API Key>`
   - `CLOUDINARY_API_SECRET=<API Secret>` (click the eye icon to reveal it)

## 2. Emulators (no account needed)

Run from the repo root. `demo-` project ids never touch a real project.

- Start Auth and Firestore emulators: `firebase emulators:start --only auth,firestore --project demo-disaster-rescue` (Auth on 9099, Firestore on 8080, UI off).
- Run the rules tests once: `cd firebase && npm install && cd ..` then
  `firebase emulators:exec --only firestore --project demo-disaster-rescue "node --test firebase/rules.test.js"`
- Point the API at the emulators by setting `FIRESTORE_EMULATOR_HOST=127.0.0.1:8080`, `FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099` and `FIREBASE_PROJECT_ID=demo-disaster-rescue`.

## 3. Seed test accounts

The seed creates 4 accounts, team `teams/team-alpha`, and `config/hotlines`. It is safe to re-run. Every account gets the custom claims `{role, active: true}`, and the responder also gets `team: 'team-alpha'`. Without `active: true` the API answers 403 account_disabled.

| Email | Role |
|---|---|
| resident@test.dev | resident |
| dispatcher@test.dev | dispatcher |
| responder@test.dev | responder (team-alpha) |
| dmo@test.dev | dmo |

TEST-ONLY password for all four: `TestOnly-Rescue#2026`. Never use it on a real deployment.

- Against emulators (one shot): `firebase emulators:exec --only auth,firestore --project demo-disaster-rescue "node firebase/seed.js"`
- Against emulators you started yourself: `cd firebase && FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099 FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 FIREBASE_PROJECT_ID=demo-disaster-rescue node seed.js`
- Against the real project (only after part 1): `cd firebase && GOOGLE_APPLICATION_CREDENTIALS=../api/serviceAccount.json FIREBASE_PROJECT_ID=<id> node seed.js --real`

The seed refuses to run with no target. The hotline `LDRRMO` number `000-0000` is a placeholder: replace it with your local number (dispatchers can edit it through the API).
