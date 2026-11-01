# Progress track correction

Owner screenshot showed a ~500px panel retaining four columns because the original breakpoint used viewport width. Labels escaped their tiles.

CSS-only fix, commit `692ea0d`, pushed to the UI review branch. Panel container queries use two columns by default, four only when its content width reaches 740px, and one below 280px. Text cells can shrink and wrap safely. Authentication is unchanged: owner confirmed sign-in is alright now; no auth defect was reproduced or claimed fixed.

Local Chromium checks at 320/390/1024/1440 and an explicitly 500px panel: zero tile or page overflow. Screenshot and measurements: evidence/progress-fixed-*.png and progress-layout-fix.json. Production build passes. No repeat of the full 508-test suite for this CSS-only correction.

Published to main Vercel, deployment `dpl_2p4WWxuR69XWvvoFksta3S8QFzT1`, with release validator intact. Production alias: https://disaster-rescue-web.vercel.app. Clean archive of 692ea0d used. The existing dependency advisory remains as recorded in PRODUCTION-DEPLOYMENT-2026-10-28.md.
