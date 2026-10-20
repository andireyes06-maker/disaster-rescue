---
format: 1920x1080
duration: 16s
message: A resident report connects dispatch and response updates.
arc: Pin and submit → Review and assign → Receive an update
mode: autonomous
captions: skipped (silent designed labels)
---

## Video direction

Illustrative product interpretation, not a literal screen recording. Blue-professional preset remixed to Geist and violet; shared assets/scene.css owns geometry. White ground, one simple form card and one schematic map, large labels, no dense dashboard. Silent. Always print “Illustrative sample. Not live data.” in the footer. No live data, invented location, response time, or rescue guarantee. All assets supplied locally.

Catalog searched: US map flows have the wrong geography, macOS/glass notifications the wrong skin. Use the supplied narrative-specific map and brand with the concrete motion recipes instead. No external assets, voice, music, or generated imagery.

Shared geometry across all frames: .vid-header at x96/y58, .vid-title x96/y142, .vid-panel x96/y280/w500/h610, .vid-map x656/y280/w1168/h610, footer bottom62. Map-local incident center (454,365). Team center (865,169). Route M454 365 L454 386 H865 V169. All are stationary at cuts, scale1/opacity1. Frame03 ends on a fade to the same white ground so the loop has no black flash. Do not re-enter common chrome in frames02/03. Use clean match cuts on identical map geometry, avoiding double-exposed headings. All transitions are assembler-owned.

## Frame 1 — Pin the incident
- status: animated
- src: compositions/frames/01-report.html
- duration: 5s
- transition_in: cut
- scene: A resident chooses a location and submits a flood report.
- voiceover: skipped (silent)
- poster: 3.8
- blueprint: compose
- asset_candidates: assets/scene.css, assets/district-map.svg, assets/brand.svg, assets/geist.woff2
- focal: resident report card and incident pin

Scene 1 (0.0–1.3s): Header brand, phase “Resident / Report”, title “Pin the incident.”, shared card and map arrive sequentially → dynamic-content-sequencing. A full-duration background clip paints white, not the composition root. Stage/content is transparent over that clip. Use shared stylesheet and local assets.
Scene 2 (1.3–3.3s): Violet pin lands at map-local(454,365). A single ring expands, then settles. The left card reads “Flood report”, “Riverside Demo Zone”, and “Water is rising near the access road.” Map note “Incident location”. Fade/small-scale note entrance → scale-swap-transition. No continuing pulse.
Scene 3 (3.3–5.0s): “Submit report” compresses once → press-release-spring; “Report submitted” receipt arrives. Hold all content visible at the cut. Footer: Report active → Coordinate → Stay informed. Footer truth notice.
handoff_out: Map x656/y280/w1168/h610; marker local454/365; scale1; opacity1; stationary; no route or team yet. Shared chrome fixed.

## Frame 2 — Connect the response
- status: animated
- src: compositions/frames/02-dispatch.html
- duration: 5.5s
- transition_in: cut
- scene: Dispatch reviews the report, assigns a team, and connects a route.
- voiceover: skipped (silent)
- poster: 4.4
- blueprint: compose
- asset_candidates: assets/scene.css, assets/district-map.svg, assets/brand.svg, assets/geist.woff2
- focal: assignment card and drawn route

handoff_in: Map x656/y280/w1168/h610; marker local454/365; scale1; opacity1; stationary. Shared chrome fixed.
Scene 1 (0.0–1.5s): Shared map and pin hold. Title “Connect the response.”, phase “Dispatch / Coordinate”. Left card one “Flood report” row, “Reviewed by dispatch”, and “Riverside Demo Zone”. Footer Coordinate active. No new sidebar, fake clock, or live counter.
Scene 2 (1.5–3.3s): “Sample rescue team” selection arrives; “Assign team” compresses once → press-release-spring. “Team assigned” confirmation settles → dynamic-content-sequencing.
Scene 3 (3.3–5.5s): Draw route M454 365 L454 386 H865 V169 → svg-path-draw. Team marker center865/169 is a44px violet rounded square with white cross. Map note “Team assigned”. Finish the route and hold at the cut.
handoff_out: Same map/pin/chrome. Fully drawn route at opacity1/dashoffset0. Team center865/169, scale1, opacity1, stationary.

## Frame 3 — Stay informed
- status: animated
- src: compositions/frames/03-update.html
- duration: 5.5s
- transition_in: cut
- scene: A response notification reaches the resident.
- voiceover: skipped (silent)
- poster: 3.6
- blueprint: compose
- asset_candidates: assets/scene.css, assets/district-map.svg, assets/brand.svg, assets/geist.woff2
- focal: resident update card

handoff_in: Same map/pin/chrome; fully drawn route opacity1/dashoffset0; team center865/169 scale1/opacity1/stationary.
Scene 1 (0.0–1.5s): Title “Stay informed.”, phase “Resident / Updates”. Footer Stay informed active. Left panel “My report”, “Flood report”, checked history rows “Report submitted”, “Team assigned”. Shared map, route, markers hold.
Scene 2 (1.5–3.5s): A prominent notification settles inside the left panel: bell icon, “New response update”, “Team reached the access point.” A “Rescue in progress” status arrives → dynamic-content-sequencing. One brief bell tilt; no repeated ringing. Map note “Response update received”. Keep card content fitting inside500×610 with36px padding.
Scene 3 (3.5–5.5s): Hold readable content until4.9s, then fade content and chrome to the shared white ground over0.6s. Fade inner content, never visibility/display on the timed clip. No black end card or extra CTA. Loop starts on white ground.
