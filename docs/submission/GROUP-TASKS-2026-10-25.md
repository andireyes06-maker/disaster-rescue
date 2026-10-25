# Group tasks before hand-in, Rescue Reports (25 October 2026)

Prepared for Airen, the owner. This lists only what the group has to do. Everything the code and deploy need is finished (see `DELIVERABLES-AND-STATUS-2026-10-25.md` in this folder for the full status).

Members: Raymond D G Lopez, Justine De Leon, Liam Cabuguang, and Airen (owner). The owner's submission name is still a placeholder and must be entered in `Contributions/`.

Every member must be able to explain the part of the project they actually worked on. Nothing in the contribution drafts is verified yet. Do not sign or submit a statement you did not write or check yourself.

---

## 1. Everyone

| # | Task | Done when | Where |
|---|---|---|---|
| E1 | Read `DELIVERABLES-AND-STATUS-2026-10-25.md` and `READ-BEFORE-SUBMIT.md` | You know what is current and what is superseded | This folder |
| E2 | Confirm your own contribution, with evidence (file, commit, test or document) | Your statement is true, in your own words, and you have evidence | `Contributions/Contributions-to-confirm.docx` |
| E3 | Be ready to speak or explain in the video | You can explain your segment without notes | `Video/SCRIPT-2026-10-25.md` |
| E4 | Tell Airen your confirmed statement, or any change to it | Airen has your reply in writing | Message to Airen |

Do not invent or inflate a contribution. If you did not do something, leave it out.

---

## 2. Raymond D G Lopez (proposed: backend and database, video Presenter 1)

| # | Task | Done when |
|---|---|---|
| R1 | Confirm or correct your statement: API validation, Firestore schema, rules and indexes, workflow permissions, retry safety | Statement matches your real work |
| R2 | Check `Database/2026-10-25/schema.md`, `firestore.rules` and `firestore.indexes.json` against what you built | You can point to each rule and index and say why it exists |
| R3 | Record your video segment: the introduction (0:00 to 0:45) and the database and architecture section (6:30 to 7:30) | Segment recorded or explained on camera |
| R4 | Be ready to explain: lost-reply retry keys, the server-only ledgers, and why Firestore is not SQL | You can answer a question on each |
| R5 | Confirm the Firestore index build state in the Firebase console (the release notes do not confirm it) | Indexes show as built, or you note that they are still building |

---

## 3. Justine De Leon (proposed: frontend and mobile, video Presenter 2)

| # | Task | Done when |
|---|---|---|
| J1 | Confirm or correct your statement: web layouts, Flutter resident and responder screens, form validation and error presentation | Statement matches your real work |
| J2 | Install `Android/Rescue-Reports-Online-2026-10-25.apk` on an Android phone. It is a debug build, not store-signed. Allow installs from unknown sources. | App opens and shows the sign-in screen |
| J3 | Test the resident flow on the phone: sign in, submit a report with a photo, see the confirmation reference, see My Reports | Pass or fail is written down, with what you saw |
| J4 | Test the rescuer flow on the phone: sign in as a responder, see an assignment, post an update | Pass or fail is written down |
| J5 | Record your video segments: resident flow (0:45 to 2:00), rescuer on the phone and web (3:30 to 5:00), and the database segment after Raymond if needed | Segments recorded or explained on camera |
| J6 | Report any defect with the exact steps and the phone model | Defect listed for Airen |

Phone test results go in `READ-BEFORE-SUBMIT.md`. If a test fails, tell Airen before you change anything.

---

## 4. Liam Cabuguang (proposed: QA and documentation, video Presenter 3)

| # | Task | Done when |
|---|---|---|
| L1 | Confirm or correct your statement: test execution, defect reproduction and retesting, user guide, output screenshots, presentation | Statement matches your real work |
| L2 | Review the full 12-slide user guide, `User-Guide/Rescue-Reports-User-Guide-2026-10-25.pptx` and `.pdf`. Only slides 2, 9 and 10 were checked visually. Check every slide for retired roles (dispatcher and DMO) and for accuracy. | All 12 slides checked, and any problem is listed for Airen |
| L3 | Review the output screenshots in `Outputs/`: `admin-assigned.png`, `admin-monitor.png`, `admin-analytics.png` (new, 25 Oct), plus the older ones. Check that no retired-role image is in the package. | Images are correct and listed in `Outputs/README.md` |
| L4 | Record your video segments: admin validate and assign (2:00 to 3:30), admin close and audit (5:00 to 5:45), analytics, teams, users and the refusal (5:45 to 6:30) | Segments recorded or explained on camera |
| L5 | Check the captions match the final cut, and that the fictional-data notice is on screen for the first 20 seconds | Caption file checked against the video |

---

## 5. Airen (owner, coordination and integration)

| # | Task | Done when |
|---|---|---|
| A1 | Decide the four product points: reporter name and phone for rescuers (recommend no), photos for rescuers (recommend yes, own team only), team release at resolve or close (recommend close, as coded), and the submission limit (recommend 30 per address per 15 minutes) | Decisions written down; code follows on `fix/audit-2026-10-24` or `build/disaster-rescue` |
| A2 | Enter the owner's submission name in `Contributions/` and in `READ-BEFORE-SUBMIT.md` | No placeholder remains |
| A3 | Collect each member's confirmed statement and evidence, and enter them in `Contributions/` | Each entry has the member's reply |
| A4 | Decide whether the video is re-recorded or dropped from the package. The current MP4 and SRT must not be submitted, because they show retired roles. | Decision made and written in `READ-BEFORE-SUBMIT.md` |
| A5 | Record your own segment: the overview (0:00 to 0:45) if you are presenting it, and the closing limits (7:30 to 8:00) | Segment recorded or explained |
| A6 | Update `Android/ONLINE-INSTALL.md` and `Android/ONLINE-BUILD.json` to name the 25 Oct APK. They still name the 21 and 23 Oct builds. (This is documentation, not a group task, but it is still open.) | Both files name the 25 Oct APK |
| A7 | Hand in the package. Read `READ-BEFORE-SUBMIT.md` first. Check `SHA256SUMS.txt` still verifies after any change. | Package handed in, checksums pass |

---

## 6. Video recording (all members)

The script in `Video/SCRIPT-2026-10-25.md` is for about 8 minutes. The presenter roles above are proposals; confirm them as a group before recording.

Before recording:
1. Start the demo stack from the release checkout: `cd api && node scripts/start-presentation.mjs`. Web runs on port 5176. Stop it with `pkill -f scripts/start-presentation.mjs`.
2. Use the demo admin account. The emulator password is in `api/scripts/seed-demo.js`. Do not show it on screen.
3. No dispatcher or DMO screens in any take.
4. No passwords, tokens or real personal data on screen.

If a member cannot speak, they must still explain their part on camera or in writing. Synthetic narration does not count as a member's participation.

---

## 7. Hand-in checklist

- [ ] E2 and E4 done by every member.
- [ ] R1 to R5, J1 to J6, L1 to L5 done by each named member, or handed to another member with a note.
- [ ] A1 to A7 done by Airen.
- [ ] Video recorded or dropped, with the decision written down.
- [ ] Contributions show each member's reply, and no placeholder remains.
- [ ] `SHA256SUMS.txt` verifies (53 of 53 at the last check).
- [ ] `READ-BEFORE-SUBMIT.md` updated with the phone-test result and the video decision.

---

## Notes for the group

- The live web app and API were checked on 25 October with HTTP requests and the demo stack. Nobody has tested the APK on a phone yet.
- The Firestore index build state has not been confirmed in the console.
- The retired-role images and the older video are kept only as history.
