# Complete layout remake: concept 3

For Airen, October 16, 2026. Static proposal only. No application-code changes.

## Latest feedback

Airen prefers the decorative incident icons from the first concept, dislikes the proposed font, and requests a completely different layout and overall design. Concepts 1 and 2 are rejected directions, not implementation targets.

## Replacement direction

- Horizontal navigation replaces the left sidebar. Preserve existing role-based route visibility if implemented.
- A report inbox and selected-report panel replace the full-width table. Staff can scan incidents and read the selected situation in the same workspace.
- Familiar Inter-style typography replaces the IBM Plex proposal. Use normal proportions and comfortable reading sizes; the generated image cannot establish the actual font.
- Porcelain white, pale blue-gray, midnight text, and cobalt actions replace the warm forest palette.
- Colored incident-icon tiles return. Use one consistent library and meaningful category symbols rather than unrelated emoji.
- Workload counts remain a compact supporting line. Incident descriptions and the available next step lead the screen.

## Proposed behavior, not implemented capability

Selection, inbox search, and quick-filter tabs require implementation. Preserve the actual report subscription and newest-first ordering. The selected pane must update from the selected report, clear or recover when filtering removes it, and handle missing data.

Only show actions allowed by the current role and report state. Verification must preserve existing validation, pending/error feedback, and backend authorization. Keep the full incident route for evidence, history, duplicates, and other advanced controls; do not omit current capabilities merely because the compact preview has less space.

## Mobile translation

Show the inbox first. Selecting a report opens its existing full detail route or an accessible full-screen detail view with Back to incidents and restored list position. Do not compress two columns onto a phone. Horizontal navigation becomes an explicit Menu control; keep labels, focus, and 44 px touch targets.

## Review boundary

[View the new static concept](dashboard-concept-v3.png). It demonstrates the replacement composition and returns the decorative icons. The generated Needs verification count reads 2; the existing eight-report fixture has 3 pending records, so that label is a mockup error. The summary explanation “Currently being handled” also overstates what the active count establishes; use “Not resolved or closed” or the actual agreed definition instead. Do not copy either mistake into implementation.

This replaces the proposed composition, navigation treatment, palette, and typography, while preserving product truth. Search/filter controls, action placement, and selection in the image are design proposals. Synthetic records are not live data. No application source, dependencies, commits, or deployment are part of this work.
