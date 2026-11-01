# I-Report final-change follow-up • 29 October 2026

## Source and authorization

Verified branch `feat/ui-response-workspace-2026-10-28`, HEAD `1e79438` (docs-only atop deployed `19435bb`). Product fixes below are uncommitted. No staging, commit, push, deploy, production report reset or production account mutation occurred. Existing other-session changes in `docs/documentation/handoff.md` were preserved.

Read HANDOFF.md, the final-change design spec and its task ledger. Applied the installed engineering code-review skill. Used Opus via the installed Claude CLI for the explicitly requested independent review, not an alternate reviewer model.

## Changes

1. **Per-account profile upload limit:** 10 authenticated attempts per 15 minutes, ahead of multipart parsing and provider work. Another UID has its own allowance; DELETE remains available. Uses the existing express-rate-limit pattern. Store is per running instance, so this is not a distributed quota. Selected10/15min as modest local hardening, not a new organization policy.
2. **Mobile upload window:** profile photos get60s; ordinary API calls retain20s. Fake-clock tests cover success beyond20s and timeout after60s.
3. **Avatar identity:** the rendered photo is associated with its UID and hidden immediately for another UID. Fetch cleanup and owner checks prevent old-account callbacks from exposing a previous avatar.
4. **Recovery announcements:** a plain status container stays mounted; only a populated notice receives padding/background. The existing feedback-arrive animation is preserved through the notice selector. Real screen-reader announcement behavior is untested.

Five tests added: API1, web2, Flutter2. Existing status regression was strengthened after the reviewer’s visual finding. No golden images changed.

## RED before GREEN

- Upload11 returned200 before the rate limit; expected429.
- Previous account’s image remained visible while the next account loaded/failed.
- The recovery status region did not exist at rest.
- Both mobile fake-clock tests failed at the old20s timeout, after correcting a missing test import/mime field.
- Follow-up reviewer found the newly mounted empty paragraph inherited a24px padded tinted box. The strengthened test failed; Chromium measured24px. Conditional inner paragraph fixes it while keeping the status container; Chromium now measures0px before a message.
- The first API test attempt was denied loopback access by the sandbox; it was rerun with authorized local server access. Those permission failures are not product regressions.

## Independent Opus reviews

Actual model in all three CLI results: **claude-opus-5-5**.

- `OPUS-BRANCH.md`: reviewed54080d9..1e79438 diff and selected security/correctness paths. No confirmed Critical/Important. Source-only; initial CSS/test/header coverage limits explicitly recorded.
- `OPUS-LOCAL-FOLLOWUP.md`: reviewed the local patch plus mobile logo/login CSS scope. One Important empty tinted notice finding, fixed above. Other hardening changes had no confirmed Important/Critical finding.
- `OPUS-STATUS-FIX.md`: confirmed that finding resolved without hiding the live region. Noted lost paragraph-targeted arrival motion as minor; the notice class was then added to the existing motion selector and verified in Chromium.

These are source reviews, not penetration tests or live-provider certification. No fallback model was used. The earlier account-limit block no longer prevented this run.

## Checks actually run

| Check | Result |
|---|---|
| Full API suite | 656 pass,36 skipped;77 passing files/9 skipped |
| Full web suite, final markup | 654 pass across85 files |
| Web typecheck | Clean |
| Web production build, final selector | Succeeds; existing >500kB chunk warning remains |
| Full Flutter suite | 312 pass |
| Flutter analyze | No issues |
| Whitespace check | git diff --check clean |

API baseline was655, consistent with the incoming message; the older653 number in HANDOFF.md was stale. Logs are in checks/. API/mobile source did not change after their full green runs. Web full suite reran after the notice markup correction. A subsequent one-selector motion-preservation change was checked by the final build and browser animation check.

## Rendered and persistence checks

- **Production, signed out, read-only:** login at390/1440 shows Forgot password and Contact an admin. No horizontal overflow. No sign-in/reset/help request was submitted to production.
- **Isolated local emulators:** Teams, populated Analytics, incident detail, own-profile and submitter-profile dialogs at390/1440. No measured overflow or page exceptions on checked local pages. The submitter dialog shows the expected reporter and returns focus to its opener.
- **Named analytics buckets:** harness waits for a successful stats response with named byLocation buckets, then captures the populated chart/table surface. Guiguinto and other seeded Bulacan towns are shown.
- **Medical team:** created a synthetic Medical team locally; Firestore independently confirms kind Medical; browser reload and opened Edit team select retain Medical. Initial harness failures came from a nested-text exact locator and a closed disclosure, not failed persistence.
- **Photo clear:** real Firestore adapter/service writes photo:null and reads it back on the dedicated local emulator. Asset removal is a fake function, not Cloudinary. Only a temporary synthetic account was created for this check, then deleted.
- **Recovery result:** local mocked help reply shows its notice in the same mounted status container; empty height0 at390/1440; normal feedback-arrive animation present. No actual email sent.

First Analytics/profile screenshots included skeletons or in-progress entry motion. They were replaced after awaiting data/settling; do not treat those discarded captures as finished views. Firebase emitted listener connection warnings in the local launcher log during browser lifecycle changes; the measured page-exception result does not mean all provider console output was absent.

## Files and reproducibility

CHANGED-SOURCE.json lists named local product/test files and hashes. FOLLOWUP.patch holds tracked-file edits, excluding another session’s documentation. The new mobile test is copied into checks/ for reconstruction. HANDOFF.md and the task ledger point here; the spec status now reflects its already implemented/deployed state.

## Still pending

- **Owner approval before APK and pack refresh:** update16 and the Oct28 submission/source ZIP/checksums still predate these changes; none was replaced in this pass. Design spec’s Verification section says to rebuild/refresh “only after Airen approves.”
- Any future push/deploy needs fresh explicit approval.
- Production reports not cleared/reseeded; exact list and explicit approval required.
- Real Cloudinary uploads/signed URLs/deletion and hosted Firestore clear remain unverified. The emulator null check does not close the hosted/provider gate.
- Physical Android/iOS, real push and screen-reader behavior remain unverified. No Android emulator used.
- Resident visibility of an assigned responder’s photo remains an owner question. No new screen or privacy exposure added.
- Priority-first remains the accepted FR-06 decision. It was not reopened or changed.


## Approved artifact refresh • 29 October 2026

Airen approved rebuilding APK/pack. Another session already produced an October29/update17 pack from19435bb, so it was preserved and a separate VERIFIED pack/update18 was created. Fresh Chrome outputs exposed the remaining ReportFlowPage plus icon. Replaced it with the existing ProductMark, with three RED→GREEN cases at320/390px and200% text. Four golden candidates were visually reviewed before promotion; differences only in header y14–54, body pixels unchanged. Golden harness precaches the logo and paints its decoded image before capture. Full Flutter now315, analyze clean. Opus5.5 read found no Critical/Important in this last patch. API656/web654 remain unchanged.

Source ZIP:754 manifest files,19 named overlays atop1e79438, excluding foreign working documentation. Online update18 rebuilt with the final header fix, package/version/certificate/endpoint/logo/photo-route/hash verified. No phone installation. Updated documentation23pages, guide20slides, portfolio19pages, technical video5m34s and participation149s. Both use disclosed synthetic narration; no member participation was invented. Source/archive/Office/PDF/MP4/APK/checksum verification is in the VERIFIED pack. No commit/push/deploy or production mutation.
