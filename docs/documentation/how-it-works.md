# How Rescue Reports works

## 1. The parts

```
 Resident (Flutter app)  ----+                       +--------------------+
                             |   HTTPS + ID token    |  API (Express)     |
 Rescuer (Flutter app) ------+------------------------>  on Render         |
                             |                       |  /api/*            |
 Administrator (website) ----+                       +----+----------+----+
                             |                            |          |
 Rescuer (website) ----------+                            |          |
        |                                                 |          |
        | Firebase Auth (sign-in, ID token, custom claims)|          |
        v                                                 v          v
 +-------------------+                          +-----------+   +-----------+
 | Firebase Auth     |                          | Firestore |   | Cloudinary|
 +-------------------+                          | (rules)   |   | (photos)  |
                                                +-----------+   +-----------+
        Web (React) on Vercel reads live data with Firestore listeners
        and writes through the API. Mobile reads the same data and
        writes through the API. Push messages go through Firebase Cloud Messaging.
```

Three deployable parts and one data platform:

| Part | Folder | Hosted on | Live address |
|---|---|---|---|
| Web app (administrator and rescuer website) | `web/` | Vercel | https://disaster-rescue-web.vercel.app |
| API (all business rules) | `api/` | Render (free plan, Blueprint in `render.yaml`) | https://disaster-rescue-api.onrender.com (health: `/api/health`) |
| Mobile app (residents and rescuers) | `mobile/` | Android APK built from the repository; not on a store | none |
| Firebase project `flutter-5094e` | `firebase/` | Google Firebase | console only |

## 2. Stacks

| Area | Technology | Version in the repository |
|---|---|---|
| Web UI | React, TypeScript, Vite, React Router, lucide-react icons | React 19.3, Vite 8.3, TypeScript 7, React Router 7.18 |
| Web data | Firebase JavaScript SDK (sign-in and live listeners), calls to the API | firebase 13 |
| Web tests | Vitest, Testing Library, jsdom; Playwright for end-to-end | Vitest 5 |
| API | Node.js 22, Express 4, helmet, cors, express-rate-limit, multer (uploads), zod (validation), pdfkit (PDF summary) | Express 4.21, firebase-admin 14 |
| API data access | firebase-admin (Firestore and Auth), Cloudinary SDK for photos | cloudinary 2.11 |
| API tests | Vitest, supertest, Firebase emulators for the database-backed tests | Vitest 5 |
| Mobile app | Flutter and Dart, Provider for state | Dart SDK 3.12 |
| Mobile services | firebase_core, firebase_auth, cloud_firestore, firebase_messaging (push), geolocator (GPS), image_picker (photos), flutter_map (maps), shared_preferences (drafts) | firebase_auth 6.7, cloud_firestore 6.10, firebase_messaging 16.7 |
| Security rules | Firestore security rules, tested on the emulator | `firebase/firestore.rules`, 160 rule tests |
| Hosting | Vercel (web), Render (API), Firebase (database, auth, rules, indexes), Android APK (manual install) | |

## 3. Sign-in and roles

1. A person signs in with email and password through Firebase Auth. Staff accounts are created by an administrator without a password, and the person sets one through a reset email.
2. Firebase issues an ID token. The token carries custom claims: `role`, `active` and, for rescuers, `team`.
3. Every API request sends the token. The API checks it, then checks the role for the route (`api/src/middleware/auth.js`).
4. The web app reads the same claims. The user profile in Firestore must agree with the claims. While they disagree, protected pages stay hidden ("Access not confirmed yet"). This protects against a role change taking effect halfway through a session.
5. Routing by role:
   - Administrator: lands on `/admin`. All staff pages are under `/dashboard`, `/map`, `/monitor`, `/analytics`, `/audit`, `/teams`, `/users`, `/incidents/:id`.
   - Rescuer: lands on `/assignments`. Sees only the assignments and closed reports of their own team (`/assignments/:id`).
   - Resident: signed out at sign-in with "Residents use the Rescue Reports mobile app". Old resident web pages (`/register`, `/my*`) show the mobile-app notice.
   - Dispatcher or DMO: signed out at sign-in with "This account has no website access. Ask your administrator.", and refused by the API on every route with `website_access_disabled`.
6. "Administrators hold every staff permission" is implemented in `grants()` (`api/src/middleware/auth.js`). An administrator therefore also passes checks written for the retired dispatcher role. This is intentional under option A.

## 4. The report lifecycle

Statuses (`api/src/domain/workflow.js`):

