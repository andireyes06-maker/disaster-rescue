# I-Report web visual re-audit — 27 October 2026

## Verdict

The web application remains visually underdesigned. The previous refinement improved density and control hierarchy. It did not give the whole product a strong visual language. Purple navigation and buttons surround a largely neutral workspace; many pages use the same heading, description and white container regardless of their job. The landing video has more character than the product around it.

This is a design judgment grounded in rendered pages, not a claim that a white interface is inherently wrong. Operational screens need calm reading surfaces. The issue is the weak relationship between color, content, emphasis and task.

## Scope and source identity

- Worktree: /Users/rien/Documents/FINAL_PROJECT/app. Local fictional emulator stack at localhost:5407; no production records were used.
- Started from d643018. Another session advanced HEAD to a0fd159 and edited LoginPage.tsx while the audit ran. Changed report/analytics/login surfaces received supplemental captures. Record both the initial and later evidence; do not treat the screenshot set as one immutable release certificate.
- Base pass: 50 desktop/phone captures over 25 role/route/state combinations, including aliases, missing states and an obsolete route. Ten additional targeted source-change rechecks and overlay captures are stored separately.
- Browser: Chromium, 1440×1000 and 390×1000. The base captures reported no page-level horizontal overflow. This is a visual review, not a fresh functional, security, accessibility or performance certification.
- Public, administrator and responder sessions were isolated. The health-error example is browser-mocked; empty account results use search. No production data or product source was changed.
- A populated, authorized closed-responder detail was source-reviewed rather than rendered: the seeded Team Alpha user has no owned closed report. The other-team refusal view was rendered. Holding/loading states were source-reviewed, not recreated through a complete browser failure matrix.
- The long-running local API was not restarted during concurrent work. The location aggregation contract changed during this review, so a newly empty location chart cannot be attributed to product logic from this environment alone.

## What makes it feel plain

1. **Color mostly frames the work.** The rail, primary buttons, badges and video carry the identity. Most work surfaces remain white or pale neutral. Screenshot sampling of the main desktop workspace, excluding the rail/account bar, found roughly 85.7% light/low-saturation pixels on Dashboard and 92–96% on Analytics, Audit, Teams, Users and Admin. The map is a clear exception. These figures describe the screenshots; they are not a usability score or a target color quota.
2. **The same visual grammar repeats.** Page title → helper sentence → numbers → search/filter block → white rows. This is consistent, but it gives little sense of a report, a team, an account or a service being different objects.
3. **Too much explanation is carried by prose.** Location is often a name or field; progress is a list of labels; team availability is a badge inside another text row. Real maps, evidence and task-specific visual structure could communicate part of that information faster.
4. **The graphic identity is isolated.** The pin logo and film are recognizable. Their sense of connected location and response does not meaningfully carry into ordinary workspaces.
5. **Animation exists but is mostly generic.** Movement cannot compensate for repeated compositions. Pages settle into similar layouts after the same entrance.

## Concrete finishing defects to address first

### P1 — Change-password dialog placement and form consistency

The desktop dialog renders at the top-left of the viewport rather than centered, covering the navigation. See evidence/change-password-dialog-1440.png. product.css sets width/padding/radius but provides no centering margin; the global reset removes native margins. Its three required fields do not display the established required asterisks. Its error markup also differs from the shared field-error components and uses a status paragraph. Source review shows the save button becomes disabled during submission, unlike the focus-preserving busy-control convention elsewhere.

Fix: use the shared dialog/form conventions, center the dialog, fit it within the viewport, restore required markers and consistent validation/error feedback. Verify actual focus, close/restore behavior and the busy state. This review did not submit a password change.

### P1 — Public-header wordmark contrast

The Report portion of the public wordmark computes to #6D28D9 against #241747, approximately 2.29:1. The I- portion remains white. This makes the name look weak on the dark header. See evidence/brand-contrast.json.

Fix: use the approved light-on-dark logo/wordmark treatment consistently. Preserve the actual logo rather than drawing a replacement. This is a specific measured contrast observation, not a whole-site WCAG verdict.

### P1 — Mobile-app handoff lacks the handoff action

/register, /my, /my/report and /my/reports/:id intentionally render MobileAppNotice. The card explains that residents need the app but offers Sign in and Back to home, with no app download action. A resident is directed toward staff sign-in instead of the stated next step.

