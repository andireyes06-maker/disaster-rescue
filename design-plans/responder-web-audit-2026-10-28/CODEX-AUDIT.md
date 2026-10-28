# Independent audit: I-Report responder upgrade

Audited 2026-10-28. HEAD: `3c70a92d0b145cb330c10c4f57330af45508a3af`, branch `feat/ui-response-workspace-2026-10-28`; compared with `ec3fc26`. The required first command was `git show --stat 3c70a92`; HEAD matched before review and still matched at completion. IMPLEMENTATION-REVIEW.md and FINISH-REVIEW.md were read before verifying their claims.

This was a read-only product audit. This report is the only project file created. No product source, production data, Firebase configuration, deployment, commit or push was changed. Existing unrelated working-tree changes were preserved. Temporary reproduction harnesses live outside the repository.

## Findings, ordered by severity

### P1 — An action waiting for GPS can submit under a different account

Locations: `web/src/features/responder/OperationForm.tsx:134`, `web/src/features/responder/OperationForm.tsx:138`, `web/src/api/client.ts:59`, `web/src/api/client.ts:72`.

Scenario: account A submits an update while geolocation is pending. The form unmounts and the session changes to account B. When the old geolocation promise resolves, the old handler continues, recreates a draft, and calls the API. The API client obtains the current account's token at that later time. A's old payload is therefore sent under B's identity. If B has permission for the report, the server can accept and attribute that action to B. Server permission checks still protect a report B cannot access; this finding does not demonstrate a cross-team authorization bypass.

Confirmed by running a temporary Vitest reproduction using the actual OperationForm and API client, a deferred geolocation promise, synthetic auth identities, and a stubbed HTTP transport. After unmount and identity change, exactly one POST carried A's note using B's synthetic identity. No Firebase or real network request was made. Source confirms there is no mounted/session-generation check after the await. Draft clearing alone does not cancel the closure.

This defect predates this commit: OperationForm.tsx and client.ts are unchanged against ec3fc26. The upgrade reuses this form, so the defect remains in the reviewed workflow. The acknowledgement handler in AssignmentsPage.tsx also awaits location before sending; that related path was read but not independently reproduced.

Required repair: bind pending actions to their initiating session/generation and ignore stale asynchronous completions before saving drafts, sending requests or applying results. Cover sign-out, same-account re-sign-in, account/team/role changes and unmount during location lookup.

### P1 — Returning to an earlier uncertain payload can create a duplicate update

Locations: `web/src/features/responder/OperationForm.tsx:135`, `web/src/features/responder/OperationForm.tsx:136`, `web/src/features/responder/OperationForm.tsx:144`, `web/src/features/responder/OperationForm.tsx:158`.

Scenario: update A reaches the server but its reply is lost. The responder edits to B, sends B successfully, then returns to A. The form stores only one attempt and clears it after B succeeds. A now receives a fresh key instead of its original unresolved key. A keyed server correctly treats that fresh key as a new operation, so the same update and rescued count can be recorded again.

Confirmed by running the actual form with a mocked keyed server: A uncertain → B success → A produced three requests, different first/third keys and two saved A entries in the mock. Separately, all 13 existing API responder-idempotency tests passed, including same-key replay behavior. The backend's same-key protection does not repair a client that generates a different key.

This also predates this commit: OperationForm.tsx and draftStore.ts are unchanged against ec3fc26. The reproduction uses mocked lost replies/storage, not a live Firestore write or real dropped connection.

Required repair: retain unresolved payload/key pairs independently until each is confirmed, definitely refused or explicitly discarded. Never silently replace an unresolved payload's identity when another payload succeeds. Add A→B→A and A→B-success→A regressions, including the store bound.

### P2 — Selectable map pins have generic priority-only accessible names

Location: `web/src/features/responder/AssignmentMap.tsx:38` (icon content at line 23).

Correction to the supplied review: selectable pins are not missing a button role. Installed Leaflet 1.9.4 supplies role="button" and tabindex="0" when keyboard=true. A standalone Chromium fixture using this installed Leaflet and the same divIcon structure produced the accessibility node `button "Critical"`. The title exists, but it does not replace the icon text's accessible name in this fixture. Multiple critical reports therefore have the same action name instead of a distinct report identity.

Confirmed by source plus the standalone browser fixture, without tiles, auth or Firebase. This was not a full rendered application or screen-reader test.

Required repair: give each selectable marker a distinct accessible name containing its report reference/type and relevant status. Preserve keyboard activation and the existing list alternative. Do not add button semantics to the deliberately inert HQ/detail markers.

### P3 — Disclosure and pane control relationships are incomplete

Locations: `web/src/features/responder/AssignmentsPage.tsx:99`, `web/src/features/responder/AssignmentsPage.tsx:114`, `web/src/features/responder/AssignmentsPage.tsx:120`, `web/src/features/responder/AssignmentsPage.tsx:140`, `web/src/features/responder/AssignmentsPage.tsx:272`.

The operation-form disclosure exposes expanded state but no aria-controls target. The brief/history toggles have pressed state but no programmatic association with their panes. The two labeled navigation containers are generic divs, so their aria-label does not supply useful group semantics. These omissions remain in this source and do not meet the requested explicit control-relationship requirement.

Confirmed by reading. Supply stable pane/form IDs and aria-controls, and use a meaningful group/landmark where appropriate. Toggle buttons are a valid pattern; tablist roles are not inherently required unless the implementation adopts the complete tab interaction pattern. These omissions alone are not evidence that the controls are unusable or that a browser accessibility audit would necessarily fail.

