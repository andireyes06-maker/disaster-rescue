# Responder audit repairs and Claude handoff

2026-10-28. Local changes on `feat/ui-response-workspace-2026-10-28`, based on HEAD `3c70a92`. Nothing committed, pushed or deployed. Existing changes in docs/documentation/handoff.md and unrelated untracked folders were preserved.

## Repairs

- **P1, session/GPS race:** new useResponderAction binds each action to its mounted view, report, scope, draft-access generation and Firebase user object. It checks validity after asynchronous work and binds token retrieval to the initiating user, checking again after token retrieval. OperationForm, acknowledgements and closed-draft receipt checks use it. Stale completions cannot recreate cleared drafts or apply success/error results to a later session. Requests already sent cannot be recalled; server permissions remain authoritative.
- **P1, uncertain payload identity:** the in-memory store retains separate unresolved payload/key pairs. Returning to A after B, including after B succeeds, reuses A's key. Success or a definite refusal removes only that payload. Five unresolved attempts block a sixth distinct payload rather than evicting anything; an existing payload can still be retried. Explicit forgetting requires a warning confirmation. No automatic submission or browser persistence was added.
- **Closed receipts:** multiple unresolved receipts can be selected and checked independently. A successful receipt removes only its matching key. The lookup remains read-only and server authorization is unchanged.
- **Map accessibility:** selectable pins have distinct names containing report identity, incident type, priority and status. Names update without remounting the marker or dropping focus. Enter/Space behavior remains; repeated keydown events are ignored. Inert detail/HQ markers remain inert.
- **Disclosure/group semantics:** brief/history and operation-form controls point to real stable targets; assignment control groups are named. The shared older-history disclosure also points to its list.
- **Filter feedback:** a polite live region announces loaded result counts and loading/error/partial-list conditions. The loaded-window limitation remains explicit.
- **Copy:** the empty active list now says new assignments come from the administrator, rather than claiming the team is ready.

## Changed product source

- web/src/features/responder/draftStore.ts
- web/src/features/responder/useResponderAction.ts (new)
- web/src/features/responder/OperationForm.tsx
- web/src/features/responder/AssignmentsPage.tsx
- web/src/features/responder/AssignmentMap.tsx
- web/src/components/calm/ActivityHistory.tsx

Regressions are in OperationForm.test.tsx, draftStore.test.ts, AssignmentsDrafts.test.tsx, AssignmentsPage.test.tsx, and the new useResponderAction.test.tsx and AssignmentMap.test.tsx.

## Verification actually run

- Before repairs, the four new form regression cases failed: A→B→A; A→B-success→A; identity change during GPS; unmount during GPS. Existing form tests passed. Other new regressions were added after implementation; no red-before-green claim is made for those.
- Final `npx vitest run --maxWorkers=2`: **580 tests passed across 77 files**, 33.01 seconds.
- Final `npm run typecheck`: passed.
- Final `npm run build`: passed. Vite still warns about chunks larger than 500 kB; this pass does not resolve bundle size.
- Actual AssignmentMap rendered in a temporary Chromium/Vite fixture: both equal-priority pins distinctly named, keyboard selection works, live status change updates the name, zero page exceptions. Map tiles were stubbed; no Firebase, auth session or report data was used. The fixture's own server and browser were closed.
- DOM regressions additionally check pin focus preservation, inert markers, disclosure/pane targets, filter announcements, multiple receipt selection, stale receipt completion, acknowledgement cancellation, five-attempt bound, explicit forgetting, same-account session invalidation, and token retrieval interrupted by an account change.
- `git diff --check`: clean.

Durable output from the final test, typecheck, build and browser fixture is in evidence/codex-fixes/.

## Still separate release gates / limits

- The two new Firestore composite indexes still need to be built and verified on the target project before deployment. No Firebase/index/rule operation ran in this repair pass.
- No production deploy, real lost-response API write, hosted listener test, full application browser pass or screen-reader test ran in this pass. Form/session edge cases use component tests and mocked async boundaries; map checks use the real component in an isolated browser fixture.
- Native code did not change. Flutter tests/analyze were not rerun during repairs; the preceding audit's 278 passing tests and clean analyze are historical results for the same unchanged native source. Real phone camera/permissions remain unverified. No Android emulator was started.
- Drafts and unresolved identities remain memory-only. Reload/new-tab/re-sign-in durability was not added. The explicit forget/discard actions can remove retry protection, so the interface warns before forgetting unconfirmed receipts.
- Impeccable detector and paid security services were not run.

## Continue from here

Review the local diff and these regressions against 3c70a92; preserve the unrelated working-tree changes. The original CODEX-AUDIT.md describes the pre-repair findings. This file records their repair and the exact verification scope. Do not treat local tests as evidence that hosted indexes are built or physical-device gates are complete.
