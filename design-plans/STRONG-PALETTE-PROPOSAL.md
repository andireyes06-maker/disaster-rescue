# Stronger palette proposal

For Airen, October 16, 2026. Static concept only; application code remains outside the authorized scope.

Airen says the warm palette is not strong enough. Replace its earth tones with a saturated indigo/violet identity, while retaining the sidebar, incident inbox/detail layout, and meaningful decorative category icons.

| Role | Proposed value |
|---|---|
| Sidebar and identity | Deep indigo `#21134D` |
| Primary action, selected navigation, active tabs | Electric violet `#6D28D9` |
| Reading surfaces | Crisp white `#FFFFFF` |
| Canvas | Cool neutral `#EDEDF7` |
| Selected report | Pale violet `#EFE8FF`, violet definition |
| Main text | Dark ink `#19162A` |
| Supporting text | Slate violet `#55516B` |
| Critical | Deep red `#B42318` on pale rose |
| High | Deep amber `#8A5100` on pale gold |
| Decorative category icons | Cobalt flood, orange fire, violet earthquake, each paired with a label |

Strength comes from substantial saturated navigation, a clear selected state, and a decisive primary action. Keep report-reading surfaces white so color does not compete with evidence, descriptions, and state labels. No gradients, glows, or texture are needed.

This changes the proposed visual identity, not report priority meanings, routes, role visibility, data, or workflow. It does not authorize application edits. Exact fonts, colors, responsive states, keyboard focus, and dynamic behavior require later implementation verification.

[View strong palette concept 8](dashboard-concept-v8-indigo.png). This demonstrates the stronger sidebar, selection, and action color coverage. Exact proposed text contrast, computed with the Anti-slop Human checker: white on violet **7.10:1**, white on deep indigo **16.60:1**. These do not certify the image's actual pixels. The first generated Flood label remains malformed; replace it with correct source text in any future implementation. Use flat fills rather than generated tonal variations.

## Latest refinement

[View concept 9](dashboard-concept-v9-indigo-refined.png). Airen requested one more refinement. Preserve the strong indigo sidebar and violet actions while using a more neutral canvas, gentler report selection, and a quieter secondary button. The first Flood label is corrected in this render. The image still approximates exact type and icon dimensions and retains some violet tint in supporting text; treat the written colors and future measured browser rendering as the implementation authority after authorization. No application code changed.

## Latest: major visual enhancement

[View concept 10: integrated workbench](dashboard-concept-v10-workbench.png). Airen requested a big enhancement. This fresh composition replaces the separate summary band and floating panels with a bold violet masthead containing compact workload metrics, followed by one integrated inbox/detail workbench. The next action has a dedicated pale-violet region. Keep the left sidebar and meaningful category icons.

This is a more substantial appearance proposal, not an implementation or final approval. The image generator changed some sample addresses, descriptions, and workflow/verification labels; treat those as illustrative raster content, never as canonical product data or permitted status transitions. It also introduced tonal variation in the masthead despite the flat-fill brief. The application must continue to use its real records and rules. Reconcile those details against source before implementation. All work in this iteration is limited to a static image and this planning note; no application code changed.

## Final web design pass, then mobile

Airen liked concept 10 and requested a final enhancement treating it as a finished web product before starting mobile design. [Concept 11: final web design target](dashboard-concept-v11-final-web.png) retains the masthead and integrated workbench, restores the intended sample workflow/verification labels, and improves icon consistency. This is a polished static design target, not a finished deployed application or proof that all website routes, states, and interactions work. The reference remains a little more prominent than the brief requests, and exact typography/fills remain unverified.

Airen subsequently said “i love the web design, now we refine the mobile design.” The concept 11 visual direction is accepted as the reference for mobile. Do not reopen web appearance by default. This is not permission to edit application code or deploy.

The mobile kickoff is documented in [MOBILE-REDESIGN-START.md](MOBILE-REDESIGN-START.md). Application code remains unchanged by these design iterations. Do not interpret “finished product” as permission to claim production readiness or skip the implementation and verification work in the complete experience specification.