| From | To | Who | Meaning |
|---|---|---|---|
| Submitted | Under Verification | administrator | review has started |
| Submitted | Rejected, Duplicate | administrator | not a valid or not a new report |
| Submitted | Cancelled | resident | the resident withdraws it before verification |
| Under Verification | Verified | administrator | checked by hand. Records `verifiedBy` and `verifiedAt`. A second validation returns 409 |
| Under Verification | Rejected, Duplicate | administrator | as above |
| Verified | Awaiting Assignment | administrator | ready for a team |
| Awaiting Assignment | Team Assigned | administrator | a team is assigned (`POST /api/reports/:id/assign`) |
| Team Assigned | Rescue in Progress | rescuer | the rescuer acknowledges |
| Rescue in Progress | Resolved | rescuer | the rescuer reports the rescue complete |
| Resolved | Closed | administrator | closed. The team is released here |

Queue order: Reports awaiting action are listed Critical first, then High, Medium and Low; inside each priority level the oldest report comes first (first come, first served). Ties are broken by report id. Closed reports follow, newest first. The responder's assigned list is strictly oldest first.

Note on the ordering rule: an earlier instructor message described ordering by time and date only. The product keeps priority first because the project brief's FR-06 requires prioritizing reports by urgency and risk. The instructor can be asked to confirm.

Team release: a team stays busy from assignment until the report is closed, not when it is resolved. This is a known process point (see the audit).

Rescuer progress: field updates are added with `POST /api/reports/:id/updates`. Each update has a status and a count of people rescued, and they form the progress history.

## 5. Data model (Firestore)

| Path | What it holds | Who can read it |
|---|---|---|
| `reports/{id}` | the report: type, description, contact name and phone, location, status, priority, team, verification and assignment fields | the reporter; administrators; a rescuer for reports assigned to their team |
| `reports/{id}/updates/{id}` | field updates and status history | the same people as the report |
| `users/{uid}` | profile: name, email, role, team, active flag | the user; administrators |
| `teams/{id}` | rescue teams and availability | administrators; rescuers of that team |
| `notifications/{id}` | in-app notifications for one recipient | the recipient |
| `devices/{token}` | push tokens of one user | the owner |
| `auditLogs/{id}` | who changed what and when | administrators |
| `photoAssets/{id}` | photo references and upload records | administrators and the reporter |
| `config/hotlines`, `config/demo` | emergency hotline text and demo flags | see the rules for the exact readers; written by the server only |
| `mutationEffects/{id}` | server-only idempotency records | nobody from the client |

The full field list is in `docs/schema.md`. The rules are in `firebase/firestore.rules`.

Indexes are in `firebase/firestore.indexes.json`. Admin queue and team assignment queries need composite indexes. After a new index is deployed, Firestore builds it in the background, and the queries error until it is ready.

## 6. Protections built in

- **Idempotency.** Submissions and updates carry an `Idempotency-Key` header. A repeated request with the same key returns the first result instead of creating a duplicate (covered by the emulator and API tests). The mobile app keeps unconfirmed attempts so a retry uses the same key.
- **Rate limits.** Report submission: 10 per 15 minutes per account. Public incident map: 60 per minute per address. All routes: 300 per 15 minutes per address.
- **Validation and uploads.** Request bodies are limited to 100 KB. Photo uploads are checked for type and size. CSV exports neutralise spreadsheet formulas.
- **Privacy on the public map.** The public map (`/api/public/incidents`) returns only rounded centres, never exact locations or contact details.
- **Audit log.** Verification, assignment, status changes and closing are recorded in `auditLogs`.
- **Release configuration.** A release build of the mobile app refuses cleartext HTTP, localhost, emulator flags and missing configuration (`mobile/lib/config/release_config.dart`).

## 7. Photos

Photos go to Cloudinary through the API (signed, authenticated delivery). The report stores the photo references. Rescuers assigned to a report can see its photos. The exact handling is described in `docs/privacy-and-coordination.md`.

## 8. Notifications

- In-app: `notifications/{id}` documents, read through the API (`GET /api/notifications`, `PATCH /api/notifications/:id/read`).
- Push: the mobile app registers a device token (`POST /api/devices`). The API sends Firebase Cloud Messaging messages. Push delivery is not verified on a real phone yet.

## 9. Exports and analytics

- `GET /api/export/incidents.csv` and `GET /api/export/summary.pdf` are staff routes. Check `api/src/routes/export.js` for the exact roles allowed. The exported files include exact locations, so they should only be shared with staff who need them.
- `GET /api/stats` gives city-wide counts to administrators and, as the code stands, to rescuers too (see the audit).

## 10. Hosting and environment

- Web: Vercel project `disaster-rescue-web`. The build runs `npm run build:release`, which first runs `scripts/preflight-release.mjs` and then `vite build`. The production variables are `VITE_API_BASE_URL` and the `VITE_FIREBASE_*` values. Firebase web keys are public client values, but they are kept out of the repository.
- API: Render web service, Node 22. Secrets are entered in the Render dashboard. `TRUST_PROXY=1` is set so that rate limits see the real client address.
- Firebase: project `flutter-5094e`. Rules and indexes are deployed from `firebase/` with the Firebase CLI.
- Mobile: `flutter build apk` with `--dart-define` values for the Firebase configuration and `API_BASE_URL`. See `setup-and-run.md`.
