# Integration plan

User authorized combining the latest redesign and functional fixes, preserving both original worktrees, then verifying the result and producing a Claude handoff. No commits/pushes/deployment.

Base branch: fix/release-audit-f01-f10 at 76e54ff. New branch/worktree: integration/redesign-functional-2026-10-18 under /private/tmp/rescue-release-integration-2026-10-18. Common base effd53f. Original modified/untracked files are inventoried and hashed; runtime source/assets copied, historical audit captures/caches/local environment files excluded. Original files remain unchanged. Dependencies are linked from the original installations without installing new packages.

1. Three-way reconcile overlaps. Keep redesigned compositions, icon errors, RequiredMark, Brand, bell, lazy routes, loading/error boundaries, motion, accessibility, and media. Add functional fixes for canonical permissions, team management, password reset, submission fingerprints, export filters, unsaved forms, stale indicators, email profiles, settings validation, and audit events.
2. Close integration-specific gaps: preserve sample-export names and CORS exposure; ensure history navigation is guarded; expose stale status on all relevant realtime surfaces; handle report rate-limit responses clearly.
3. Run combined suites/typecheck/build and Firestore permission tests. Add meaningful regressions where integration exposes missing guarantees.
4. Verify the integrated app on dedicated local emulators, including real workflows/exports/retries, offline/reconnect, roles, navigation, normal motion, keyboard/axe, desktop/phone and Firefox/WebKit critical flows.
5. Inventory final source, verify originals against hashes, document exact evidence, limits and non-production service/device gates.
