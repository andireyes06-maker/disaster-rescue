# Rescue Reports: deliverables and status, 25 October 2026

Prepared for Airen. This is the single place to see what is shipped, where each deliverable lives, what is current, and what still needs a person. Older files are kept for the record; the "Status" column says which ones to use.

---

## 1. Release state

| Item | Where | State |
|---|---|---|
| Source of record | GitHub `andireyes06-maker/disaster-rescue`, branch `build/disaster-rescue` | Pushed 25 Oct as fast-forwards: `f46caf3` to `73a2c5a`, then `c2cd38e` (handoff docs only). Not force-pushed. |
| Same app commit on `fix/audit-2026-10-24` | Origin | `73a2c5a` (not updated with the handoff commit) |
| Local worktree | `/Users/rien/Documents/FINAL_PROJECT-rescuer-web` | Branch `feat/rescuer-web-access`, HEAD `c2cd38e`, clean. |
| Web (production) | https://disaster-rescue-web.vercel.app | Deployed 25 Oct (deployment `b2tewwmur`, built from the repo root). `/`, `/login` and `/register` return 200. |
| API (production) | https://disaster-rescue-api.onrender.com/api/health | Returns `{"ok":true}`. Live deploy is `fa3bd8b`. `api/` has not changed since, so Render needs no redeploy. |
| Firebase rules and indexes | Project `flutter-5094e` | Deployed earlier. Index build state still not confirmed in the console. |

**Deploy note.** The Vercel project's Root Directory is set to `web`. Running `vercel deploy` from inside `web/` fails with "Root Directory does not exist". The deploy must run from the repo root, with the project link in the root `.vercel/` folder. That folder is excluded locally in the worktree and is never committed. A failed deployment attempt from `web/` (`gq1wwqtsp`) is in the Vercel history; it did not go live.

**What the deploy checks cover.** HTTP status of the public routes only. The rendered login page, the role refusal, and the admin workflow were checked earlier on the demo stack (see section 4). Re-check in a browser after any future change.

---

## 2. Submission package (folder `SUBMISSION-2026-10-20/`)

Path: `/Users/rien/Documents/FINAL_PROJECT/SUBMISSION-2026-10-20/`

| Deliverable | File or folder | Status | Notes |
|---|---|---|---|
| **This summary** | `DELIVERABLES-AND-STATUS-2026-10-25.md` | Current | You are reading it. |
| Read-before-submit notes | `READ-BEFORE-SUBMIT.md` | Current, updated 25 Oct | Dated sections for 20, 21, 23 and 25 Oct. |
| Source archive | `Rescue-Reports-Source-2026-10-25.zip` (1,382 tracked files) and `Rescue-Reports-Source-2026-10-25-manifest.sha256` | Current, from `f46caf3` | Differs from `73a2c5a` only in the user-guide generator and deck, which are already in `User-Guide/`. `Rescue-Reports-Source.zip` and `SOURCE-MANIFEST.json` are older. |
| User guide (current roles) | `User-Guide/Rescue-Reports-User-Guide-2026-10-25.pptx` and `.pdf` (12 slides) | Current | Pages 2, 9 and 10 checked visually. Check the rest before handing in. |
| User guide (older) | `User-Guide/Rescue-Reports-User-Guide.pptx` and `.pdf` | Superseded | Shows retired roles. Keep for the record only. |
| Database | `Database/2026-10-25/` (`firestore.rules`, `firestore.indexes.json`, `schema.md`) | Current | Admin-only for staff. Dispatcher and DMO have no reads. Older copies are in `Database/`. |
| Video | Script: `Video/SCRIPT-2026-10-25.md` | **Script ready.** | Written for the current roles. Members must present it. |
| Video (existing MP4, SRT, narration) | `Video/Rescue-Reports-Technical-Walkthrough.mp4`, `.srt`, `NARRATION.md`, `PROVENANCE.md` | **Superseded. Do not submit.** | Shows the dispatcher and DMO workspaces. Needs re-recording. |
| Outputs (screenshots) | `Outputs/` | Current | Admin captures recaptured 25 Oct. Flutter captures from 20 Oct. See section 3. |
| Outputs, retired roles | `Outputs/superseded-retired-roles/` | Superseded | Three old captures, kept out of the package. |
| Android test build (current) | `Android/Rescue-Reports-Online-2026-10-25.apk` | Current, debug build | Built from `fa3bd8b`, production API and Firebase. Not store-signed. **Not installed or tested on a phone.** |
| Android test builds (older) | `Android/Rescue-Reports-Online-2026-10-21.apk`, `-23.apk`, `Rescue-Reports-Online.apk`, `Rescue-Reports-USB-Test.apk` | Historical | Kept for the record. |
| Android instructions | `Android/START-HERE.md` | Updated 25 Oct | Now names the 25 Oct APK, lists the three current accounts, and drops the retired roles. |
| Android install guide | `Android/ONLINE-INSTALL.md`, `Android/ONLINE-BUILD.json` | **Needs update** | Still name the 21 and 23 Oct APKs. Change them to the 25 Oct APK before sharing. |
| Contributions | `Contributions/Contributions-to-confirm.docx`, `.pdf`, `.md` | **Draft. Needs each member.** | See section 5. |
| Interim assignment | `Progress-Update/` (Gantt, 12 to 19 Oct report, editable XLSX and DOCX) | Historical, as submitted | Keep as is. |
| Verification record | `VERIFICATION.md` | Historical (20 Oct) | Covers the 20 Oct evidence. The 25 Oct checks are in section 4. |
| Checksums | `SHA256SUMS.txt` | Regenerated 25 Oct | Covers every file in the package. Verified with `shasum -c`. |
| CI record | `CI-RESULT.json` | Historical (23 Oct) | Three CI jobs green on `35760d8`. |

