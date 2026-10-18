# Release integration ledger (2026-10-18)

Spec: `RELEASE-INTEGRATION-SPEC.md`. Plan: `RELEASE-INTEGRATION-PLAN.md`.
Labels: **REAL** = through the running API and the emulator, read back from Firestore. **REAL-BROWSER** = Chromium against the emulator, with `setOffline` as the only fake. **BLOCKED** = needs owner input. **NOT RUN** = in scope, not executed.

Stack: web `http://localhost:5174` (Vite, `[::1]`); API `localhost:3102` (restarted during this pass, see fix F1); Firestore emulator 8190; Auth emulator 9299; project `demo-disaster-rescue`. Sign-in hosts were asserted in the reconnect run only (see G4). No production or live `flutter-5094e` calls were made.

## P0 Preflight: REAL

- All five demo accounts sign in on the emulator. Staff see 29 reports, the resident sees 11, the responder sees 1. Teams: 12 Harbor teams.
- Three user documents have no email. They predate this pass, and I left them alone.

## G1 Uploads: BLOCKED

- No non-production Cloudinary cloud has been confirmed by Airen. `api/.env` holds the key names only. Nothing was uploaded and no Cloudinary call was made.
- NOT RUN: contract-level upload tests with the SDK mocked. They would prove only the mocked path.

## G2 Management persistence and concurrency: REAL

Evidence: `evidence/g2-management-output.txt`, script `evidence/scripts/p1-management.mjs`.

| Check | Result |
|---|---|
| Dispatcher creates team; Firestore doc has the name | PASS |
| Rename persists in Firestore; DMO reads it via API | PASS |
| DMO cannot create a team | PASS (403) |
| Admin creates temp responder and temp admin | PASS (201/201) |
| Dispatcher changes responder role to dispatcher; stored | PASS |
| Deactivate, then reactivate, both persisted | PASS |
| Dispatcher cannot demote an admin | PASS (403) |
| Admin cannot change own account | PASS (403) |
| Race of two admin demotions, 3 rounds: each round one `200` and one `409 last_admin`; one admin remains | PASS (3/3) |
| Temp accounts and team removed | PASS |

Observations, not failures:
- In all three rounds the same request won: the one the demo admin (Elena) sent to demote the temp admin. The emulator serialises the transactions, so this shows the guard works. It does not show Firestore's ordering under production load.
- `last_admin` is only reachable through a race: the caller must be another admin, so a plain request can never trigger it.
- A demoted admin's existing session returns `401 invalid_token` at once. That matches the revoke-on-change fix in `effd53f`.

NOT RUN: the settings save refusal path (blocked on a hotline, owner decision); the audit-log entries for these writes.

## G3 Exports: REAL (API), REAL-BROWSER (UI)

Evidence: `evidence/g3-exports-api-output.txt`, `evidence/scripts/p2-exports.mjs`, `p2-pdfcounts.mjs`, `g3-ui-export.mjs`.

| Check | Result |
|---|---|
| CSV for dispatcher, DMO and admin: 29 rows; references equal the 29 stored | PASS ×3 |
| Empty date range returns the header only | PASS ×3 |
| PDF: `%PDF`, 29/29 stored references in the text, by-type counts equal stored | PASS ×3 |
| PDF by-status counts (direct match against stored) | PASS |
| Resident refused both exports | PASS (403) |
| Anonymous refused | PASS (401) |
| Malformed date refused | PASS (400) |
| Analytics "Download CSV" and "Download PDF" as dispatcher and admin, after fix F1 | PASS, names `demo-sample-incidents.csv` and `demo-sample-summary.pdf` |

Limits: the PDF text was extracted by inflating the streams and decoding the hex strings. "Average response (minutes)" was not recomputed. The demo workspace is active, so every export is labelled as sample data; the non-demo export path was not tested.

### F1: demo export filename was lost in the UI (reproduced and fixed)

