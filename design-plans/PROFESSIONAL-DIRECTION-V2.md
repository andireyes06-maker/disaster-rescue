# Professional direction, version 2

For Airen. October 16, 2026. Static design exploration only. Application code remains untouched.

Airen's feedback: the first concept's typography and design guide feel too plain. Keep the product's functions and factual content, but strengthen the typography, information hierarchy, and visual discipline. This proposal updates the first concept; it is not an approved implementation specification.

## What changes

- **Typography:** propose IBM Plex Sans for its open letterforms, distinguishable characters, and clear weight hierarchy. Use 30–32 px medium page titles, 18–20 px section headings, 15–16 px body, and 13–14 px supporting text. Avoid an oversized, heavy dashboard title. Font licensing, available weights, self-hosting, and rendering must be checked before adoption; no font package has been installed.
- **Data:** use tabular numerals for counts and timestamps. Keep descriptive text proportional. Set short counts beside their labels in one integrated workload line, without oversized colored numerals.
- **Grid:** align heading, toolbar, column headers, and row content to shared edges. Give incident/location the largest column and stable widths to priority, status, and time. Keep density consistent while allowing longer content to wrap safely.
- **Identity:** use graphite text, chalk canvas, and pine selection. Terracotta indicates the primary action; red and amber retain urgency meanings. Avoid large decorative color fields inside the workspace.
- **Restraint:** remove colored incident-icon circles and the generated serif DR monogram. Retain the existing textual identity. Use one consistent monochrome icon family for navigation and meaningful state cues.
- **States:** priority is the strongest state signal, workflow is quieter, and verification is subordinate. Do not make verified records visually compete with critical incidents.
- **Controls:** use understated tabs and recognizable inputs. A contextual Review report action can identify the selected record without placing a competing primary button on every row. A selected appearance requires actual selection behavior if implemented.

## Why this is more professional

Professionalism comes from predictable hierarchy and careful information design. The previous concept still used a large title, colorful numbers, category illustrations, and several competing chip styles. The second direction removes those competing signals and puts the visual emphasis on the incident and decision.

The signature is the incident title/location pairing, stable data columns, and disciplined type scale. It should remain recognizable across forms, maps, directories, and mobile layouts, without repeating an ornamental motif.

## Concept review

[View dashboard concept v2](dashboard-concept-v2.png). The render removes the decorative incident circles, tightens the queue, and improves navigation and tab hierarchy. It still shows colored counts, a large title, and green verification marks more prominently than specified. Refine those in the next approved design iteration; do not treat the generated pixels as an exact specification.

## What the mockup cannot prove

The generated image is a visual target, not a reliable font specimen or implemented interface. Search, tabs, and selection remain proposed behavior. Exact typography, contrast, focus, long content, loading, errors, permissions, and responsive reflow require checks in a later authorized implementation. Amber text must meet contrast requirements; tiny labels and raster artifacts must not be copied literally.

Next design checks are an incident-detail concept and a phone concept using this same system. Settle the direction with Airen before treating it as the implementation target.
