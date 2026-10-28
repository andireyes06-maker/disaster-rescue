# Responder web audit, October 28, 2026

Verdict: working assignment workflow, incomplete responder workspace. One sidebar link is intentional in source, but almost every task is stacked into that single view. More color or administrative pages would not solve the workflow hierarchy.

## Scope and evidence

Source inspected at HEAD ec3fc26 in /Users/rien/Documents/FINAL_PROJECT/app; other session changes to docs/documentation/handoff.md and untracked artifacts were preserved. No product source, production data, account roles or deployments changed.

Used design:design-critique. Read App, AppShell, AssignmentsPage, ClosedReportDetail, TeamSummary, AssignedProgress, OperationForm, assigned/closed queries and watchTeamReports. Rendered the current app in Chromium against an owned isolated synthetic emulator on5487/API3487/Auth9487/Firestore8487. Signed in as the seeded responder. No acknowledgements or updates submitted. Tested390/1440px, opened/closed the operation form, and injected only a local stats503. No page exceptions or horizontal overflow observed. The default team had one active assignment and no closed rows, so closed-detail and long/many-assignment behavior here are source review, not rendered verification. No new full test-suite run, accessibility conformance, performance or motion-timing claim.

Evidence: evidence/browser.json, failure-check.json, assignments-1440.png, phone-top-viewport.png and stats-failure-viewport.png. Full-page phone captures can composite fixed navigation/skip links at the scroll offset; use clean viewport images to judge those elements, not that capture artifact.

## What actually exists

Responder sidebar has Assignments only. /assignments contains team totals, live open reports, acknowledgement, inline progress update form, bounded progress history, closed-draft receipt checking and the ten most recent closed reports. Header offers profile/password and notifications. /assignments/:id is a closed-detail route; an open report redirects back to the general list. Admin pages are correctly role restricted; do not expose those to populate the sidebar.

## Functional findings (separate from proposed features)

1. HIGH, source confirmed: incomplete assignment results can look complete. watchTeamReports.ts:38-45 swallows failure of the several-teams listener and substitutes an empty list. Keeping single-team results is sensible, but no partial-results warning/retry is exposed, so several-team assignments can disappear without the responder knowing. Preserve available rows, visibly flag partial data and retry the failed channel. Not fault-injected in this audit.
2. MEDIUM, source confirmed: Recently closed disappears on errors, loading and empty states. AssignmentsPage.ts:289 renders it only when no error and rows exist, ignoring its loading/error/retry/fromCache state. A failure looks identical to no closed work. Always render its section with independent states and recovery.
3. MEDIUM, browser reproduced with local503: TeamSummary silently disappears when stats fail (TeamSummary.ts:29). No loading placeholder, error explanation or retry; summaryCount becomes0. It fetches only on mount/team change, so its totals are not subscribed or invalidated by operation saves. A live assignment list can disagree with stale totals. Show a stable summary state with refresh/invalidation and truthful loading/error labels.
4. MEDIUM, source confirmed: active notification deep links lose the report target. ClosedReportPage redirects any open report to /assignments without selecting, scrolling to or focusing that assignment. A responder must locate it in the list. Support a dedicated active detail route, or explicitly preserve and focus the target in the list, including when outside the loaded window.
5. MEDIUM, source confirmed: uncertain closed-draft copy overstates certainty. ClosedDraft says “This draft was not sent” before an unresolved receipt check, then separately says the earlier update may have been saved. The section explanation also claims entries were not sent. For an unconfirmed attempt, say receipt is unconfirmed until the lookup resolves it; distinguish a never-submitted draft. This is a copy defect, not a new replay-safety failure demonstrated here.
6. MEDIUM, source-review risk needing a fixture: multi-team queries apply a limit before client status filtering. An old terminal-heavy window can crowd out open multi-team rows; conversely newer open rows can crowd out closed multi-team rows. useAssignedReports and useClosedTeamReports need large mixed-status fixtures and query/paging review. Do not call a bounded post-filtered window a complete result without evidence.
7. LOW, source confirmed: the closed-list truncation note checks >10, but the hook already caps output at10. That note never explains the limit. State the ten-most-recent scope explicitly, or provide bounded older-history access if required.

## UX and visual findings

- The desktop sidebar devotes232px to a single destination and a large blank column. Meanwhile one assignment occupies a full-width card. This feels like the admin shell with most content removed, rather than a purpose-built responder workspace.
- Team totals occupy roughly230px before active work; two zero-valued outcome totals and duplicated assigned/open counts have similar visual weight to the urgent task. No team name, HQ or operational context is shown by TeamSummary.
- At390px, one assignment produces a1427px page; opening its form produces1919px in a clean follow-up capture. History lives below the form inside every assignment. More assignments multiply repetition and scrolling.
- All active titles are generic “Flood Report” etc.; active cards omit the reference number. Similar incidents are hard to distinguish or discuss with coordinators.
- No search, status filter, focused Active/Recently closed navigation or clear “needs acknowledgement” grouping. Oldest-first ordering is explicit in the responder hook; do not silently replace business ordering during layout work.
- Active cards offer “Pinned location / Open in maps” for coordinate-only records, while closed details use PlaceLabel. The active workflow lacks the same readable place treatment, inline location preview and team-scoped spatial overview.
- There is no dedicated full active incident brief. These responder templates do not render photos, a separate resident contact or a richer incident-detail composition. Assess which operational fields responders are permitted and need to see; reuse safe existing report data without expanding permissions or copying admin controls.
- Empty state says assignments will appear but provides little team/readiness context. Missing-team state tells the user to ask an administrator without an actionable support destination. Do not invent support contacts.

## Recommended product structure

Build a focused responder workspace within existing team permissions:
1. Compact overview: actual team identity, connection/access state, unacknowledged and in-progress counts from trustworthy data, and a prominent next assignment. Keep stats subordinate to action.
2. Assignments: compact identifiable list, Active/Recently closed navigation, search/status controls and bounded history. Opening an assignment goes to a stable detail destination.
3. Assignment detail: clear incident reference/type/priority/status, location/map and directions, permitted contact/evidence, Acknowledge and Post update, with Overview/Progress sections that do not create an endlessly growing list card. Preserve idempotency, uncertain drafts, receipt checks and access-change clearing.
4. Team map: only currently authorized team assignments and HQ, with matching map legends and a selected-incident detail. This would need an explicit responder-safe route/component, not access to the admin-wide map.
5. Team context can be a compact panel/profile section initially; a new sidebar destination is only justified if it serves real tasks. Keep profile and bell in the header. Do not add general analytics, user management or fake shift/availability controls to fill space.

Fix silent/incomplete/error states and active deep linking before visual expansion. Then build the assignment detail and compact list, followed by the team map. Review390/1440 with empty, many, long, partial-error and disconnected fixtures. This audit does not authorize implementation, commit or deployment.
