# Localhost 5174 visual and UX review

For Airen · October 17, 2026. Reviewed the running website, not an earlier mockup. No application source changed.

## Scope and evidence

Fresh Chromium captures of `/`, `/login`, and `/register` at 1440px and 390px. Additional landing viewport captures at 768px and an empty-registration validation check. No credentials entered, account created, or authenticated route reviewed. Native Flutter screens were not reviewed here.

`localhost:5174` resolved to the React website; `127.0.0.1:5174` served a different Dart application. These addresses are not interchangeable in this setup. The review below concerns the React website. Raw captures and measurements are in `evidence.json`, `details.json`, and the PNGs in this folder.

The landing has changed since the earlier landing audit. This review supersedes the earlier unchanged-landing conclusion for this local running version only. It does not establish deployment status.

## Assessment

The new composition improves the old landing, but still reads like a project explanation rather than a finished product introduction. It has a stronger hero and clearer entry points, yet the central visual is a generic process diagram, and the lower page remains dominated by short documentation sections. Login and registration do not yet feel like a coordinated redesign.

The proposed changes below are design recommendations based on the rendered page and Airen's requested ambition. They are not all objective compliance failures.

## Highest-impact visual changes

1. **Replace the hero diagram with a convincing product scene.** `web/src/pages/Landing.tsx:31` owns the SVG scene. It illustrates a curved line with status dots, but does not show what residents submit, what dispatchers review, or what a response update looks like. Compose a representative incident view with a schematic location, evidence thumbnail, clearly labeled sample status, and a response update. Use actual product components or a faithful presentation of them, with explicit illustrative labeling. Show one incident well rather than adding arbitrary graphs, metrics or decorative widgets. Keep the palette; increase specificity.

2. **Rebuild the page's narrative and visual rhythm.** The resident section repeats the hero account action; the diagram and six-step rail both explain progress; the role descriptions repeat the lede and resident copy. The page is 2,324px tall at desktop and 3,523px at 390px. Length alone is not a defect, but the repeated content does not earn this much scrolling. Use a concise introduction, one substantive product demonstration, a compact explanation of the workflow, audience access, and a purposeful footer. Consolidate availability and privacy status into appropriate supporting information. Keep emergency guidance visible and honest.

3. **Make typography and surfaces more deliberate.** The hero renders Geist at 57.6px/650 weight on desktop and 38px on phone. The font itself is not broken; the same dense heading treatment and uniform lavender canvas do too much of the work. Give the hero controlled line breaks, more contrast between display type and supporting text, and measured differences in section density. Use paper/white content surfaces with indigo anchors and selective violet emphasis rather than tinting most of the page alike. Test the actual font and wrapping at intermediate widths before deciding a font replacement is necessary.

4. **Design a real mobile composition.** The header becomes a stack of brand/action, demo notice, and section navigation; it is followed by the hero, two full-width actions, then the scaled-down SVG. At 390px the SVG labels render at roughly 9px after scaling. Do not just shrink the desktop scene. Replace it with a compact readable incident/status presentation, simplify the header, shorten redundant sections, and keep resident access obvious. At 768px the scene expands substantially while the content already stacks, making the page taller than at 390px. Set purposeful scene sizing for tablet too.

5. **Give access pages one coherent family.** Desktop login is a small centered card floating in a large empty canvas. Registration has a large purple promotional panel and another form treatment. Use a consistent brand/support area and task area across both. On mobile, lead with a concise title and the form, with benefits secondary. The current registration input starts at y≈632px and its submit action at y≈1,050px in an 844px viewport. The large introduction is displacing the task.

## Verified UX and guideline findings

Reviewed with the [Web Interface Guidelines](https://raw.githubusercontent.com/vercel-labs/web-interface-guidelines/main/command.md). These findings concern the files inspected, not a full accessibility certification.

- `web/src/features/auth/LoginPage.tsx:45` — resident sign-in links arrive at a page describing staff access only. Use inclusive account copy and clarify staff provisioning versus resident registration. Do not add a role selector unless authentication actually requires one.
- `web/src/features/resident/ResidentSignUp.tsx:25` — empty submission reports “Enter your name” in a general banner; focus remains on the submit button and no field is marked `aria-invalid`. Add associated inline errors, move focus to the first invalid field, and retain the summary for context.
- `web/src/features/resident/ResidentSignUp.tsx:60` — form inputs lack `name` attributes. Add meaningful names; email fields should disable spellcheck. Apply the same treatment to login inputs at `LoginPage.tsx:47`.
- `web/src/features/auth/LoginPage.tsx:53` and `web/src/features/resident/ResidentSignUp.tsx:70` — busy labels use three periods; standardize to an ellipsis and add visible busy feedback consistent with the shared button treatment.
- `web/src/pages/Landing.tsx:69` — no skip-to-main link on the public page; add a main target and reuse the existing `.skip-link` styling.
- `web/src/pages/Landing.tsx:104` — “Every report moves through the same steps” presents the displayed successful progression as universal; current workflow code also recognizes verification/assignment waiting states. Describe this as a typical progression and reconcile the copy against the complete lifecycle, including alternate outcomes, before shipping.

## Motion

The scene draws its SVG route over 900ms and already honors reduced motion. Do not report reduced-motion support missing here. The stroke animation repaints the SVG, but no performance trace was taken, so jank is not established. Making this diagram more animated would not solve its lack of product information. Prioritize purposeful focus, busy, disclosure and navigation feedback when redesigning the surfaces.

## What currently works

The captured public pages had no horizontal overflow at 1440px and 390px, and no recorded JavaScript page errors. The landing has early calls to action, returning-resident access, honest sample labeling, a safety notice, and reduced-motion handling for the scene. Preserve those strengths while replacing the weak composition. No form success or authenticated behavior was tested.

## Execution order and acceptance

1. Recompose the hero/product scene and consolidate the landing narrative.
2. Resolve the resident sign-in contradiction and make auth layouts a coherent pair; move the mobile registration task forward.
3. Implement responsive scene variants, typography/surface refinements, inline errors and focus behavior.
4. Re-render at 1440, 1024, 768 and 390px; verify keyboard navigation, reduced motion, long copy and empty/invalid form states. Inspect the actual page after each material change.

This is one public-surface milestone within the whole-product brief in `design-plans/landing-audit-2026-10-17/AUDIT.md`. Do not count public-page completion as completion of authenticated web routes or Flutter. Do not claim those surfaces were reviewed from these captures.
