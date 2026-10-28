# I-Report responder upgrade and Flutter camera follow-up

October28,2026. Source `/Users/rien/Documents/FINAL_PROJECT/app`, branch `feat/ui-response-workspace-2026-10-28`, HEAD `ec3fc26f3167f0e84e8ad5153338d7701fc82af8` plus the local files in CHANGED-SOURCE.json. Nothing committed, pushed, merged or deployed in this pass. Existing other-session docs/documentation/handoff.md and unrelated media/build/evidence files were preserved.

## Review

Web preview: http://localhost:5487/ . Fictional local responder account: daniel.flores@harbor.example. The standard emulator password is defined in api/scripts/seed-demo.js; this is never a production login. Isolated stack: API3487/Auth9487/Firestore8487, project demo-disaster-rescue. Other sessions' default ports were not reused or stopped. Sign-in still lands on Assignments; Overview and Team map are added to the sidebar.

### What changed

- Overview puts actual own-team identity and current assignments before compact all-time recorded totals. Totals reserve visible loading/error/retry states, refresh when live report revisions change, and have a manual refresh. Responses from old team requests are ignored.
- Assignments is a compact reference-based list, with Active/Recently closed views, search and status filters. Search applies to the loaded window, explicitly labeled. Open reports remain oldest-first; Load50 newer reports widens that window. Closed work is bounded to the latest10, with visible independent loading/empty/error/retry/cache states.
- Every assignment has a stable /assignments/:id detail. Active notification links no longer lose their target by redirecting to the whole list. Operational actions appear before the incident brief and map; Incident brief and Progress history are separate sections. Already-authorized contact fields and evidence are shown when available. Histories retain5-row disclosure and20-entry paging inside a focusable bounded list. Closed reports stay read-only.
- Team map reads only the existing team-scoped assignment queries and the signed-in team's own HQ document. It has the same disaster symbols and priority shape/color meanings as the admin map, a list alternative, selected incident destination and directions. Missing/invalid pins remain accessible from the list. Map-background recovery preserves points. Enter/Space activates selectable pins; inert detail/HQ markers are not empty buttons.
- Multi-team failures now show incomplete-results feedback rather than silently substituting an empty successful channel. Both queries filter status before limits; old terminal records no longer crowd out open assignments, or vice versa. Late callbacks from unsubscribed team listeners are ignored. Two composite indexes were added locally; see deployment gate below.
- Closed-draft copy distinguishes never-submitted data, unconfirmed receipts and a confirmed saved receipt. The receipt lookup stays read-only. Existing update forms, server authorization, GPS requirements, idempotency keys and access-change draft clearing are preserved.
- Fresh review caught a cached-detail disclosure regression. The new detail now retains fromCache and renders the shared saved-information warning before controls, including when navigator.onLine is still true.
- Shared profile avatar uses a decorative user icon so the visible account name agrees with its accessible label. Place coordinate metadata contrast is improved. Branding and shared password-change behavior are preserved.

### Flutter

Both ResidentHome and ResponderHome already expose the shared ProfilePage with Change password. It calls AuthRepository→Firebase reauthentication→updatePassword. The9 password dialog tests pass. No duplicate password feature was added.

The owner chose Take photo AND existing attachments, not a mandatory fresh capture. PhotoService now exposes capture using the existing image_picker camera source. Photos pass the same byte-signature/size validation and shared five-photo bound, and remain part of the existing content-based retry identity. Cancellation/permission failures keep existing attachments; busy capture blocks repeated activation and removal. Gallery action is named Choose existing photos. No new dependency or signing/configuration change.

Camera visual review revealed an existing fixture bug: report-review.png was actually a Details screen with a missing-photo error. The fixture now attaches a valid synthetic photo and contact, asserts the real review content, and captures Review. It also exposed retained scroll offset across steps; the scroll view now resets per stage and has a regression. Only report-details.png and report-review.png were updated after separate candidate review; provenance/checksums record the changes. All15 golden hashes verify.

### Verified

- Web:560 tests across75 files, typecheck and production build pass. Existing >500kB chunk advisory remains.
- Flutter:278 tests pass, analyze clean. Includes5 new camera tests, the new step-scroll regression and the existing9 password tests. Mock camera/image bytes and widget evidence are not OS-camera proof.
- Chromium:12 route/width cases across Overview, Assignments, Closed, Team map, active detail and closed detail at390/1440. axe-core4.14 reports0 violations; no horizontal overflow or page exceptions. Not a comprehensive accessibility certification. Visible3px keyboard focus and normal320ms route transition were sampled, not profiled as a device benchmark.
- Owned real API/emulator flows:50→61 open reports despite70 older terminal multi-team records; reference search; closed list10; history5→20→24; keyboard map selection; other-team report refused without content; injected stats503 with retry; lost API reply after commit then same-key retry stores exactly1 update; live report closure keeps the unsent draft read-only. No production account/data changes.
- Cache-specific browser check uses actual Firebase disableNetwork after warming the report cache, while navigator.onLine remains true. Saved-information warning and update control are visible. See cached-detail.json and its settled screenshot.
- Partial-listener failure/late callback regressions are unit/fake listener evidence; large mixed-status query and other-team denial are real local Firestore evidence. Totals503/lost reply are deliberately injected, clearly identified in the scripts/logs.

### Independent review

Impeccable finish review ran in a fresh context. First disposition recapture: the totals-error screenshot missed the error, and native goldens could not establish Android device behavior. Correct totals-error and recovered captures replaced the misframed evidence. Next disposition fix: cached detail lacked its warning. That was repaired and independently scored resolved; final disposition ship applies to the reviewed web fix within the broader source/screenshot review, not whole-product/device certification. See FINISH-REVIEW.md. No detector approval: executable refused context and detect with permission-denied126. Root product/design files have stale branding/roles; these were noted, not repaired as an unrelated side effect.

### Owner's verification preference and limits

An existing Android AVD was discovered and a read-only isolated instance plus local-only debug package were briefly launched. Debug APK build succeeded; only welcome/sign-in were inspected. The owner then said they would rather not use an Android emulator. The owned emulator5660 was immediately stopped and no further Android testing ran. No camera/password execution on Android is claimed. Do not restart Android emulators without a new request. The debug audit APK targets local services and is NOT a group-distribution APK.

Real device camera/permission/activity-recovery behavior, iOS, screen readers, physical performance, provider uploads and hosted index behavior remain unverified in this pass. Android process recreation during capture is not covered by the added tests; no unscoped lost-photo recovery was introduced. No signed release APK or production rebuild was published.

Before deploying this web patch, build and verify the new assignedTeamIds+status+createdAt ASC and assignedTeamIds+status+updatedAt DESC Firestore composite indexes. Rules and access roles are unchanged. No API source or dependency changes were needed; the API/rules full suites were not rerun here. Deployment requires a later owner instruction.

Skills actually used: Impeccable craft/Operate guidance, prior design-critique audit, and Flutter implementation guidance. Browser checks use Playwright/axe; native checks use Flutter CLI. No claim that all installed plugins ran.
