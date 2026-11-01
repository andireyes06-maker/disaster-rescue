# I-Report launch handoff, 29 October 2026

## Status, 1 November 2026 (newest, read this first)
- Source `3f487c9` is on `origin/build/disaster-rescue` and deployed (Vercel web; Render API at 045a2fa, API code unchanged since).
- Done today: team member photos and identity filter, dashboard Sort by, map under dialogs, reset-password dialog, 11-digit PH phone rule (web, API, Flutter incl. sign-up), responder danger-radius rule (`api/src/domain/reach.js`) with claimed distance in the audit log, website Download button serves APK22.
- APK22 (versionCode 22, SHA-256 5b55453513a98fa7fc5d614f6851030f9fd1ec0b1ddc6c25d74d8e788534054e) is published as the pre-release `android-online-2026-11-01-update22` in `andireyes06-maker/rescue-reports-downloads` and is in `../FINAL-DELIVERABLES FOR I-REPORT/06-Android-App/`. It includes the still-uncommitted update21 Flutter profile files (11 files, `04-Source-Code/Profile-update22-overlay`).
- User guide deck rebuilt (24 slides, recaptured from the running app). Capture method: Flutter web debug build from a temp copy with the emulator project renamed (the app hard-codes `demo-disaster-rescue` in emulator mode), Playwright, demo stack. Captures are in `10-Output-Portfolio/update22-captures/`.
- Deliverables, SHA256SUMS and both zips rebuilt. Older files are in `../archive/_superseded-2026-11-01/`.
- Not checked: a physical phone, the radius rule against the live service, Office opening the Word/PowerPoint files. The technical walkthrough video still quotes old test counts.
- Open: accounts saved with an old phone format must enter a valid number next time; a full live data reset was requested then cancelled (nothing deleted); resident photos for responders not added (privacy rule in `api/src/domain/privacy.js`).
- Resume prompt: "Read HANDOFF.md, then continue from the open items."

## Current source and deployment
- Local base: `135a3ad` on `feat/ui-response-workspace-2026-10-28`, plus the uncommitted repairs below. Another session committed the earlier Codex HQ/profile/dependency work in `560e16a`, added responder photos and pushed `7e21395`; do not revert it.
- Production web/API: `7e21395`. GitHub Vercel status and CI jobs pass; Render confirms live. Existing Vercel Git deployment belongs to `lajr-solute/disaster-rescue-web`; this CLI account cannot manage that workspace. Do not relink/create a replacement project.
- Team: **LAJR Solutions**, section **BSIT 3J-G1**. Members: Aclon, Franz Adriene R.; Cabuguang, Liam; De Leon, Justine; Lopez, Raymond DG.

## Current audit / local repairs
- Start with `design-plans/webkit-vercel-repair-2026-10-29/LAUNCH-AUDIT.md`. Web669 /88 files, API669 (36 skipped), Flutter320/analyze clean. Rules161 and real adapter65 checks remain unchanged. Release build/typecheck pass; production and full web dependency audits zero.
- WebKit local emulator cleanup: pause before unload, restore cancelled/back navigation; never installed against hosted Firestore. Routine admin/responder checks78 cases across three engines/390 and1440: no exceptions or overflow. An injected native confirmation/slow-navigation control still reports2 SDK teardown exceptions while live updates recover; not suppressed or claimed error-free.
- Native responder retry identity now hashes photo bytes, not just filename/size. Same-name same-size changed-photo regression was observed failing then passing (A→B→A). Submission freezes photos before location lookup and blocks attachment/text edits while busy.
- Profile privacy copy now names actual permitted roles. Only profile.png golden changed; rendered candidate and isolated diff viewed before promotion, provenance/checksums updated. Landing download-badge names now match visible text; source default points to the prepared update20 release. Publish the asset before deploying this code.
- Rebuilt online update20 in `../LAUNCH-REPAIR-2026-10-29/Android/`, same certificate as update19, debug-signed sideload, no visible debug ribbon, emulator mode off. Not phone-tested. Published update20 at the exact public GitHub tag on 29 October; deployment authorized by Airen. Its source archive/manifest is under that repair folder.

## Launch / submission gaps
- Live landing has Coming soon badges and no APK download link. Public `rescue-reports-downloads` currently has only the October23 prerelease. Publish approved update20 under the exact tag/filename in web/src/config/downloads.ts, verify HTTP200/hash, then deploy. The source-managed default avoids a Vercel account/env change. Airen authorized publication and deployment after this audit; verify the production commit and status in the final delivery release record.
- Existing final pack `../SUBMISSION-2026-10-29-FINAL-I-REPORT/` has313 valid checksums but contains update19 and source28d78bb. Preserve it; use the repair APK/source when assembling the next approved pack.
- Promo v2 is62s with LAJR branding. Technical/participation/intro/outro videos still use earlier Group3 branding and predate HQ/update photos; refresh before claiming current coverage. Actual contributions/reflections require member confirmation. Do not invent participation or whole-body photos.
- Physical Android/iOS, screen readers, real push/email, real Cloudinary upload/delete, signed-store builds and owner hotline/privacy/retention wording remain external gates, not passing tests.

