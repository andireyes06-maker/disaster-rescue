# Product copy cleanup — October 18, 2026

Airen explicitly removed academic/project presentation and requested fictional product content instead of environment labels and unfinished copy. This direction supersedes previous requirements to show demo badges, academic credits, pending-review text or team-lead download instructions. Keep honest emergency guidance and actual service behavior.

## Delivered

- Removed university/course/section credits from the rendered landing; footer now identifies Rescue Reports and its incident-response purpose. Updated current landing guidance and the product line in X-SPEC so older instructions do not restore these credits.
- Header notice: “Report incidents. Follow response updates.” No environment badge in the staff shell or Flutter app. Internal emulator safeguards, IDs and developer provenance remain; no production configuration changed.
- Replaced unavailable mobile/download copy with browser reporting guidance. Replaced pending privacy placeholder with practical advice about limiting personal information. This advice is not a claim of a reviewed legal policy.
- Replaced team-lead/dispatcher referrals on access pages with account and sign-in guidance. Forbidden explains lack of access and recovery directly.
- Landing artwork and all three film scenes now use Riverside District, Market Quarter, Hillside Road and Harbor Rescue Unit. Player labels, captions, loading/play/pause accessibility names and text equivalent use product language.
- Re-rendered the 16-second silent film, inspected the new poster, replaced MP4/poster delivered by the website. Master: `videos/rescue-response/renders/rescue-response-product-master.mp4`; delivery H.264, 1280×720, 16.000s, 584561 bytes. Existing autoplay, pause, chapters, motion preferences and media failure behavior preserved.
- Flutter app title is Rescue Reports. Its location example now uses a community hall; inspected and updated the affected report-location golden.
- Fictional fixture source now has person names, Harbor teams, district addresses and RR-2600xx references, with reserved `@harbor.example` emails. The seed writes those emails into profiles, so Admin can display an email instead of its internal ID.

## Local account email changes

These are emulator-only fictional accounts. Passwords, UID, claims, roles and operational state were preserved. Existing old email logins no longer identify these accounts; use these addresses with the same passwords:

| Role | Name | Address |
|---|---|---|
| Admin | Elena Cruz | elena.cruz@harbor.example |
| Dispatcher | Marco Reyes | marco.reyes@harbor.example |
| Dispatcher | Sofia Lim | sofia.lim@harbor.example |
| DMO | Adrian Santos | adrian.santos@harbor.example |
| Resident | Maya Torres | maya.torres@harbor.example |
| Resident | Noah Garcia | noah.garcia@harbor.example |
| Resident | Isabel Ramos | isabel.ramos@harbor.example |
| Resident | Leo Mendoza | leo.mendoza@harbor.example |
| Responder | Daniel Flores | daniel.flores@harbor.example |
| Responder | Clara Navarro | clara.navarro@harbor.example |
| Responder | Rafael Castillo | rafael.castillo@harbor.example |
| Responder | Nina Bautista | nina.bautista@harbor.example |

Only known local fixtures were updated on `demo-disaster-rescue`, localhost Auth 9299 / Firestore 8190. The migration updated exact old fixture text only, preserving custom edits, statuses, assignments, timestamps, passwords and claims. No reset/reseed or new accounts. A metadata lookup warning occurred in the SDK; the emulator updates completed. Earlier audit scripts that log in with the old addresses need these address substitutions; historical results remain valid for their recorded build.

## Verification

- Web: 354 tests across 51 files, TypeScript clean; production build passes.
- Existing fixture scenario and emulator guards: 26 tests pass. Reserved-domain assertion updated to `.example` rather than `.test`.
- Flutter analyze clean; 128 tests pass. Initial golden failure was exactly the intended changed location-hint text; viewed generated image before updating the affected baseline. These are widget/golden checks, not physical-device results.
- Hyperframes check passes, including 90/90 contrast checks; delivery render succeeds. FFprobe confirms dimensions/duration/codec; poster visually opened.
- Chromium local demo: 16 public/access/Admin/dashboard/teams/users combinations at 390/1440, no banned copy or page overflow. Current Admin was recaptured after adding fixture profile emails. No write actions were taken through the browser. Screenshots for full phone landing and desktop Admin were opened; the remaining screenshots are automated evidence.
- Existing browser end-to-end copy assertions updated; the separate Playwright webServer harness was not run because it uses a different local environment. Local browser check above verifies current rendering instead.

Nothing committed, pushed or deployed. Production and the separate Flutter/live-config process were untouched. This copy pass does not close the preceding transport, persistence, physical-device or release-signoff gaps. No hotline, institutional affiliation, endorsement, response-time promise, store release or support address was invented.
