> Implementation update: M1, V1 and M2 are now addressed. See [the completed-fixes handoff](../visual-motion-fixes-2026-10-18/HANDOFF.md) for current verification and limits. The audit below is the original finding record.

# Visual and normal-motion audit — October 18, 2026

## Result

Not ready for visual sign-off: validation motion briefly makes text collide. Two further polish findings concern the rendered type scale and exit easing. These are findings, not implemented fixes. Product source was not changed in this audit. No commit, push or deployment.

## Design language

- Audited surface: Rescue Reports React web application, public, resident, dispatcher, DMO, responder and Admin surface families. Flutter and the video-authoring project are outside this pass.
- Design sources: current `DESIGN.md`, resolved web styles, imported page compositions and installed Review Animations standards.
- Documented decisions: Geist Variable, violet/deep-indigo, reading surfaces in paper/white, 13px metadata, 15–16px body, compact resident tasks, dense staff workspaces. Meaningful normal motion remains part of the approved product.
- Governing owners and consumers: App → ProductMotion and routed layouts; Landing → PublicHeader/LandingFilm and landing styles; ResidentLayout → NotificationBell; access forms → MotionForm/FieldError. Current runtime paths and selectors were checked.
- Explicit exceptions: DESIGN.md explicitly permits 280–320ms route movement, 300ms notification entry/160ms exit, capped five-row stagger and a longer explanatory public sequence. Therefore those durations are not defects simply because generic motion guidance prefers shorter UI durations. No documented exception was found for 11px timestamps or 12px notification actions. Tiny text within decorative, aria-hidden product miniatures is excluded from the type finding.

## Findings

| # | Problem | Evidence | Proposed change | Scope | Confidence |
| --- | --- | --- | --- | --- | --- |
| V1 | Real controls and metadata fall below the documented type scale. The bell has 11px timestamps and 12px actions/unread text. Film chapter controls use 12px labels/11px numbers; the small-screen feature promise is 12px. | DESIGN.md Typography sets metadata at 13px and controls at body hierarchy. `craft-probes.json` confirms resolved sizes at 390/1440. Owners: `web/src/features/resident/notifications.css:9`, `:22`, `:24`; `web/src/pages/landing.css:164`, `:166`, `:180`, and `:126`. Viewed `notification-390-type.png`, normal landing captures and section captures. | Bring these real secondary labels/metadata to the existing 13px metadata scale; retain 14px notification titles and readable chapter wrapping. Do not enlarge every decorative scene label or globally flatten the hierarchy. | Public landing and bell on all resident routes. | High |

## Improve first

For pure static presentation, correct V1 first: it is a measured drift from the existing type hierarchy, not a request for a new aesthetic. Across the combined review, M1 below has priority because the moving error text actually collides with nearby controls.

## Motion findings

| Before | After | Why |
| --- | --- | --- |
| **M1 — high:** `web/src/components/MotionForm.tsx:16–31` animates existing direct form children from previous positions, while newly inserted errors already occupy their final layout positions. Registration labels/button intersect those errors during entry. | Prevent validation error insertion/removal from applying the per-child inverse translations that cross the new error text. Keep immediate validation/focus, fully opaque field errors and their local 220ms feedback animation. Preserve unrelated route, bell and film motion. | `validation-frames.json` reproduces this at 390/1440 in Chromium and WebKit: up to 20.14px vertical intersection, observed during roughly the first 51–95ms of the tested transitions. `Chromium-390-register-errors-enter.png` shows password error colliding with Confirm password and the submit button meeting the final error. Settled frames have no overlap. This violates the design's immediate legible validation intent; a settled screenshot or passing unit test misses it. |
| **M2 — medium:** the bell exit uses `160ms ease-in` at `web/src/components/product-motion.css:45`. Dialog/overlay/select close rules at lines 77/79/81 use the same slow-start pattern. | Keep the documented exit durations and replace UI exit easing with the already-used `cubic-bezier(.16,1,.3,1)` response curve. | Bell exit keyframes resolve to ease-in in all four engine/width combinations; see `interactions-ready.json`. Review Animations explicitly flags ease-in for UI because the first watched part responds slowly. Dialog/select rules are source-confirmed affected owners; their exits were not freshly exercised successfully in this pass. |

### Verdict

**Feel-breaking regressions:** M1 blocks visual approval. Validation feedback is semantically correct and settles correctly, but is visually muddled during the transition. Inspect insertion and removal again after the correction, including rapid resubmit. Avoid turning this into a static product-wide motion reset.

**Interruptibility & timing:** M2 remains a polish correction. Bell Escape→Enter during exit was exercised and left one open panel with focus inside. Five-row stagger still runs. No stuck panel was found.

**Approve / block decision: Block visual-motion sign-off pending M1 and M2.** This is not a claim of functional auth failure or production risk.

## What passed and what was actually inspected

