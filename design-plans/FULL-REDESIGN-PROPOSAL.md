# Full website redesign proposal

For Airen, October 16, 2026. **Planning only. No application-code changes authorized at this stage.** Airen delegated visual-direction selection, then explicitly instructed: “dont change the code, you may continue.” This document is a proposal, not an approved implementation specification.

## Why the previous pass is insufficient

The earlier work repaired layout and usability defects, but preserved the same visual composition. The archived desktop dashboard still gives substantial space to generic framing and repeated metadata. Its long descriptions and multiple colored labels compete with priority and the next decision. The archived mobile landing repeats separate staff/resident boxes, role descriptions, and app availability without one clear visitor path.

These observations come from the earlier captures in `fixes-2026-10-16/screenshots/dashboard-1440.png` and `landing-390.png`, checked alongside the current components. They are not fresh screenshots of the latest working tree. Newer retry controls, photo viewer, and audit changes must be preserved during implementation.

## Proposed direction: civic service

A humane, precise public-service identity: warm white, deep forest green, generous headings, aligned working data, and restrained orange primary actions. This replaces the previous navy/blue world. It does not turn an emergency workspace into a decorative command-center simulation.

Design read: a task-focused web workspace for dispatchers, responders, and disaster management officers. ENERGY 1 / RHYTHM 2 / MOTION 1. Public pages use more expressive scale within the same identity; working screens prioritize scanning and familiar controls.

Direction exploration considered municipal publications, community health communication, transport wayfinding, civic-service typography, geographic field guides, local newspaper information design, and public-library signage. Civic-service typography carries the selected palette, density, and signature: a clear incident title/location pair, with urgency visually separated from workflow. The Impeccable direction exercise ran successfully after its initial network restriction. Airen's explicit delegation takes precedence over asking them to select from a direction tournament.

## Visual system to validate

| Element | Proposal | Purpose |
|---|---|---|
| Canvas | Warm off-white `#F5F4EF` | Separate work areas without the current cold gray wash |
| Surface | White `#FFFFFF` | Keep reading and form areas clear |
| Identity | Forest `#183F35` | Establish a distinct, calm public-service voice |
| Primary action | Burnt orange `#B64B26`, white text | Identify the main available action without competing with critical alerts |
| Body | Near-black green `#192B25` | Readable long sessions |
| Secondary text | Muted green-gray `#53645B` | Preserve legibility while lowering prominence |
| Rules | Warm gray `#DCDDD5` | Align and separate content quietly |
| Urgency | Red critical, amber high; text and shape retained | Keep priority meaningful without relying on color alone |
| Type | Existing self-hosted Geist; 15–16 px body, 32–36 px workspace headings | Use a coherent scale without adding a font dependency |
| Controls | 44 px minimum touch targets; 16 px mobile input text | Keep dense layouts usable |
| Geometry | 12 px contained panels, 6–8 px controls, limited pills | Distinguish containers and actions |
| Spacing | 4/8 px steps; 24–32 px section separation | Make grouping intentional and consistent |

The palette is provisional. Check actual foreground/background combinations, focus outlines, placeholders, disabled controls, and semantic states before adoption. Light mode is the initial proposal for readable maps, photos, and forms. Ambient-light requirements remain unconfirmed; do not invent a night-operations requirement.

## Website structure

### Shared workspace

Use a quiet, light sidebar with clearly grouped Operations and Administration links, a stronger product name, and a contained selected state. Keep the existing routes and role visibility. Use a compact breadcrumb above a substantial page heading. Place account identity and sign-out together. Remove redundant framing where the page already identifies its purpose.

On phones, use a compact header and an explicitly labeled navigation disclosure. Do not squeeze six navigation items into tiny tabs. Preserve keyboard focus, menu closure on navigation, skip link, and long account-name containment.

### Dashboard and incident queue

Make the queue the main workspace. Use a compact workload line rather than oversized metric tiles. Keep total, active, critical, and verified definitions consistent with the existing data logic.

Each report leads with type and location, then a short description preview. Priority carries the strongest state color. Workflow status is quieter; verification becomes subordinate text with a recognizable icon. Keep the full report available on the detail route. Use shorter visible timestamps with the full date/time accessible; show the date explicitly when records span days.

