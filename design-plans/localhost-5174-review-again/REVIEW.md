# Localhost 5174: second review

For Airen · October 17, 2026. Fresh browser review of the React website at `http://localhost:5174`. Application source left unchanged.

## What changed

- The abstract workflow illustration was replaced with a sample incident card using the product's badges, schematic location, evidence image, update and history.
- White and lavender section backgrounds now create clearer separation.
- The separate resident section was consolidated into the audience section; availability and privacy were consolidated too.
- Workflow wording now describes a typical progression and acknowledges alternate outcomes.
- A skip-to-content link was added.

These address parts of the previous review. The new version is more specific, but the hero now contains too much detail for its introductory purpose.

## Remaining priorities

1. **Compose a smaller, stronger hero preview.** The full incident card dictates the hero height and leaves the desktop headline floating in a large dark field. On phones it stacks a map, full evidence image, update panel, history and caption. Show a compact incident preview with one meaningful visual and one update. Move supporting detail into a later demonstration or explicit disclosure. Do not crop essential text or make the information unreadably small.
2. **Replace placeholder-looking visual content.** The map is a grid and dotted curve; the evidence asset is a triangle above blue lines. These render successfully but still look like development fixtures. Use a designed schematic with recognizable spatial context and a deliberate illustration or appropriately licensed image. Keep sample labeling and avoid any implication of live operational data. Put “Illustrative sample” near the top, before critical/in-progress badges, instead of relying on the caption at the bottom of a long card.
3. **Recompose mobile rather than stacking the complete desktop card.** Landing height increased from 3,523px to 3,736px at 390px. Desktop increased from 2,324px to 2,482px; tablet decreased from 3,571px to 3,471px. Length alone is not a failure, but the large preview and repeated status explanations still dominate. Make the header compact, shorten the preview and use a concise workflow presentation.
4. **Correct the phone card's inconsistent alignment.** `web/src/pages/public.css:135` applies horizontal padding to title and place; line 136 adds horizontal margin to both. This doubles their inset relative to adjacent content. Choose one spacing owner so the incident title, badges, location and body align consistently.
5. **Complete the access pages.** Fresh desktop-login and phone-registration PNG hashes exactly match the previous captures. Login still describes staff access despite resident sign-in using the same route. Registration still puts the first input at approximately y=632px and its submit action at y=1,050px in an 844px viewport. Make the two screens a coherent family and bring the mobile form forward.
6. **Fix validation, not just appearance.** Empty registration still shows a general “Enter your name” banner, leaves focus on the submit button and exposes no `aria-invalid` field. Associate field errors, mark invalid controls and focus the first invalid field.

## Verification limits

Captured landing/login/register at 1440px and 390px, plus landing at 768px and an empty-registration submission. No horizontal overflow or recorded JavaScript page errors on the captured public pages. No account was created or credentials entered. Authenticated routes, native rendering, deployment, and successful authentication/submission were not verified.

Evidence: `evidence.json`, `details.json`, full-page PNGs and viewport PNGs alongside this file. Earlier captures remain in `../localhost-5174-review/` for comparison. These are fresh public-surface findings, not proof that the whole-product redesign is complete.
