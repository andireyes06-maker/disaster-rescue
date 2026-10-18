# Page-by-page audit ledger — October 18, 2026

Read AUDIT-REPORT.md for finding evidence and limits. “Coherent” means the sampled composition looked consistent; it is not a claim of deployment readiness or coverage of every state. 82 responsive route cases and 16 expanded Admin cases were captured. Phone and desktop contact sheets were inspected, with selected full-page/detail captures. Cached real GET responses were reused within each role across responsive widths; functional checks used separate requests. Normal motion was included.

## Web surfaces

| Surface | Current assessment | Work still needed |
|---|---|---|
| `/` — Landing | Coherent composition; header has weight, clear resident action, supporting workflow/roles/FAQ/footer. Autoplay, pause, chapter seeking, offscreen pause and video failure fallback checked. | Configure approved hotline/privacy copy. Verify hosted font/media loading and physical-phone performance. No broad visual reset recommended. |
| `/login` | Consistent desktop/phone form. Inline error icons, required labels, keyboard focus and recovery checked. | F08: enlarge password toggle to recommended 44px. Real email delivery and hosted cross-browser verification remain external gates. |
| `/register` | Form-first phone layout, error icons, required markers and normal error feedback checked; successful local provisioning covered. | F08 password toggles. Final approved resident/privacy wording. Real delivery remains unverified. |
| `/forbidden` | Consistent, explanatory access state. Role guards and signed-in redirects checked. | No new composition defect found in sampled states; preserve sign-out recovery for unrecognized roles. |
| Wildcard 404 | Missing-route recovery rendered consistently. | No new defect found; retain main/keyboard destination and useful navigation. |
| `/my` | Coherent report hub. Bell motion, read persistence, reconnect and unsaved navigation checked. | Real notification delivery is unverified. Keep explicit replay resolution and uncertainty wording. |
| `/my/report` | Required markers, error icons, validation, retry/reload identity, explicit replay resolution and offline feedback checked. | Real non-production photo upload and crash cleanup remain open; owner-approved retention copy. Avoid regressing idempotency/dirty navigation. |
| `/my/reports/:id` | Status/update/photo layout and missing-report recovery are coherent. | F10: recent-first summary or progressive history disclosure; stress case currently exceeds 25,000px. Real upload verification remains open. |
| `/dashboard` | Queue and filters coherent; verify/classify/assign/reject/duplicate flows exercised locally. | F03 staff notification access. F08 queue/filter comfort targets. Other transition effects remain best-effort. |
| `/map` | Map shell, controls and tile-error retry checked. | F03 staff bell. Real-device interaction/performance and provider availability remain unverified. Tiny attribution links are third-party legal content, not broadly classified as defective. |
| `/monitor` | Consistent operational overview at sampled widths. | F03 notification access; physical map performance and large real workloads remain unverified. |
| `/incidents/:id` | Clear incident details and staff actions; valid workflow transitions exercised. | F10 history scaling. F03 staff notifications. Keep action repeat/focus guards. |
| `/teams` | Populated, empty, failed-request and recovery states checked; creation/rename exercised. | F03 shell notification access. Preserve role/team permission rules; no new layout defect found in sampled states. |
| `/users` | **Not finished: severe phone layout defect.** | **F01:** identity width collapses to zero next to team/action controls. Stack controls and assert readable content width. F03 shell notification access. |
| `/analytics` | Consistent charts/tables; filter/export totals and failed-request state checked. | F03 notification access; broader production-volume/device profiling remains unverified. |
| `/audit` | Consistent log/filters; error state and sampled records checked. | **F05:** reconcile DMO API/rules permission mismatch. F03 staff bell. Retention policy unresolved. |
| `/assignments` | Responder view works through progress/resolve, but save concurrency and admin context need repair. | **F04:** pending edits erased by successful save reset. **F09:** admin destination is a dead end. F03 notifications. |
| `/admin` | Accounts, Teams, Audit and System sections captured at four widths; consistent typography/layout. First activation verified through emulator OOB flow. | F03 notifications; F05 permission matrix. Real outbound activation/delivery and release configuration remain external gates. |

## Native surfaces

All 15 tracked legacy golden surfaces were visually inspected in contact sheets; the existing 128-test suite and analysis passed. These are older design references, not fresh device captures. Every surface still requires current simulator/device appearance and interaction verification. F07 release configuration applies to the whole native app.

| Golden surface | Remaining work / limits |
|---|---|
| Login | F08 required-marker consistency; real activation/delivery and device keyboard/focus. |
| Register | F08 required stars; preserve genuinely optional Phone. Device form/error review. |
| My reports | Current-device layout, loading/offline/long lists; retry reconciliation across restored drafts. |
| Report type | F08 required selection convention; actual touch/selection behavior on device. |
| Report details | F08 required fields; actual camera/photo failures and permission handling. |
| Report location | Device GPS permission/denial/manual location and current map rendering. |
| Report review | F02 stable content identity, including changed photo content rather than count alone; avoid storing sensitive drafts without a retention design. |
| Submission result | **F02:** preserve key after uncertain 500, correct “NOT submitted” copy and test replay behavior. |
| Incident detail | F06 pass/listen to current status; long-history usability and live device updates. |
| Assignments | F06 valid transition affordances; real team-scope and device lifecycle checks. |
| Response update | **F06:** do not offer Resolved directly from Team Assigned. Test API contract, not only fake acceptance. |
| Notifications | Current-device opening, list/action destinations, actual push receipt and lifecycle. |
| Profile | Current-device editing/error/focus and verified identity copy. |
| Offline recovery | F02 preserve uncertainty identity across restart safely; actual connectivity loss/reconnect. |
| Map (tile-free reference) | Golden does not verify real provider tiles, zoom performance, GPS or device permission behavior. |

## Cross-cutting completion gates

F01–F10 remain open. Dependency scan has two advisory families requiring contextual triage (see report, including maintainer dispute on braces). Abandoned-photo cleanup is still a spec, creation effects alone have durable recovery, other effects remain best-effort, and retention has no approved expiry. Cloudinary, email/push, hosted WebKit, hardware and hotline/privacy approval are not green. None of these are made complete by zero axe violations or a passing build.