## Decisions / rules to preserve
- Priority-first FR-06, oldest within priority, is accepted. Admin website; resident and responder Flutter, responder web also exists. Do not rebuild retired dispatcher/DMO workspaces.
- Optional responder update photos: accepted risk of orphaned assets on a crash/late upload; no ledger. Residents may read update-photo URLs on their own incident; no resident screen displays them. Do not reopen or change rules without approval.
- Profile photos on administrator report screens only. Medical is team identity; Lifeline is incident type. Camera and gallery both offered; required resident evidence remains1–5 photos.
- Fresh explicit approval for every push/deploy or production-data write. Stage named files only; never stage `docs/documentation/handoff.md`. No Android emulators; no directory-wide dart format; do not regenerate goldens without viewing; never print/commit keys.
- User cannot use Claude now. No external Opus was run in this audit; primary local source review/testing performed. The previous source-transfer rejection was not bypassed.

## Deliverables pack, 29 October 2026 (final pass)
- Master folder: `../FINAL-DELIVERABLES FOR I-REPORT/` (b139211, APK20). Read `12-Verification/FINAL-RECONCILIATION-2026-10-29.md` first. Full pre-change copy: `../archive/FINAL-DELIVERABLES-before-restyle-2026-10-29/`.
- Roles (owner decision): Aclon Frontend Development / Documentation; Cabuguang Backend Development / Database; De Leon Documentation / Frontend Development; Lopez Backend Development / Database Development. Applied to docs, slides, Gantt, video graphics, generators.
- Participation film: `07-System-Videos/I-Report-Participation.mp4`, 179 s, script unchanged beside it, presentation under `07-System-Videos/Presentation/`. Editable project: `11-Editable/video/participation/` (do not run build-film.py).
- Docs were restyled after generation (Times New Roman, justified); `npm run documents` would undo it, see `11-Editable/README.md`.
- Open: Justine's original-script comparison needs the owner's original; audio never listened to.
- Do not submit the older `../LAJR-Solutions-I-Report-Deliverables/` (28d78bb, update19).

## Participation film v3 (2026-10-30)
- Film rebuilt: animated dark background (no warm white), 180.1 s (3:00), screens as rounded cards with slow zoom, sliding speaker cards, live waveform, progress bar, white burned-in captions with no box.
- Opening has a 1.5 s lead-in; closing card is 10.1 s. All speech and captions are unchanged and shifted +1.5 s (verified by silence-gap offsets).
- Build scripts: FINAL-DELIVERABLES FOR I-REPORT/11-Editable/video/participation/recorded-clips/build3.py and burn3.py. Do not run build-film.py or npm run documents.
- Previous 2:53 light version archived in archive/.../_superseded-participation/.
- Open: PPTX speaker notes and PDF still say 2:56; Raymond's two clips differ from the script; nobody has watched the full film end to end.
- Next session: 5-minute extended version (needs extended script and new clips from Airen).
- Sync root cause (2026-10-30): ffmpeg adelay left a timestamp gap, so the lead-in silence collapsed and voices played up to 1.9 s early. Fixed with aresample=async=1:first_pts=0 at the end of the audio chain in build3.py. Speaker picture is also delayed 0.15 s (PD) because the raw clips lead by about 0.2 s. Opening now shows the full title from frame 0.
- Covers (2026-10-30): all 9 Word/PDF documents now have a spaced front page (logo, university, college, title, subtitle, Subject, Submitted by with the four names, date, checkpoint) with no running header or footer on the cover. Built by 11-Editable/post-processing/cover.py. Originals archived in archive/.../_superseded-covers. Android guide, progress Oct 12-19 and contribution report are one page longer because the cover now has its own page. Video documentation shot rebuilt natively (docslide.py), architecture diagram redrawn (archslide.py).
- Captions (2026-10-30): old caption times were about 0.9 s early. Rebuilt from per-clip transcripts (faster-whisper medium.en, word times) snapped to the real voice onsets in the final audio: recorded-clips/asr_clips.py then caps3.py then burn3.py. Wording is still the approved script. Two spots where both transcription models heard different words than the script, for the speakers to confirm: "one incident record" (heard "report") and "A report could reach the server" (heard "could never reach").

## Final deliverables check, 1 November 2026
- Script for the full demonstration video written: DEMO-VIDEO-SCRIPT.md (copy in 07-System-Videos/I-Report-Demonstration-Script.md). Resident scenes need the Flutter app (web /my only shows a notice). Not recorded yet.
- Found and fixed: SUBMISSION-CHECKLIST.md was empty (my 30 Oct role fix); START-HERE APK hash was APK20's, PDF regenerated from md; film trimmed to 179.5 s (limit 3:00); presentation notes, script headings, Gantt note, schema source line, documentation deadline sentence, em/en dashes in md, spacing typos in Profile-Update21.pdf; review notes got a 1 Nov update section.
- Open for Airen: (1) participation video deadline wording (docs follow 31 Oct 10:00 AM screenshot, which has passed; general submission is 2 Nov); (2) script and notes wording for Raymond and Franz differs from recordings; (3) two caption words to confirm by ear (record/report, could never reach); (4) nobody has watched the film with sound; Office apps not opened.
- Packages rebuilt: both zips pass integrity, 471-file manifest verifies, zip equals folder.