**Where the same material lives in the repo** (use these when a file in the package is out of date):
- Product and workflow docs: `docs/documentation/` (`README.md`, `how-it-works.md`, `setup-and-run.md`, `user-guide.md`, `accounts.md`, `audit-2026-10-24.md`, `handoff.md`).
- Video script (repo copy, 23 Oct wording): `docs/video-script.md`.
- User-guide outline and generator: `docs/user-guide/` (`outline.md`, `generate.cjs`).
- Contribution template: `docs/contributions.md`.
- Submission checklist: `docs/submission-checklist.md`.
- Role model: `docs/role-matrix.md`.

---

## 3. Outputs (screenshots), what changed today

Folder: `SUBMISSION-2026-10-20/Outputs/`

| File | Status |
|---|---|
| `admin-assigned.png` | **New 25 Oct.** Admin dashboard, Earthquake report in Team Assigned, with its next step and response history. |
| `admin-monitor.png` | **New 25 Oct.** Read-only Monitor map and filters. |
| `admin-analytics.png` | **New 25 Oct.** Analytics summary, charts and export buttons. |
| `resident-confirmed.png`, `responder-history.png`, `admin-accounts.png` | From 20 Oct. Kept. `responder-history.png` shows a responder, which is still a valid role. |
| `flutter-welcome.png`, `flutter-reports.png` | From 20 Oct, Android API 35 emulator. Not phone evidence. |
| `superseded-retired-roles/` | `dispatcher-assigned.png`, `dmo-monitor.png`, `dmo-analytics.png`. Moved out of the package. |

The new captures were taken with the admin account on the demo stack (`api/scripts/start-presentation.mjs`), at 1440 px width. All data is fictional. `CAPTURES.json` and `README.md` are updated to match.

Not captured: a rescuer on the web (the rescuer web view was added in `978fe7e`) and the resident phone screens in the 25 Oct APK. Add these if the report needs them.

---

## 4. Checks run

Recorded in earlier sessions and carried into this summary. These are the last full runs; no code changed after them, only docs and screenshots.

| Check | Result | Commit or date |
|---|---|---|
| Web unit tests | 589 pass (rescuer access); 512 pass (audit fixes) | `978fe7e`, `c4c5afb` |
| API tests | 505 pass | `c4c5afb` |
| API emulator identity tests | 66 of 66 | `c4c5afb` |
| Firestore rules tests | 160 of 160 | `c4c5afb` |
| Flutter tests | 231 pass | `c4c5afb` |
| Playwright end-to-end | 8 pass, 2 skipped | `db2a113` |
| Browser checks on the demo stack | Admin validate, assign, close, users, analytics CSV and PDF export, teams, map. Resident refused at web sign-in. Rescuer resolve and team isolation. | Earlier 25 Oct session |
| Live public routes | `/`, `/login`, `/register` return 200. API health `ok`. | 25 Oct, this session |
| Screenshot capture | Three admin captures recaptured and viewed. | 25 Oct, this session |
| Checksums | Regenerated and verified | 25 Oct, this session |

**Not checked:** the APK on any phone. Physical-device permissions, push delivery, photo upload from a phone, store signing, iOS, and assistive technology. Chrome and the Android emulator do not stand in for these.

---

## 5. What needs a person

These are the items I cannot finish alone.

**Product decisions (you, Airen).** I recommend the answer in brackets.
1. Should rescuers see the reporter's name and phone number? [No]
2. Should rescuers see report photos? [Yes, for their own team only]
3. When is a team released: at resolve or at close? The code releases at close. [Keep close]
4. Is 30 submissions per address per 15 minutes the limit you want? [Yes]

**Members (each person, for the project).**
5. Re-record the video using `Video/SCRIPT-2026-10-25.md`, with each member speaking or explaining their own part, or decide to drop the video from the package.
6. Each member confirms their own work and evidence in `Contributions/`. Replace "[Owner's submission name to confirm]" with the owner's name. Nothing in those drafts has been verified against commit authorship.

**Phone test (you, or any member with a phone).**
7. Install `Android/Rescue-Reports-Online-2026-10-25.apk` on an Android phone. Test a resident report and a rescuer's assignment, then note the result in `READ-BEFORE-SUBMIT.md`. Also update `Android/ONLINE-INSTALL.md` and `ONLINE-BUILD.json` to name this APK.

---

## 6. Repo housekeeping

- The root `HANDOFF.md` belongs to another session and is not used. The project handoff is `docs/documentation/handoff.md`.
- Session-only items such as the demo stack and scratch captures are not in the repo.
- Secrets: `web/.env.local` is git-ignored and was copied from the main checkout. Nothing secret is committed.
- The other session's checkout at `/Users/rien/Documents/FINAL_PROJECT` was not used for code changes. Its `SUBMISSION-2026-10-20/` folder was updated, as you asked.

---

## 7. Next steps, in order

1. Decide the four product points in section 5, items 1 to 4. Code follows on `fix/audit-2026-10-24` or `build/disaster-rescue`, then all suites run.
2. Members: re-record the video, and confirm the contribution drafts.
3. Phone test of the 25 Oct APK, then update the Android instructions.
4. Hand in the package. Read `READ-BEFORE-SUBMIT.md` first.

**Resume prompt for the next session:** "Read `SUBMISSION-2026-10-20/DELIVERABLES-AND-STATUS-2026-10-25.md`. Start with section 5. Work in `/Users/rien/Documents/FINAL_PROJECT-rescuer-web` on branch `feat/rescuer-web-access`, HEAD at `c2cd38e` or later."
