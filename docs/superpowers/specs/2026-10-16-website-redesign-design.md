# Website redesign: indigo/violet system and dispatcher overview

For Airen. October 16, 2026. Written from the approved direction in `design-plans/dashboard-concept-v11-final-web.png`, `design-plans/STRONG-PALETTE-PROPOSAL.md`, and `design-plans/COMPLETE-EXPERIENCE-REDESIGN.md`. Airen approved the direction and asked for implementation without another discovery round.

## Intent

A dispatcher opens the site and must find reports that need attention, understand the situation, and take the next permitted action. Visual identity follows the approved web concept.

## Goals

- Replace the navy/blue tokens with the indigo/violet palette in one token owner (`web/src/theme/tokens.css`, mirrored in `docs/design-tokens/tokens.json`).
- Dispatcher overview: compact workload summary, incident inbox, quick filters for "Needs verification" and "Active", and a selected-report preview with situation, evidence access, history, and the next allowed action.
- Newest-first ordering by default. Critical reports are visually marked but never reordered.
- Selection stays stable: the first visible report is selected on load, and data refreshes never replace the selection.

## Non-goals

- No backend, permission, or workflow changes. Transition rules stay in the API.
- No new routes. The full incident page stays the place for verify, reject, assign, priority, and classification.
- No URL-based selection state. Selection lives in the page only (one owner).
- No mobile (Flutter) work in this pass.

## Anti-goals

- A preview that offers actions the current role cannot perform.
- Auto-selecting a different report when the list changes under the user.
- Success feedback that is not server-confirmed.

## Decisions (my calls, marked for review)

1. **Shared workflow predicates.** `awaitingVerify` and `canAssign` move into `web/src/features/reports/workflow.ts` and are used by both the preview and the full incident page. Same rules, one source.
2. **Preview actions are links.** The preview's next-step button links to the full incident page, where the existing action code runs. The preview does not duplicate mutation logic.
3. **Dispatcher-only action links.** The current full page allows actions only for the `dispatcher` role. The preview follows the same rule. Admins see the next-step text without the action button.
4. **Selection is independent of filters.** If the selected report leaves the filtered list, the preview still shows it with a note and a Clear filters action.
5. **Narrow widths.** Above 1200 px the inbox and preview sit side by side. Below that, the preview stacks under the inbox.
6. **Quick filters are derived from the full dataset.** Counts come from all reports, not the visible result set.

## Verification

- `web` unit tests and typecheck.
- Production build.
- Rendered check against isolated local demo services at 1440, 1024, 768, and 390 px, using the dispatcher role.
- No live test accounts, no production data, no deploy.
