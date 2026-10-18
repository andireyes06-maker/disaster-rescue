# Motion and loading audit

Read-only source review of FINAL_PROJECT current HEAD e9c6426. No product code changed. Guides read: improve-animations/AUDIT.md; project-standards/08-animation-and-motion.md and 09-motion-pattern-catalog.md. Runtime consumer tracing and installed dependency source were inspected. Browser verification is delegated to the primary audit; claims below distinguish source-confirmed behavior from profiling.

## M1 · P2 · Reached dialog zoom does not honor reduced motion

- Evidence: `web/src/components/ui/dialog.tsx:65` uses data-open zoom-in-95 / data-closed zoom-out-95 without motion-reduce handling. `styles.css:4` imports shadcn/tailwind.css, whose `dist/tailwind.css:28–40` maps data-open/closed to Radix data-state. Compiled CSS in `/tmp/rescue-predeploy-web-build/assets/index-D8c84pBz.css` confirms this mapping. The imported package's reduced-motion rules only target shimmer, not dialogs. The parent browser audit confirmed animationName=enter in both normal and reduced motion; capture duration and --tw-enter-scale alongside that result to complete evidence.
- Reached by `features/reports/AssignTeamDialog.tsx:11` and `features/reports/IncidentDetails.tsx:10`, including assignment, rejection and photo viewer. The shared dialog's Button close consumer is reached too.
- Effect: users requesting reduced motion receive the same dialog scale entrance. This violates the project's explicit motion fallback. No measured animation performance defect is claimed.
- Fix: add motion-reduce opacity-only or immediate fallback, applying recorded motion tokens with explicit ease-out. Preserve Radix focus/presence. The assignment dialog is conditionally mounted by its parent, so retaining exit presence requires checking that owner too. Do not add another animation library or change currently valid state selectors.
- Verify: inspect computed animationName on opened/closed overlay/content; normal and reduced motion; rapid close/open; Escape and focus return; no persistent overlay. Preserve instant repeated incident selection and existing non-animated charts/map bounds.

Correction: an initial source hypothesis claimed data-open did not match Radix. Imported shadcn custom variants and browser evidence disproved it; it is withdrawn and is not a finding.

## M2 · P2 · Resident loading states are either blank or falsely empty

- Evidence: `web/src/features/resident/ResidentDashboard.tsx:35` correctly suppresses report empty text during loading but renders no loading content at all. `:54` shows “No notifications yet” immediately because `useMyNotifications.ts:17–18` exposes no loading state and starts with an empty array. Neither listener snapshot has to have arrived.
- Reached by `/my` at `web/src/App.tsx:30`.
- Effect: delayed initial report data leaves an unexplained empty card; notification empty text asserts a result before the read succeeds. This is a state bug, not a requirement that every request shimmer.
- Fix: model first-snapshot pending/success/error in notifications; render a sized, accessible loading placeholder for both cards and show empty only after successful empty results. Use a single status announcement, decorative skeletons aria-hidden, static skeleton under reduced motion. Preserve meaningful cached data on a reconnect with a stale/refresh indicator.
- Verify: delay report and notification callbacks independently; assert pending instead of empty, then populate/empty/error; retry recovers; no repeated screen-reader announcements during background snapshots.

## M3 · P1 · Resident report detail masks read failures as absent data

- Evidence: `web/src/features/resident/ResidentReportDetail.tsx:17` discards `useMyReports.error`; `:26` therefore renders “We could not find this report” after a failed first report snapshot. `:18` discards `useReportUpdates.error`; `:69` renders “No updates yet” while the history is initially unresolved or after its listener error clears entries. The hooks expose errors (`useMyReports.ts:37`, `useReport.ts:101`). History hook has no loading flag at all (`useReport.ts:75–106`).
- Reached by `/my/reports/:id` at `web/src/App.tsx:32`; update hook also reaches incident preview/full details, which currently handle error but not first history loading.
- Effect: connection/permission failures misrepresent an existing emergency report/history as missing/empty. No recovery action appears in the resident detail.
- Fix: explicitly consume report/history loading, error and retry; render “not found” only after a successful report read. Add initial loading to the update hook, preserve valid entries during recoverable retries where appropriate, and show an actionable history error instead of “No updates.”
- Verify: report first snapshot failure and retry; history permission/network failure; initial delayed and successfully empty history; existing report retained on reconnect; unmounted/switched report listeners cannot overwrite the new view.