- `surfaces.json`: 46 normal-motion Chromium captures, all 18 route surfaces at 390 and 1440px, plus actual dispatcher/DMO/responder role variants. All records confirm normal-motion media. All settle, with zero document overflow, axe violations or uncaught exceptions. These are supplementary checks, not proof that aesthetics are complete.
- All 18 main compositions were visually inspected through overview/contact sheets; below-fold portions were reviewed in `belowfold-*.png`. The lower landing sections were also scrolled and captured in-browser in `landing-*-lower-*.png`. This distinguishes the layout overview from an individual full-resolution inspection of every text row.
- `interactions-ready.json`: 40 checkpoints in Chromium/WebKit at 390/1440. Register error entry, settled state and clearing; login validation; bell entry/open/exit/reopen; and route forward/back. Videos under `videos/` record these walkthroughs. Screenshots and in-page timings/frames were used for inspection; the video files were not watched end to end.
- Destination readiness was checked before the final navigation samples: forward moves the resident workspace from +10px; Back from −10px. Navigation remains outside that transform. An earlier probe sampled the old page before the destination rendered; `interactions-ready.json` supersedes `interactions.json` for route conclusions.
- `validation-frames.json`: four requestAnimationFrame sampling runs confirm temporary error/control intersections. This measures element rectangles, not text glyph ink; the visible screenshot corroborates the collision. No collision remains after settling.
- `craft-probes.json`: resolved typography, normal playback configuration, lower landing captures and pointer media. The film was muted/inline and paused when scrolled out of view. This is not an exhaustive autoplay, seek or media-failure audit.
- Primary motion easing and durations were read from actual animation keyframes. CSS animation `effect.getTiming().easing` can be linear while keyframe easing contains the CSS curve; it was not treated as a finding.

## Page ledger

| Page | Visual/motion result in this pass |
| --- | --- |
| `/` | Opening and all lower sections inspected. Established indigo header, editorial hero, workflow, resident sample, role list, questions/access/footer are coherent. V1 remains in real film controls/secondary labels. Normal reveal activity recorded; no new film design or complete playback-failure matrix. |
| `/login` | Desktop split and phone form-first composition hold. Local error movement present. Shared MotionForm needs M1 consumer verification after correction; no claim of a separately measured login collision. |
| `/register` | Form and explanatory panel compose correctly when settled. **M1 reproduced in both engines and widths.** Required stars and icon errors remain clear after settling. |
| `/forbidden` | Single recovery panel and hierarchy hold; route arrival recorded. Signed-out visual state reviewed. |
| Missing address | Recovery panel remains composed; route arrival recorded. |
| `/dashboard` | Staff rail, metrics, inbox and selected report retain hierarchy. Phone preview stacks below inbox. Actual dispatcher variant reviewed. Data refresh/selection motion not exhaustively retested. |
| `/map` | Filter/legend/map composition holds. Map provider zoom/pan animation and GPU cost not freshly profiled. |
| `/monitor` | DMO/read-only variant reviewed; map and filters compose consistently with staff map. Same library-motion limits. |
| `/teams` | Summary, search, availability and complete list inspected. Normal entry recorded; inline editing choreography not exhaustively exercised. |
| `/users` | Search/filter and full account list inspected. No new demonstrated layout defect; creation/action feedback beyond normal state not covered here. |
| `/analytics` | Summary, filters, charts and table alternatives inspected through lower sections. Chart animation itself not separately timed. |
| `/audit` | Filters, readable table and contained scrolling hold. Lookup-recovery states rely on previous audit evidence; new normal-motion surface inspected. |
| `/assignments` | Admin no-team state and actual responder populated assignment inspected. Posting-update dialog flow not freshly completed. |
| `/admin` | Account workspace plus closed Teams, health/settings and audit/export sections inspected. **Closed sections are not evidence of fully audited open interiors.** Previous state audit remains relevant; those expanded section/mutation animations remain open. |
| `/incidents/:id` | Staff/DMO populated incident compositions inspected. Attempted assign-dialog probe found no Assign team action on the current fixture, so no fresh dialog-exit pass is claimed. |
| `/my` | List/map and phone stacking hold. V1/M2 affect its bell. |
| `/my/report` | Category, description, location, evidence, contact and submission regions inspected; route movement confirmed. Validation/removal choreography must be included in M1's shared-consumer verification. |
| `/my/reports/:id` | Detail/evidence/activity composition and phone stacking inspected. V1/M2 affect bell. No new live-update transition simulation in this pass. |

## Boundaries and continuation

Normal-motion testing only, as Airen requested. No reduced-motion test run or changes to preference behavior. No physical devices, Flutter, full Firefox pass, frame-time/GPU trace, complete dialog/menu/select matrix or every loading/error/live-refresh state audited here. Existing real-upload, transport and management persistence gaps are not closed by this review.

Audit only: product source, design system files and root handoffs were left unchanged. Only this `design-plans/` folder was written. The Improve UI skill explicitly states “Never modify product source” and “Write plans only for changes the user selects”; therefore this artifact records findings/recommended corrections rather than implementing them or claiming an approved implementation plan. No new build/unit-test run was necessary for these documentation/browser-evidence changes; the previous 376-test result remains historical evidence.

Local emulator accounts only; Firebase project/emulator assertion was checked before authentication. API mutations after sign-in were blocked in the audit scripts; registration error checks never created an account. The separate Flutter/live process at 127.0.0.1:5174 and production were not used. Current source is an uncommitted shared working tree based on commit effd53f9a6239154604ff48cec05214b1b27f098; preserve unrelated changes.