Fix: provide the actual configured Android download or installation instructions, and a truthful iOS availability message. Never manufacture store links. The local landing shows Coming soon badges because of this build's download configuration; that does not establish the deployed website's store/APK configuration.

### P1 — Login recovery changed during this audit

An edit made by another session during this review removed the visible recovery section and Forgot password button; its recovery test file was also staged for deletion at that time. Existing recovery handler/state code remained in that inspected version. The initial screenshot contains the section; the final rendered rechecks confirm that the button is absent at both 1440px and 390px. The edit’s commit status changed during the review, so inspect the current tree before deciding what to restore.

Fix/review: resolve the intended account-recovery path before visual approval. Do not silently restore or delete concurrent work. A signed-in Change password action does not serve a person who cannot sign in.

## Page-by-page visual work

| Surface | Observed design problem | Recommended treatment |
|---|---|---|
| Landing / | The dark film is the strongest element; the rest is mostly text sections with small icons and a simplified phone sample. The page repeats explanations of the same workflow. | Establish a stronger full-page composition: deliberate dark/light section rhythm, fewer repeated paragraphs, actual approved app captures, and a visual report-to-response sequence. Preserve safety copy and the film's controls. |
| Landing lower sections | Workflow, role explanation, FAQ and access blocks have nearly the same weight. The sample phone feels less convincing than the actual app. | Give one section the main product evidence, one the process and one the access action. Use authentic product assets and keep fictional-data disclosures clear. |
| /login | Functional form plus a plain explanatory block; long unused canvas at desktop; recovery is now a separate unresolved change. | A compact branded sign-in workspace with a stronger brand panel, concise role guidance, visible recovery and consistent error/field treatments. |
| /register | This is an app handoff, not a registration form. Tiny centered text card across a large blank canvas. | A proper install/handoff composition with the current app image, platform availability and a direct configured action. |
| /my, /my/report, /my/reports/:id | Same MobileAppNotice aliases. They are not unfinished resident dashboards waiting to be rebuilt. | Use the improved handoff consistently; preserve mobile-only resident scope. |
| /dashboard | The new density is useful, but selected-report, summary and inbox still have limited visual differentiation. Many details require reading a label. | Give the selected incident a purposeful geographic/evidence anchor and a clearer current-stage treatment. Use meaningful status/category colors; preserve FIFO, selection and filters. |
| /incidents/:id — submitted | Photo evidence and progress steps help, yet the page still reads as a form record with a separate action card. | Compose location, evidence, report identity and current action as a coherent incident workspace. Keep validation/rejection distinct and safe. Use an actual map for coordinates, never a fabricated place. |
| /incidents/:id — active | Large neutral fact and progress blocks; map context still separated from the task. | Stronger current-state header, compact incident facts, a meaningful map/evidence area, and a timeline whose current/completed stages are distinguishable. Preserve existing history/permission behavior. |
| Missing incident | A small text recovery message inside a largely empty workspace. | A purposeful missing-record state with a branded location/record cue and one clear recovery action. No decorative disaster photography. |
| /map | Strongest non-text workspace because it shows the actual location context. Controls and legend feel attached to a generic page. | Design the filter/legend/selection system as one map workspace. Keep the geographic information dominant and severity readable. |
| /analytics | Repeated purple bars and white chart panels; categories, status and priority appear too similar. Tables under every chart make the page long. | Apply consistent type/status/priority colors, keep chronological charts visually distinct, and use deliberate grouping. Retain accessible data tables and full labels; a disclosure can reduce visual repetition without deleting access. Current location aggregation needs a matched API before final approval. |
| /audit | Almost entirely a text table, which is appropriate for a log but visually undifferentiated. | Improve event grouping, action/type markers, timestamp hierarchy and before/after treatment. Keep scan density and exact audit facts. A photo or decorative chart would add little here. |
| /teams | Compact controls are fixed, but the roster is still mostly names, sentences and badges. | Make availability, crew composition and headquarters legible at a glance. Use actual initials or meaningful crew symbols, not empty avatar blocks. Keep editing actions secondary and compact. |
| /users | Cleaner than before but still a long, visually repetitive directory. Role and access state do not have a strong hierarchy. | Use consistent identity initials, clearer role/status treatment and restrained grouping. Keep account actions explicit; do not make deactivation the dominant visual element. |
| /admin | Useful separation of settings and roles; destination links plus generic white forms still feel assembled. | Give service availability and resident guidance distinct sections with purposeful typography and restrained tinted surfaces. Keep access-role editing separate from Users membership tasks. |
| /assignments | A one-item navigation rail and a sparse text-heavy assignment card leave a large amount of empty desktop space. | Use a field-work composition: incident location, current stage, next action and progress together. Adapt navigation density to this smaller role without changing permissions. |
| /assignments/:id — closed | Authorized populated view source-reviewed only. The implementation is a plain read-only report/fact/history card. The active report URL redirects to the assignment list as designed. | A clear closed-state header, location summary and compact read-only timeline, with no operational actions. Render an owned populated fixture before approving its redesign. |
| /forbidden and wildcard 404 | Same small centered-card treatment, extensive blank space, little visual distinction between causes. | Branded recovery states with distinct icons and clear next steps. Preserve role-appropriate recovery and sign-out behavior. |
| Notifications | Existing bell/panel animation works; empty panel repeats text and has little relationship to the rest of the visual language. | Refine the panel header, notification grouping and meaningful empty illustration/shape language. Keep the bell rather than restoring a long dashboard section. |
| Shared account strip | Change password and Sign out sit at similar emphasis beside the bell; phones spend multiple rows on account controls. | A coherent account menu can reduce competition and recover vertical space while preserving keyboard access. |
| Search-empty and service-error states | Search-empty and mocked health failure are understandable but visually generic. | Use consistent state compositions with clear recovery, relevant iconography and different error/info emphasis. Do not add movement that delays recovery. |

