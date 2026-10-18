# Harbor landing: independent review

For Airen · October 17, 2026. Actual `http://localhost:5174` captured at 1440, 1024 and 390px with fresh Playwright viewport control. Full-page screenshots include the phone roles, access and footer sections. No iframe was needed. No application code was edited.

## Verdict

The console is more product-specific than the isolated sample card, but the landing is not visually finished. Desktop composition, tablet density and mobile content length still need deliberate decisions. Passing tests and a clean design detector do not establish visual acceptance. Keep the reported Harbor direction; improve its execution rather than changing palettes again.

## Verified results

- Full-width screenshots: `landing-1440.png`, `landing-1024.png`, `landing-390.png`.
- No horizontal document overflow or detected right-edge overflow among rendered elements at those widths.
- Phone roles, access and footer stack without visible clipping in the inspected full-page capture.
- First Tab exposes the skip link with a visible 3px ring. Enter focuses the main element, but its location causes the regression below.
- Reduced motion matched in the browser and removed the route animation. The ordinary presentation includes a once-on-entry `route-draw` animation.
- Computed console text contrast was calculated with ancestor background alpha compositing. At 390px the visible Team Assigned badge is approximately 5.97:1, sample label 8.70:1, detail location 8.70:1 and update metadata 6.95:1. These sampled text pairs exceed 4.5:1. This does not certify every color, icon, focus state or responsive variant. Hidden queue badges are also recorded in `contrast.json`; their presence in computed data is not proof they are visible on phones.

## Findings and required corrections

### 1. Skip link now bypasses the primary content

`web/src/pages/Landing.tsx` places the hero and safety notice before `<main id="main-content">`. Enter on Skip to content moves focus past the proposition, account actions and demonstration. Put the primary content, including the hero, inside the main landmark and make the skip target its beginning. Preserve the header outside main. Verify the next Tab reaches the appropriate primary action, not only later-page links.

### 2. Desktop headline composition remains unresolved

The fresh 1440px screenshot still breaks “Report an incident. Coordinate the response.” into four lines. That is not inherently invalid, but the short first pair and long final pair make the left side heavy and fragmented beside a wide console. The implementer's earlier size adjustment did not produce a finished composition in this capture. Decide the intended wraps with the real column width, shorten or rework the proposition if necessary, and inspect 1440/1280/1024 rather than relying on an older screenshot.

### 3. Workflow layout is too narrow at the tablet boundary

At exactly 1024px the page retains an intro column plus three step columns. Each step is only about 183px wide before its internal content, causing stacked headings and cramped sample fragments. The layout switches only below 1024. Recompose this section sooner: keep an intro above the steps, or use an intermediate layout with adequate reading width. Do not fix this by shrinking text. Review the breakpoint boundary on both sides.

### 4. Mobile still repeats too much information

The actual 390px page is 4,002px tall, compared with 3,309px in the preceding compact-preview version. Length alone is not a failure, but the console update, detailed lifecycle paragraph, three explanatory fragments, role descriptions and repeated account actions reuse much of the same story. Make a shorter public narrative: show the product, explain three practical stages concisely, provide audience access, and finish with truthful supporting information. Move the exhaustive status enumeration out of the introductory paragraph. Preserve meaningful safety guidance and factual availability.

### 5. Map and sample state need a coherent story

The schematic is acceptable as an explicitly labeled illustration; a real map is not required merely for visual polish. However, the SVG route begins near coordinates (300,186), detached from the incident marker around (250,142). The static sample queue data declares Rescue in Progress while the detail renders Team Assigned. The unused queue status is not currently a visible contradiction, but it is a future drift source. Align geometry and sample state with one intended moment. Avoid implying that schematic routes are computed navigation or real responder locations.

## Instructions for the next pass

Fix the main-landmark regression and the tablet layout, then refine the headline and shorten the mobile narrative. Recapture the actual implementation after the final change and inspect the full page. Use a fresh browser context with explicit viewport dimensions; capture `innerWidth` alongside screenshots. An iframe preview is supplementary evidence, not the only mobile test.

Continue the whole-product ledger after this landing pass. Transfer the brand and shared typography to resident screens, while designing for residents' simpler reporting and tracking tasks. Do not transplant the dispatcher console, dense queue, or dark-panel composition into every resident screen. Auth, staff/admin and Flutter are still open; this audit does not verify their visual completion or the implementer's test count.

Evidence: `evidence.json`, `layout-and-colors.json`, `contrast.json` and the three screenshots in this directory. Registration provisioning and recovery work remains a separate functional requirement and must be preserved.