Proposed search and quick views such as Needs verification must filter the actual subscribed records. They are new interface behavior, not existing capabilities to claim in the mockup. Preserve the current newest-first order unless a clear user-selected ordering is introduced. Never silently reorder critical records or hide completed reports.

On mobile, turn each record into a compact, structured row: type/location first, priority and status together, time and verification below. Avoid desktop columns stacked as five separate blocks.

### Incident details

Lead with incident type, location, priority, and reference. Separate evidence, response history, and actions. Make the currently valid next action visually primary while retaining permission and workflow restrictions. Keep the photo thumbnails/viewer and classification prefill changes already present in the working tree.

Use one desktop action rail, not nested cards. On mobile, put the next action near the summary and secondary controls behind labeled disclosures. Rejection, assignment, duplicate handling, and photo dialogs retain their validation, Escape behavior, and focus return.

### Map and DMO monitor

Treat the map as the work surface. Put concise filters above it and the priority legend close to the map. Selected markers expose a concise report summary and an explicit route to details. A side panel on desktop may become a normal document section on mobile; avoid introducing a gesture-dependent sheet without an accessible alternative.

Preserve map height, visible-incident bounds fitting, labeled marker shapes, readable attribution, and usable zoom targets. DMO views remain read-only. Do not add a Live badge without a verified connection/staleness state.

### Analytics

Align reporting-period inputs and exports into a clear toolbar. Let incident type and workflow distributions occupy balanced areas, then give the time series sufficient width. Keep readable labels and accessible data tables. Use type-specific chart design only when the data supports it; do not add invented percentages or trends. Preserve reversed-date validation and consistent server filters.

### Audit

Use a readable chronology with action, report reference, actor, time, and changes. Retain before/after values as text. On mobile, show complete record groups so the actor and change do not require sideways discovery. Keep existing filter semantics, scroll cue, loading, error, and retry behavior until the replacement is verified.

### Teams and users

Use consistent directory layouts with identity first, current state second, and clearly named actions. Keep creation forms out of the default reading path, with a visible Create control. Make team availability different from account activation. Preserve existing account confirmation controls and long-name resilience. Do not imply membership editing exists if the API does not provide it.

### Responder assignments and operation forms

Lead with the assigned incident and its next allowed action. Keep location, current status, and update history close. Divide operation forms into understandable field groups while retaining required fields and validation. Acknowledge and progress actions must reflect real permission/state checks, with clear pending and failure states.

### Public website

Explain who this service is for and distinguish resident reporting from staff coordination immediately. Use a composed split introduction and a genuine report-lifecycle diagram, not a fabricated application screenshot or a generic feature-card grid. Staff sign-in is the real web action. Resident-app availability is an honest secondary destination, not a download button for an unpublished app.

Place the safety disclaimer close to the access choices. Consolidate repeated availability copy. Keep factual course credits and the privacy-review status. No fictional hotline, response-time promise, testimonials, official-government endorsement, or generated disaster imagery used as documentary evidence.

### Sign-in, access denied, and empty/error states

Give sign-in an intentional two-part desktop composition: product context and the focused form. Stack it on mobile with the form immediately accessible. Retain autocomplete, errors, pending state, and help. Access-denied pages offer a relevant route back. Empty and error states explain what happened and the actual next action, not just an icon and blank panel.

## Review artifacts and implementation boundary

The generated dashboard image, [dashboard-concept-v1.png](dashboard-concept-v1.png), is a static concept using synthetic fixture data. Search and quick-view controls in it are proposals. It is not browser evidence, implemented behavior, or a validated accessibility result. The image introduces a stylized DR treatment and colored category icons; those are generation deviations, not approved assets. Retain the existing textual identity and a consistent icon system when refining it. Its amber text and small secondary text also need contrast checks before implementation. No new brand mark is approved.

Before implementation, review the dashboard concept plus an incident-detail layout and phone layout. Use that feedback to settle the visual system. Do not ask again whether a full redesign is wanted; Airen has already requested it. The remaining boundary is their current instruction to leave code unchanged.

When implementation is later authorized, inventory the available plugins and skills and use the applicable ones, especially Impeccable. Carry the system across every listed route, preserve unrelated changes, and run unit/type/build checks plus browser interaction and responsive verification. Compare final rendered screens to the approved concept. Installation and source scans alone do not establish design quality.

No application code, dependencies, backend rules, production credentials, commits, or deployments were changed as part of this planning continuation.