### Removed route

/monitor is no longer in App.tsx or the admin navigation and resolves to the wildcard not-found view. Do not count it as an unfinished active page or reintroduce its old role without a new product decision.

## Motion finding

Normal-motion Chromium samples confirm a playing, muted I-Report hero video; a 320ms workspace route animation; and a 300ms notification opening animation. Source contains feedback, dialog, badge and hover treatments. The application is not motionless.

What is missing is specificity: chart construction and meaningful data changes have little authored emphasis, page entrances are similar, and larger sections often reveal as a whole. Improve selected-report changes, panel continuity, current-stage feedback and carefully paced public storytelling. Idle operational screens should settle; motion on every element would make scanning harder. No frame trace or physical-device performance measurement was taken here.

## Color direction to implement

Keep the existing I-Report violet and harbor identity. Give the palette clear jobs:

- Harbor #241747: navigation, strong public storytelling sections and selected high-level framing.
- Violet #6D28D9: primary actions, selection and brand emphasis.
- Flood blue, fire orange, earthquake violet and landslide ochre: consistent incident-category cues across maps, charts and reports.
- Green: validated/completed/success states. Amber: pending/attention. Red: critical severity, rejection or destructive actions as appropriate, always with text/icons.
- Light lavender and restrained blue/green tints: differentiate related reading surfaces. Use them purposefully rather than tinting every card.

The goal is not to eliminate white or fill pages with random colors. Each page should have a visual anchor related to its task, clear emphasis, and a recognizable relationship to I-Report.

## Implementation order

1. Fix the dialog, dark-header wordmark, app handoff and recovery-path decisions.
2. Define semantic surface/status/chart tokens and shared state/dialog/account-menu patterns. Preserve current compact desktop controls and phone targets.
3. Redesign Dashboard plus one incident detail as the reference operational pair. Verify populated, empty, error and long-content states.
4. Apply the reference system to Teams, Users, Admin and rescuer workspaces; make Audit and Analytics appropriate to their information rather than forcing the same card template everywhere.
5. Recompose the landing and login around actual product assets and a clear download/access path.
6. Verify all affected route families in the browser, including the owned closed-responder view, before calling the visual work complete.

## What this audit did not do

No product code, dependencies, credentials or production settings were changed. No commit, push or deployment was performed. No full test suite, site-wide axe/contrast scan, Safari/Firefox, screen-reader, physical-device or release gate was rerun. Existing functional evidence is separate from this visual judgment.

See evidence/ for captures, source/scope notes, color sampling, motion observations and the supplemental source-change rechecks.