## M4 · P2 · Predictable large regions have no loading layout reservation

- Evidence: `web/src/features/analytics/AnalyticsPage.tsx:89` replaces the entire three-chart region with one short paragraph whenever filters change, then remounts `:97–102`; `ChartCard.tsx:26–29` reserves at least 240px per chart plus data tables only after data arrives. `features/map/IncidentMap.tsx:92` replaces the whole map with a paragraph; loaded `.incident-map` has min-height360px (`styles.css`, incident-map declaration). `features/resident/PublicIncidentMap.tsx:43` similarly replaces a 320px map (`:60`) with one paragraph.
- Reached via `/analytics`, `/map`, and resident `/my`. This is deterministic source-level layout replacement; a numerical CLS score was not measured.
- Effect: predictable reading regions collapse and expand during slow initial loads and analytics filtering. Skeletons requested by Airen do not exist in web/src at this revision.
- Fix: reserve the map/chart frame and introduce scoped skeletons for initial reads. For filter refresh preserve clearly marked previous charts or a same-sized placeholder; do not label stale values as the new filter result. Keep filter controls stable and accessible, aria-busy on the data region, one text status. No fake completion delays, no forced animation; reduced-motion skeleton must be static.
- Verify: delay each endpoint/listener in local browser; compare frame positions during pending/success/error/filter refresh on desktop/phone; check reduced motion and tab/focus retention. Measure layout shifts before making a CLS-performance claim.

## M5 · P3 · Reached Button primitive has an unrestricted transition and motion on keyboard press

- Evidence: `web/src/components/ui/button.tsx:7` has transition-all and active translate-y-px; no motion-reduce variant. `.btn` no-preference rule at `styles.css:126–127` does not target this Button primitive.
- Reached via `components/ui/dialog.tsx:7,73` for the photo/rejection close control. Avoid treating unused generic select/table/input primitives as reached defects.
- Fix: explicitly transition only intended visual feedback, keep focus immediate, restrict pointer movement to fine pointer if retained, and disable movement under reduced motion. Reuse shared feedback tokens instead of introducing another motion owner.
- Verify: close-button press with pointer and Space/Enter, reduced motion, high contrast/focus; computed transition-property should not be all. No measured frame-drop claim is made.

## Additional recovery issue passed to main audit

`AssignTeamDialog.tsx:116–120` hides its built-in close button and blocks outside interaction; failed GET /teams renders only the error banner at :125, and the manual Close button at :129 appears only for successful zero-free-team responses. Consequently load failure (and loading) has no visible touch close action. Add unconditional visible Cancel/Close and retry on failure. Test rejected and never-resolving team request, touch close and keyboard Escape.

## Positive findings and limits

- `.btn` and nav background transitions are already gated behind no-preference, charts explicitly disable animation, and automatic map fitBounds is deliberately animate:false. No idle looping animation, requestAnimationFrame loop, scroll hijack, scale(0), or reached layout-keyframe animation was found in source.
- Most staff views distinguish loading/error/empty and expose retries. Resident sign-up, login and report submission have actual pending button labels. Many other mutation forms only disable buttons without a pending label; add readable busy feedback as part of the shared consistency pass, but do not claim those operations lack duplicate prevention without separately verifying event behavior.
- No physical-device rendering, browser performance trace, screen-reader session, or mobile Flutter audit performed by this sub-audit. Source findings are not proof of measured animation jank.
