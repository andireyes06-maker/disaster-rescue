# I-Report responder extension — design notes

October 28, 2026. Scoped post-build documentation under Impeccable's documenter workflow. This is an ordinary Operate extension of the incumbent purple/harbor system. It does not establish a new visual world or replace the normative system files. PRODUCT.md, DESIGN.md and .impeccable/design.json were read and preserved. Only this file was written by this pass; no product source, commits or deployments were changed.

## Overview

The implemented responder workspace separates finding work, reading an incident and understanding team locations. The existing Assignments landing remains, with Overview and Team map added to the shared role-scoped shell. Current source and the approved IMPLEMENTATION-PLAN.md govern this extension; AUDIT.md supplies the original findings, not a description of the finished interface.

Evidence checked directly: responder-workspace.css; theme/tokens.css; shared styles.css and product.css; AppShell; AssignmentsPage; ResponderOverview; TeamMap; AssignmentMap; ClosedReportDetail; TeamIdentity; TeamSummary; ConnectionStatus. Visual review covered all twelve implementation-evidence/viewport-{overview,assignments,closed,map,detail,history}-{1440,390}.png captures, totals-error.png, totals-recovered.png and cached-detail-1440.png. These are synthetic local fixtures, not operational incidents.

The inherited civic-service character remains: harbor navigation, readable light workspaces, violet actions, restrained rounded panels and distinct incident/status meaning. The final independent review disposition supplied to this pass is ship for the scored cached-data disclosure fix after broader visual review. It is a bounded disposition, not whole-project or device certification. The launcher/detector could not run (permission denied, exit 126); no detector approval is claimed.

## Colors