### P3 — Filter changes have no announced result count

Location: `web/src/features/responder/AssignmentsPage.tsx:285`.

Search/status filtering changes the assignment rows without a concise live result count. A screen-reader user gets little feedback while remaining in the filter. Add a polite, suitably debounced count/status message. Confirmed by source only; this is a usability improvement, not a claim of a reproduced screen-reader failure or an automatic WCAG violation.

## Verified

### Commands actually run

| Check | Actual result |
| --- | --- |
| `git show --stat 3c70a92`, branch/HEAD and scoped diff inspection | Correct commit/branch; 113 changed files in commit; reused form/client defects identified as pre-existing |
| In web: `npx vitest run --maxWorkers=2` | 560 tests passed across 75 files; 58.46 seconds |
| In web: `npm run typecheck` | Passed, tsc --noEmit with no errors |
| In mobile: `flutter analyze` | No issues found; dependency-update notices are informational |
| In mobile: `flutter test` | 278 tests passed; no golden references regenerated |
| In api: `npx vitest run test/services/responder-update-idempotency.test.js --maxWorkers=2` | 13 tests passed in one file, using in-memory test infrastructure |
| Temporary external Vitest harness | Two reproduction tests passed by asserting the two P1 defects above; these are not product regression passes |
| Standalone installed-Leaflet Chromium fixture | Button role/tabindex supplied; accessible name was priority-only |
| Bounded credential-pattern scan | 56 changed/review text files scanned; no matches for the tested credential patterns; no values printed |
| Unsafe-sink search in scoped responder/shell/App/CSS paths | No dangerouslySetInnerHTML, data-assigned innerHTML, eval or new Function matches |

Temporary evidence: `/private/tmp/ireport-audit-3c70a92/` contains the two probes, probe output, Leaflet fixture/result and credential-scan counts. Full-suite logs are `/private/tmp/ireport-3c70a92-*.log`. These are temporary artifacts, not durable test additions.

### Authorization, queries and data handling

Source review compared useAssignedReports.ts, useClosedTeamReports.ts, watchTeamReports.ts and useOwnTeam.ts with firestore.rules. Both legacy single-team and multi-team queries restrict reports to the signed-in team. Status predicates are applied server-side before limits. The team lookup reads the specific team document. Rules require an active account, matching role/team claims and assignment membership. No normally issued responder query in these paths was found to contradict those rules. This is source reasoning, not a newly executed rules/emulator proof.

The multi-team open query matches the new composite assignedTeamIds CONTAINS + status ASC + createdAt ASC. The closed query matches assignedTeamIds CONTAINS + status ASC + updatedAt DESC. The existing single-team query indexes are present. Production creation/readiness of indexes remains a deployment gate.

watchTeamReports merges/deduplicates the two channels, surfaces partial failures, makes both-channel failure an error, and ignores callbacks after unsubscribe. Hook state is scoped to its owner team. Detail access is checked before showing the report content; cached report data is disclosed before update controls. These source claims and their existing regressions are consistent with the passing web suite; no new real Firestore query was executed.

ClosedDraft's receipt check uses a read-only lookup and the API checks current team permission before replay/receipt. Same-key retries are covered by the executed API suite. The unresolved-payload identity gap above is separate from that correct server behavior.

### Flutter camera and gallery

Source and the executed Flutter suite support the shared camera/gallery add path: signature/size validation, five-photo cap, cancellation retaining existing attachments, errors retaining attachments, and a busy guard against repeat actions. Photo identity uses content digests, so camera/gallery additions participate in report retry identity. Capture uses the camera source; gallery remains available. No new defect was found in this scoped path. A mocked/widget pass does not verify OS permission handling or a real camera.

### Scope of security and motion conclusions

The Leaflet HTML icon template uses fixed/allowlisted symbols and styles rather than report text as HTML; report labels use the title property. The bounded scan found no matching secrets, but it is not a guarantee that every possible credential format is absent, and no paid security service or penetration test ran.

The supplied claim that the only animation is the 200ms selection slide is too broad. The app also mounts shared route/form/notification motion. This audit did not measure animation timing, frame cost or visual quality in the full running application. No detector pass is claimed.

## Not checked

- Hosted Firestore rules/index builds, real listener/query authorization, production token changes, or production data. No Firebase state was changed.
- Full browser responder workflow, actual dropped HTTP replies, or the two P1 scenarios against a live API. Their runtime probes used mocks/stubs as described.
- Full-page visual audit, route/detail focus behavior in a running app, focus rings, screen-reader announcements, VoiceOver/TalkBack, and all browser/device combinations. Source focus handlers and live-region markup were inspected; their presence does not prove end-to-end assistive-technology behavior.
- Real phone camera/gallery/permissions, real uploads, physical devices, signed builds or native restart behavior. No Android emulator was required or started.
- Full API/rules suites or a new production build in this audit. Only the API suite named above was rerun.
- Impeccable detector, Claude Security service, and a fresh antislop-tool run. Neither the earlier review nor this report establishes those tool passes.

## Verdict

**Ready after listed fixes**, with the two P1 defects requiring repair and regression coverage before deployment; the two matching Firestore indexes must also be built before releasing the new queries.


## Repair follow-up

The user subsequently authorized fixes. See [CODEX-FIXES.md](CODEX-FIXES.md) for the local repairs, 580-test verification and remaining deployment/device gates. The findings above describe the original audited commit, not the repaired working tree.
