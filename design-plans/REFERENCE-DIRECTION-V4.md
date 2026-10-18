# Reference-led sidebar direction

For Airen, October 16, 2026. Planning and static mockup only. No application-code edits.

## Current brief

Restore the sidebar. Preserve decorative incident icons. Replace the unusual typography with a familiar, readable font. Research established product interfaces, their documented fonts, and background treatment rather than repeatedly guessing a different style. This supersedes concept 3's top-navigation direction.

## Verified references

| Reference | Verified observation | Proposed application |
|---|---|---|
| [Linear: behind the latest design refresh](https://linear.app/now/behind-the-latest-design-refresh) | Discusses consistent placement of header actions and a quieter sidebar with adjusted icons, inactive text, and spacing | Predictable page actions and clear navigation hierarchy; do not reproduce Linear's product identity |
| [Atlassian: product typefaces and scale](https://atlassian.design/foundations/typography/product-typefaces-and-scale) | Atlassian Sans derives from Inter Variable; documents a 1.2 scale around 16px and tabular figures for tables/lists | Propose the openly available Inter family with a small explicit type scale, not Atlassian's branded font |
| [Inter, official typeface site](https://rsms.me/inter/) | Supports text/display optical sizes, variable weights, and tabular numbers; distributed under SIL Open Font License | Familiar proportions, readable small text, aligned counts and times; self-host if later adopted |
| [Vercel: Geist](https://vercel.com/font) | Vercel documents its own Geist family and its clarity/functionality goals | A verified alternative already present in this repository, not proof that another product uses it |
| [IBM Carbon: color layering](https://www.carbondesignsystem.com/building-blocks/foundations/color/guidelines) | Defines coordinated background, layer, field, border, and interaction tokens | Distinguish navigation, canvas, panels, and controls using a consistent surface system |
| [Atlassian: designing new navigation](https://www.atlassian.com/blog/how-we-build/designing-atlassians-new-navigation) | Describes moving product navigation into a sidebar | Keep persistent product destinations accessible; adapt to mobile rather than shrinking the full sidebar |

These are verified first-party references, not a ranking of the world's most popular sites. No claim about a product's actual font is inferred from appearance alone.

## Proposed composition

Charcoal-navy sidebar, pale cool canvas, white reading surfaces, and cobalt actions. Decorative flood/fire/earthquake icons remain soft colored tiles. Color and shapes still carry incident priority separately from category.

Use a compact utility header, moderate page heading, one integrated workload band, and a two-pane report inbox/detail workspace. Stable navigation and the selected report do different jobs; the sidebar is not a substitute for the incident inbox. Avoid nested cards, oversized headings, excessive badges, and made-up trends.

Proposed Inter scale: page title 30–32px/600; detail title 24px/600; section title 18–20px/600; body 15–16px/400; labels 14px/500; supporting metadata 13–14px. Use text optical sizing and tabular figures for data. No font package or stylesheet has been changed.

The background is a deliberate three-surface system, not a stock picture: dark navigation, quiet canvas, white report panels. Background imagery may be explored separately for the public landing/sign-in, where it has a different job. It must not reduce legibility in the staff workspace.

## Skills used

Impeccable informs task hierarchy, meaningful surfaces, and the separation of urgent state from ordinary interface decoration. Emil design engineering informs predictable placement, coherent details, readable density, and restraint. Image-generation skill produces a static visual proposal. Web research verifies references. None of this establishes browser functionality or accessibility compliance.

## Review and behavior boundaries

[View sidebar concept 4](dashboard-concept-v4.png). The static render restores persistent navigation, retains colored category icons, and separates the inbox from report details. It is a visual approximation: the blue button has a slight generated tonal variation despite the solid-color brief, so use a flat action color if this direction is later adopted. It does not prove the actual Inter font was rendered.

The image is approximate, including its font rendering. A later authorized build must use real fonts and test their exact sizes and weights. Search, quick filters, selection, and the embedded report preview remain proposals. Counts must derive from real filtered data, roles must control available actions, and existing validation and backend rules must remain authoritative.

On mobile, use a menu disclosure and inbox-first composition; selecting a record leads to full report details with a clear way back. Keep 44px touch targets. No squeezed three-column phone layout.

No product code, dependencies, commits, or deployment are authorized or changed in this iteration.

## Refinement pass requested by Airen

Airen requested a small refinement of this direction, additional web references, and more use of the installed frontend toolkit. Preserve the sidebar, colored incident icons, and inbox/detail composition.

Additional first-party references:

- [Adobe Spectrum: attention hierarchy](https://spectrum.adobe.com/foundations/composition/attention-hierarchy): distribute visual emphasis deliberately. Keep Verify report primary; reduce competition from the secondary button, metadata, and selected navigation.
- [Adobe Spectrum: applying the type system](https://spectrum.adobe.com/foundations/typography/applying-the-type-system): establish consistent roles for headings, body, and supporting information rather than arbitrary weights.
- [GitLab Pajamas: spacing](https://design.gitlab.com/product-foundations/spacing/): use a consistent 8px-based rhythm. Align panel interiors, icon slots, rows, and control edges.

Additional skills actually read and applied: **Baseline UI** for consistent data numerals, restrained accents, and component hierarchy; **Anti-slop Human** for legibility and a computed contrast check. Impeccable and Emil design-engineering guidance remain in use. These are installed skill instructions, not evidence that a separate browser plugin inspected the mockup.

Requested polish: 40px incident-icon tiles, 36px summary icons, 24px panel interiors, 30px page title, 22px detail title, 15–16px body, and 13–14px supporting text. Reduce section rules and competing button emphasis. Keep decorative icons, but make their sizes and rendering consistent. Exact sizes require validation in a later authorized build.

The Anti-slop Human `contrast-check.py` computed these proposed pairs:

| Foreground / background | Ratio | Normal text |
|---|---|---|
| `#52627A` / `#FFFFFF` | 6.20:1 | Pass |
| `#FFFFFF` / `#245DE8` | 5.52:1 | Pass |
| `#BAC7DA` / `#192337` | 9.18:1 | Pass |

These results apply only to the specified colors. They do not certify every pixel, input boundary, focus state, font, or interaction in the generated image. No browser interaction or responsive compliance is claimed for a static concept.

[Refined static concept 5](dashboard-concept-v5.png) preserves the chosen composition, aligns the summary groups, and simplifies the detail sections. The image generator did not reliably implement the specified smaller icon sizes, flat button fill, or non-italic footer. Those remain explicit refinements for a future approved implementation, not completed pixel-level changes.

## Appearance pass: preserve the liked layout

Airen says concept 5 looks much better and requests a more aesthetic appearance. This is approval to explore its visual finish, not authorization to edit application code.

Proposed aesthetic refinements:

- Deep slate-indigo navigation creates a softer, more deliberate frame than an almost-black sidebar.
- A pale periwinkle canvas separates the white work areas without background pictures or patterns competing with reports.
- A consistent family of pastel incident-icon tiles supplies visual warmth. Keep the wave, flame, and building meaningful and visually related; do not add generic decorative icons.
- Modest panel rounding and one restrained depth treatment make the workspace feel cohesive. Avoid a heavy border plus a large shadow around every element.
- Use comfortable reading sizes and balanced medium-weight headings. Establish elegance through spacing and proportions rather than thin, low-contrast text.
- Pale azure selection, quiet workflow badges, and one cobalt primary action preserve the incident's hierarchy.
- Align the workload icons and values, row baselines, search/control edges, and the detail sections. Repetition should feel intentional, not mechanically uniform.

These choices are proposed art direction. Exact colors, dimensions, font rendering, states, and contrast must be measured in a later authorized implementation. Preserve the current product name, factual report text, role permissions, and existing workflows.

[Appearance concept 6](dashboard-concept-v6.png) explores softer canvas color and panel depth while retaining concept 5's structure. The change is subtle; it does not establish a new visual identity. Generated text has a malformed first Flood label and should not be transcribed as source content. The requested icon sizing and exact font metrics remain unverified. This is a review image, not a finished UI or an accessibility pass.

## Latest: complete palette replacement

Airen rejected further subtle changes and requested a whole redesign of the color scheme. The previous blue/navy/periwinkle palette is superseded as a proposal. Keep the sidebar and inbox/detail layout, and replace the color world entirely:

| Role | Proposed color |
|---|---|
| Sidebar | Warm charcoal `#292723` |
| Sidebar text | Ivory `#F4EFE6`; secondary greige `#C5BEB1` |
| Sidebar selection | Umber `#69412C` |
| Canvas | Warm ivory `#EEEAE1` |
| Reading surfaces | Cream white `#FFFDF8` |
| Main text | Charcoal `#292A24` |
| Secondary text | Warm gray `#655F54` |
| Primary action | Burnt orange `#A13F24`, white text |
| Selected report | Pale peach `#FBEADC` with restrained terracotta definition |
| Critical | Dark red `#AC2925` on pale rose `#FCE8E4` |
| High | Ochre `#80520B` on pale cream `#FBEDCA` |
| Decorative category accents | Sage, terracotta, ochre; shapes and labels remain |
| Dividers | Warm gray `#D9D2C6` |

Remove blue from controls, icons, tabs, brand treatment, history markers, and backgrounds, not merely the sidebar. Category icons and priority labels remain separate signals. Red stays reserved for actual critical/error meaning.

Computed proposed text contrast: white on burnt orange **6.46:1**; secondary text on cream white **6.23:1**; greige on charcoal **8.07:1**. These are exact hex-pair results from the Anti-slop Human checker, not pixel measurements or an accessibility certification of the generated image.

This is a new static color proposal only. Application source, existing theme tokens, dependencies, and deployment remain unchanged.

[View warm palette concept 7](dashboard-concept-v7-warm.png). The generated image replaces the blue color world across the sidebar, canvas, category icons, selected report, tabs, and actions. The first Flood label remains malformed from the reference and the button has generated tonal variation; neither is an approved source detail. Exact flat fills and correct text must follow the written brief in a future implementation.
