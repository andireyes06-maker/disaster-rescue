# Opus source review: branch

Actual model: claude-opus-5-5

Airen, I found no confirmed Critical or Important issues.

**What I reviewed** (reading only): the spec, `HANDOFF.md`, and the full `branch.diff` (54080d9..1e79438). I also read these source files:
- API: `users.js` routes, `profilePhotoService.js`, `privacy.js`, `reviewService.js` (how reporter details are attached), `reportService.js` (claim, fingerprint and town lookup order), `placeService.js`, and the Cloudinary upload code.
- Web: `ProfilePhotoControls.tsx`, `AppShell.tsx`, `SubmitterProfileDialog.tsx`, `IncidentPreview.tsx`, `ReportQueue.tsx`, the analytics page and chart, and the `LoginPage.tsx` recovery actions.
- Phone: the profile page and `services.dart`.

**What I checked:**
- **Who can see what:** reporter photos reach administrators only, responders have them stripped (`privacy.js:15`), and the single-user read is admin-only.
- **Photo upload and removal:** I traced overlapping change and remove requests. None of them can delete the photo that is currently saved; the worst case leaves an unused file in storage.
- **Retry identity:** the town lookup runs after the fingerprint is taken (`reportService.js:118-122`), so retries keep the same identity.
- **Stale replies:** responses that arrive late are guarded by sequence or `mounted` checks.
- **Analytics labels and Medical team type:** they match the spec.

**Limits:**
- No tests, builds or app runs.
- Nothing checked against the live services: real Nominatim answers (does "Guiguinto" come back as city, town or municipality?), Cloudinary signed links, or Firestore.
- I did not fully read the CSS, the test files, or the phone header and logo code.
