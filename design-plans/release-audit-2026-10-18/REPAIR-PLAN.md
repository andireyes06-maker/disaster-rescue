# Repair plan (release audit, 18 October 2026)

Ordered by release impact. Each item has an acceptance check. Nothing here is implemented; this is the plan for Airen to approve.

## P0: blocks any release

1. **Decide how the working-tree changes join the fix branch.** Owner: Airen. Reason: the committed branch lacks the 404 page and other work (Finding 4). Acceptance: one combined branch or commit set, reviewed, with the 404 page present on it. Then re-run this audit on that combined state.
2. **Remove the public demo banner** (Finding 1). File: `web/src/components/PublicHeader.tsx`. Acceptance: the public header on `/`, `/login`, `/register`, `/forbidden` shows no "Demo site" text, and the hotline notice is neutral when no number is configured. No number is invented.
3. **Make unknown addresses show a 404 page** (Finding 2). File: `web/src/App.tsx:44`. Acceptance: `/no-such-page` shows the recovery page for anonymous and signed-in users, with a link back to the right home. The existing `/forbidden` route is unchanged.
4. **Fix the emergency card on the resident hub** (Finding 3). Acceptance: no "call now" wording without a configured number. When unconfigured, show a neutral safety line. Re-check on `/my` at 390 and 1440.

## P1: before a release candidate is signed off

5. **Admin Accounts team control** (Finding 8). File: `web/src/features/admin/AccountsPanel.tsx`. Acceptance: a responder's team can be changed from the admin panel, with the same API and messages as the Users screen. Browser test on the emulator with read-back.
6. **Touch targets at 390 px** (Finding 5). Acceptance: inline text links and any interactive map or monitor marker reach 44 px in both dimensions, or the markup is shown to be non-interactive. Re-run the surface sweep (`evidence/results/surfaces.json`).
7. **Non-production checks that this environment could not run.** Acceptance: a hosted non-production Firebase project shows (a) the password-setup email is delivered, (b) WebKit does not log Listen errors on the same navigation, (c) the last-admin race and idempotency behave the same on Firestore as on the emulator. Needs a target from Airen.
8. **Real photo uploads.** Acceptance: a non-production Cloudinary configuration uploads, displays and cleans up a failed upload. Blocked until a target exists.
9. **Browser Back on report drafts** (F06). Decide whether to guard it. The router is `BrowserRouter`, so guarding Back needs either a data router or accepting the gap. Acceptance: the decision is recorded; if guarded, Back shows the same confirmation as the nav links.

## P2: polish and verification gaps

10. **Rate-limit message on report submission** (Finding 7). Acceptance: a 429 during submission shows a message that says to wait and that the draft is still on the page.
11. **Verify the remaining outputs**: PDF totals against the selected scope, team labels on the audit page, and the map and monitor marker details.
12. **Landing visual review.** Judge the landing page at 390, 768, 1024 and 1440 px in detail. The layout and overflow checks passed, but the design judgment is not recorded.
13. **Full Firefox and WebKit flows**, not only sign-in, dashboard and map.

## Verification gates that stay open regardless

- Firestore rules tests were not rerun. Run them on the combined branch.
- Physical devices (GPS, camera, permissions) and push delivery: need hardware or a service.