Incumbent tokens remain the reference: action violet (#6D28D9), harbor (#241747), paper (#F5F6FA), white surface (#FFFFFF), ink (#211D35), muted (#625E73), critical (#B42318) and high (#8A5100). The new workspace visually fits that palette. White lists use fine lilac separators, soft purple selected controls and dark purple headings. Primary operations reuse the shared violet button; secondary navigation and recovery use the shared outlined/ghost control.

Responder CSS contains local purple-gray literals and pale selected surfaces rather than exclusively referencing tokens. Those are observed implementation details, not new global primitives. Priority and status remain named in text with supporting icons/shapes; map incident icons identify type, priority uses colored shapes, and status is read from the list. The legend describes the same marker system.

## Typography

The extension inherits self-hosted Geist Variable, the shared body setting (15px/1.55) and the existing compact operational hierarchy. Local roles observed in CSS are team identity (17px), welcome heading (25px, 22px on phones), section heading (18px), assignment reference/title emphasis (16px), descriptions (14px), metadata/labels (13px) and type/time qualifiers (12px). The detail title is 22px. Totals use 24px, weight 650 and tabular numerals; references and times also use tabular numerals.

Hierarchy comes from size, weight, spacing and alignment. No new display family or campaign-style typographic system was introduced. The local type/category labels describe real incident data; they are not invented decorative kickers to propagate across future surfaces.

## Layout

At 1440px the incumbent harbor rail and account bar surround a light workspace. The rail now has three useful responder destinations. Overview shows actual team identity/HQ, a short welcome and team-map link, up to three current assignments in oldest-reported order, then recorded all-time totals. Operational rows take precedence over totals.

Assignments uses one bounded panel: Active assignments/Recently closed switches, labeled search and status controls, then aligned linked rows. Rows carry incident type, reference, short description, place, priority/status and time. They lead to stable /assignments/:id details rather than repeating operation forms and histories inside the list. Recently closed explicitly states its up-to-ten scope. Loaded windows and ordering are visible rather than presented as comprehensive totals.

Desktop rows use five grid tracks. At 1200px they reflow into three tracks with place/time repositioned. At 640px they become a stacked record with a separate arrow track; filters stack and controls reach at least 44px. Totals become two columns. Workspace gaps reduce from 22px to 18px, and panel/row padding tightens. The shell changes to its existing Menu treatment and account row on phones. The 390px viewport captures show wrapped text, retained labels and contained panels; a11y.json reports no horizontal overflow across the twelve checked views.

Active detail separates Incident brief and Progress history with pressed-state buttons. The incident brief gives actions their own band above situation/contact and the location map; the two fact columns stack at 1000px. Resident photos are an optional disclosure. Closed detail visibly says read only and keeps history distinct from mutation controls. History is bounded with an internal maximum height (440px), rather than growing every list row.

Team map occupies its own panel, followed by an explicit list alternative that includes reports without valid pins. It fits actual authorized assignment/HQ locations; it invents no default incident pin. Canvas height is 360px on desktop and 320px on phones; active-detail maps use 280px, reducing to 250px on phones. Dense synthetic map fixtures visibly overlap markers; the list alternative remains essential and the overlap is not a recommended composition rule.

## Elevation & Depth

Routine responder panels are flat white surfaces with subtle borders and separators. Hierarchy comes from harbor/paper/white layering and spacing, consistent with the incumbent flat workspace controls. Maps retain their own isolated stacking context. No new shadow vocabulary is introduced.

## Shapes

Shared buttons and fields retain the incumbent control language, including 10px shared control corners and 16px shared cards. Local responder list/map/totals panels use 14px corners; selected section buttons and evidence thumbnails use 8px; map canvases use 10px. These are scoped observations, not a root-system radius revision. Linked rows remain separated records inside one panel rather than separately rounded cards.

## Components

Navigation preserves profile and bell in the account header; profile already exposes Change password. Overview, Assignments and Team map stay inside responder authorization. Assignment notification links resolve to a stable detail target. Selection on Team map focuses the selected assignment region and offers Open assignment and Directions; unavailable coordinates remain accessible through the list.

State semantics are part of the interface. Team identity has loading/failure/retry copy. Assignment loading, empty, partial and error states are distinct; partial reads retain available work and disclose incompleteness. Team activity labels all-time recorded totals, exposes loading and retry, and identifies previously loaded totals when refresh fails. totals-error.png and totals-recovered.png show the retained panel and successful recovery. Empty/error values are not silently rendered as zero activity.

ConnectionNotice is rendered on stable detail as well as list/map surfaces. cached-detail.json records navigatorOnline=true, savedWarningVisible=true and updateButton=true; cached-detail-1440.png visibly warns that saved information may be stale while connection is confirmed. Thus the resolved regression is cache disclosure, not a claim that the browser was offline or all cached controls were removed. Server authorization and operation checks remain authoritative.

Acknowledgement/update controls reuse the existing operation flow and busy/disabled semantics. Closed records render no acknowledgement or update form. Access-scoped drafts distinguish a never-submitted draft from an attempted update with an unconfirmed receipt; checking a saved receipt does not resend it. Contact/photos use data already on the authorized report. Missing contact is explicitly labeled rather than fabricated.

Purposeful motion remains bounded: shared route entry, control feedback and selected-map feedback orient the user without moving navigation or replaying list entrances on live refresh. The local selected-map panel translates 5px over 200ms and disables that animation for reduced motion. Rows change background over 160ms on capable hover devices. Shared button pending feedback and reduced-motion behavior are retained. a11y.json records a 320ms shell main route animation and a 3px solid keyboard focus outline; source supplies a 3px inset focus treatment on linked assignment rows. Static screenshots alone do not prove timing or reduced-motion behavior.

Native evidence is supplementary and bounded. The camera/gallery delta uses existing outlined controls: Take photo and Choose existing photos feed the same attachment list. The four mobile-goldens before/after images were inspected. The older before-report-review.png is actually a Details validation failure; it is not a valid Review-stage comparison. The corrected after-report-review.png reaches Step 4 with required photo and contact supplied. flutter-tests.txt records 278 passing tests and flutter-analyze.txt records no issues. Parent verification reports nine shared Profile → Change password tests across both roles; that feature already existed. Real camera and password behavior on a physical device remains unverified. No Android emulator was requested or used for this documentation pass; the temporary owned emulator was stopped per the handoff.

## Do's and Don'ts

- Do extend the existing purple/harbor, Geist and shared-control language within authorized responder tasks.
- Do preserve stable details, truthful query windows, explicit incomplete/cache/error states, visible focus and a map list alternative.
- Do keep motion tied to navigation, selection and feedback, with reduced-motion handling; do not make live refresh replay a page entrance.
- Do preserve authorization, pending guards, idempotency, draft uncertainty and terminal read-only semantics when reusing these components.
- Do not read zero automated violations as accessibility certification. a11y.json reports twelve cases with no listed violations, no overflow and no captured errors; that is the extent of this evidence.
- Do not treat synthetic dates, dense marker placement, missing contact fixtures or the older invalid native Review screenshot as product truths or reusable design rules.

Not canonized or repaired: PRODUCT.md still uses Disaster Rescue/Rescue Reports naming and retired role descriptions; DESIGN.md and the sidecar still name Rescue Reports and describe a cross identity while the current shell displays I-Report with its pin mark. Their radius shorthand, limited motion metadata and sidecar's title-billboard prohibition also lag or conflict with current workspace output. Local literals, radius variations and dense marker overlap are recorded without promoting them to system rules. This ordinary extension did not authorize editing inherited system files, inventing a replacement world or normalizing documentation to justify defects.
