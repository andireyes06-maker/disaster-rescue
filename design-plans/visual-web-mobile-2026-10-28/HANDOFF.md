# I-Report visual audit and repairs — 28 October 2026

Local working-tree refinements on `feat/ui-response-workspace-2026-10-28`, based on HEAD `f108766`. No commit, push, production deployment, Firebase deployment or production data changes. The existing unrelated edits to docs/documentation/handoff.md were left alone.

## What the audit found and repaired

1. **Selected map report was mixed inline with actions.** The map now has a separate incident inspector, with report identity/status, narrative, location and a dedicated action group. Desktop places it beside the map; phone stacks it below with full-width actions. Long summary regions are keyboard reachable.
2. **A distant HQ forced regional framing.** Default framing uses assignment locations; a selected incident gets a useful local zoom. Fit all locations explicitly includes headquarters, and Focus incident returns to the selection. No fake location is substituted.
3. **Team context and assignment rows lacked hierarchy.** Team identity is a compact context bar with HQ details disclosed separately. Rows lead with a type symbol, report identity and concise description; secondary place/time/status groups are aligned. Desktop map lists and long situation text are bounded rather than extending indefinitely. The full text stays available.
4. **Actions and detail sections felt disconnected.** Responder actions are grouped in a compact toolbar, with a measured update form. Programmatic route-heading focus no longer draws a box around the title; real action controls retain focus rings. Map selection keeps a visible inset focus frame.
5. **Incident identity was mostly purple.** Web tokens and Flutter share blue flood, ember fire, earth earthquake and green landslide treatments; Other keeps the violet brand. Existing priority/status meanings remain distinct. Colors accompany type icons and text, never replace them.
6. **Flutter responder cards/details needed stronger task hierarchy.** Assignments has an actual loaded-count heading and ordering guidance, tighter card groups and category colors. Detail begins with its incident type and status, then situation/location; missing place names fall back to real coordinates. The map action has a measured width. Resident report cards, type chooser/review and map filters use the same type palette.

## Added by the owner's follow-up: Closed inbox

ReportQueue now offers a Closed quick filter. It uses a separate `useReports('Closed')` listener, with `where(status == Closed)` before the query limit, rather than searching the open queue or filtering a general 50-report window. Its loading/error/cache/retry/load-more state comes from that listener. The existing status ASC + createdAt DESC composite matches the query; no index file or hosted configuration changed. The Status dropdown's Closed selection also uses this dataset.

The browser displayed two seeded closed reports after choosing Closed. Counts remain bounded to the loaded query window; they are not advertised as a database-wide total. Tests cover the dedicated predicate before the limit and the deep-linked Closed view.

## Verification on this pass

- Web: **585 tests across 78 files**, all pass; clean typecheck; production build succeeds. The existing large-chunk warning remains.
- Flutter: **281 tests**, all pass; analyze reports no issues.
- Browser: **51 route/width checks** across 17 route variants at 390, 1024 and 1440px, plus the Closed inbox assertion. Zero measured horizontal overflow and zero page exceptions. Final map/detail recaptures add six checks after focus/action refinements, also clear. These are local Chromium results using synthetic accounts/data.
- Web inventory: landing, sign-in, mobile-app notice, Forbidden, not-found; admin Dashboard, Teams, Users, Admin, Map, Analytics, Audit, incident details; responder Overview, Assignments, selected Team map and assigned incident detail. Existing admin/public layouts were inspected and retained where already coherent; this was not an unnecessary rewrite of every route.
- Flutter visual references: all 15 candidate phone renders generated outside the reference folder. Exactly six changed, each inspected before promotion: report-type, report-review, my-reports, assignments, incident-detail and map-tile-free. Nine remained byte-identical. All 15 checksums verify; PROVENANCE.md records the decision.
- Live Flutter Chrome: welcome and sign-in captured on the current local debug preview. A separate signed-in runtime harness timed out waiting for the accessibility/initial-app surface; it did not establish resident/responder runtime results. Those layouts are supported here by reviewed widget renders and tests, not a claimed successful authenticated Chrome run.
- `git diff --check` passed. No API/rules/native provider behavior was changed or claimed newly verified.

## Review evidence

`evidence/` contains current web phone/desktop screenshots, route/width JSON, the Closed inbox screenshot, six Flutter before/after pairs, Chrome welcome/sign-in captures, and verification logs. Screenshots use fictional local fixture records. The tile-free Flutter reference deliberately has a gray map and does not establish network tile loading. No real account secrets were included.

Start visual review with:
- web-responder-team-map-1440.png and web-responder-team-map-390.png
- web-responder-assignments-demo-report-12-390.png
- web-admin-inbox-closed-1440.png
- flutter-after-report-type.png, flutter-after-assignments.png and flutter-after-incident-detail.png

## Skills and run accounting

Used Impeccable design guidance and Flutter Expert guidance. Existing PRODUCT.md, DESIGN.md, mobile/DESIGN.md and current source supplied the context. PRODUCT.md contains older role/branding statements; current App.tsx/HANDOFF.md were used for current product truth, without silently repairing unrelated metadata.

Impeccable context and detector entrypoints were attempted and refused with permission denied (126). No detector or overlay pass is claimed. Two independent read-only web assessments were used: design review and browser/quality evidence, with separate outputs. The critique ignore file had no active entries; slug persistence was unavailable with the launcher. The native browser connector was busy, so final rendered evidence used isolated Playwright Chromium contexts. No live overlay was injected and no detector live server was started. Questions skipped: the owner had already selected the identity and authorized fixes.

## Limits and cleanup

- No physical Android/iOS device, Android emulator, Safari, VoiceOver/TalkBack, camera/permission or signed release check was run. No physical-device approval is implied by Flutter goldens.
- Modal variants, every long/empty/error combination and motion frame cost were not exhaustively re-audited. Existing motion and reduced-motion support were preserved.
- The authenticated Flutter browser harness remains an evidence gap, not a confirmed product defect. Device/provider/deployment gates remain separate.
- Dedicated audit servers on web5617, API3617, Auth9617, Firestore8617 and Flutter5717 were stopped through their owned launcher/session. Other sessions' processes were left alone. Failed/stale detail captures were removed; temporary harnesses and native before/candidate backups remain under /private/tmp for reproducibility.

## Continue

Review this local diff against f108766 and the evidence above. Preserve unrelated working-tree files. The six golden changes are intentional visual decisions, not unexplained comparison updates. Do not infer production rollout from local captures. A commit/push/deploy has not been performed.
