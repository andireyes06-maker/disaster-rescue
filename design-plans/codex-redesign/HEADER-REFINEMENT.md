# Public header refinement — October 17, 2026

Implemented on the existing working tree; nothing committed, pushed, or deployed.

## Changes

- Desktop: brand left, section navigation centered, staff sign-in right.
- Phones: brand and staff action above a dedicated section-navigation row.
- The factual demo/hotline notice has its own quiet strip with an information icon.
- Landing header stays visible while scrolling. Section links leave their headings clear of it.
- Navigation underline motion respects reduced motion; links retain visible focus and 44px target heights.
- Login and registration share the updated brand/notice header without sticky positioning.

## Verified

- Chromium rendered at 320, 390, 768, 1024, and 1440px: no horizontal overflow or header element overlap; all five header links measure 44px high.
- How-it-works anchor stays below the sticky header at every measured width.
- Keyboard at 390px: skip link reaches main; all header links have visible focus and reach the primary resident action afterward.
- Login and registration at 390px retain the notice and have no horizontal overflow.
- Viewed opening screenshots at 390 and 1440px.
- Web suite: 300 tests across 46 files pass, including type checking. Production build succeeds.

Evidence: `evidence/header-{320,390,768,1024,1440}.png`, `evidence/header-checks.json`, and `evidence/header-keyboard.json`.

This header pass was Chromium only. It does not add cross-browser, screen-reader, or physical-device verification to earlier records.

## Next recommended design pass

Review the complete opening view together: phone video readability, headline/video proportions, and the primary resident action. Then review the handoff into sign-in, registration, and the resident report flow for visual continuity. Preserve the existing functional and motion fixes.