- **Reproduced:** the API sends `Content-Disposition: attachment; filename="demo-sample-incidents.csv"`. The Analytics button saved `incidents.csv`, because `ExportButtons` overwrote the name with its own default. A demo export could then pass for operational data.
- **Second cause:** the browser hid `Content-Disposition` from `fetch`, because the API did not list it in `Access-Control-Expose-Headers`.
- **Fix:** `web/src/api/client.ts` gains `apiFile` (returns the blob and the server filename; `apiBlob` wraps it). `web/src/features/analytics/ExportButtons.tsx` uses the server filename, falling back to the default. `api/src/app.js` adds `exposedHeaders: ['Content-Disposition']` to CORS. Test added to `ExportButtons.test.tsx`.
- **Verified:** the header is now exposed (`curl`); the browser downloads carry the demo names for both roles; web suite 52 files / 381 tests pass; `tsc --noEmit` exit 0; API suite 302 pass, 1 skipped (the emulator-only test).

## G4 Reconnect: REAL-BROWSER

Evidence: `evidence/g4-reconnect-output.txt`, screenshots `g4-*.png`, script `evidence/scripts/g4-reconnect.mjs`. The `setOffline` toggle is a browser-level stop, not a cut at the operating-system level.

| Check | Result |
|---|---|
| Sign-in reached only `localhost:9299` and `localhost:8190`; no production hosts | PASS (dispatcher and resident runs) |
| Dispatcher row shows `Submitted` while offline; API write stored `Awaiting Assignment` | PASS (stale as expected) |
| Dispatcher row shows `Awaiting Assignment` after reconnect, no reload | PASS (527 ms) |
| No uncaught page errors during the offline window | PASS (15 `ERR_INTERNET_DISCONNECTED` console entries, network only) |
| Resident detail shows previous status while offline | PASS (stale, `Submitted` shown; stored `Awaiting Assignment`) |
| Resident detail shows the new status after reconnect | PASS (6 ms; one run, not repeated) |
| **Any offline or stale indicator shown to the user** | **FINDING: none** |

F2 (recorded, not changed): no offline or stale indicator. The screenshot `g4-dispatcher-offline.png` looks normal while the browser is offline. The web code never reads Firestore's `fromCache`, `hasPendingWrites` or `navigator.onLine`. A user can act on stale status with no warning. This is a product decision (wording and placement), so it goes to Airen before any change.

NOT RUN: the responder assignments page; a real API restart or backend-down test; a reconnect after the browser process restarts; the sign-in host check on the export run (only the reconnect run asserted it, though the same stack was used).

## G5 Devices and Flutter: PARTLY BLOCKED

Evidence: `evidence/g5-flutter-analyze.txt`, `g5-flutter-test.txt`.

| Check | Result |
|---|---|
| `flutter analyze` in `mobile/` (Flutter 3.44.8) | PASS: no issues, exit 0 |
| `flutter test` in `mobile/` | PASS: 128 of 128 (host VM widget tests, not a device) |
| Physical or simulated device | BLOCKED: `flutter devices` lists none; `adb` not installed; `xcrun simctl` unavailable |
| Flutter rendering on a device | BLOCKED (same reason) |

## Demo state

- The checks changed demo report statuses and user roles. I re-seeded with `api/scripts/seed-demo.js`, run directly against the emulator environment variables (the script refuses to run without them). The seed stored its 24 scenario reports.
- The API still lists 29 reports: the five extra reports were already in the emulator before this pass, and the seed does not remove them. The demo accounts sign in again.

## Fixes made in this pass (uncommitted)

- F1: `api/src/app.js` (CORS expose header); `web/src/api/client.ts` (`apiFile`); `web/src/features/analytics/ExportButtons.tsx` and its test.
- API restarted on 3102 from `api/.env` with emulator overrides (`FIRESTORE_EMULATOR_HOST=localhost:8190`, `FIREBASE_AUTH_EMULATOR_HOST=localhost:9299`, `FIREBASE_PROJECT_ID=demo-disaster-rescue`, `CORS_ORIGINS=http://localhost:5174`). The previous process was stopped; the new one is serving.
- The shared dirty tree was not reset or formatted. Nothing was committed or pushed.

## Open items

- G1 uploads: needs a non-production Cloudinary cloud name (Airen).
- G5 devices: needs a physical device or simulator (Airen).
- Settings save: needs an approved service-area hotline (Airen).
- F2 offline indicator: product decision on wording and placement (Airen).
- Not run: audit entries for G2 writes, responder reconnect, backend-down reconnect, screen readers, Firefox and WebKit for these flows.
