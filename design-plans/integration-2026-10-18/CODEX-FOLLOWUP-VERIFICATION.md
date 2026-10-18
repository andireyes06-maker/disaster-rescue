# Codex verification of R1–R3 follow-up — October 18, 2026

The three findings in CODEX-REPAIR-REVIEW.md are addressed in the reviewed source and focused tests. That earlier request-changes verdict is superseded for R1–R3 by this note. This is not a universal release certification.

Independently rerun on the current integration:

- API submission domain and atomic service tests: 25 pass.
- Frontend attempt-store and form retry tests: 20 pass.
- New store/form resolution regressions: 11 pass.
- git diff --check: clean.

Read the current Firestore adapter, hashed identity construction, ownership-checked legacy path, route replay header and CORS exposure, store capacity logic, replay choices, and memory-only feedback. R1 now blocks a sixth unresolved version before POST rather than evicting. R2 hashes the canonical UID/key tuple and checks ownership; legacy records are not taken over. R3 exposes completed replays and asks whether to open the existing report or deliberately send a new one, rather than silently treating a later intended report as a retry.

Evidence: codex-followup-verification/*.log. Claude’s full-suite, real-emulator and browser results remain in HANDOFF-REFRESH-FOLLOWUP.md; they were not all independently repeated here. In particular, this pass did not rerun Firestore concurrency, the full browser matrix, axe, Flutter, Cloudinary, delivery or device checks.

No product code changed during this verification. No commits, push, merge or deployment.

Remaining work is the documented release work, not another rewrite of R1–R3: actual non-production uploads/delivery and hosted testing, Firefox retry coverage with compatible tooling, physical-device checks and owner-approved hotline configuration. Orphan cleanup and durable audit/notification recovery across crashes remain explicit engineering limitations; claim retention needs a policy that preserves retry guarantees. Do not equate closure of the three targeted findings with closure of those items.

Recovery archives were not changed in this documentation-only pass. Use Claude’s post-follow-up archive and checksums, not pre-followup/pre-repair versions.
