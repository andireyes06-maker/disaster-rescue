# Web audit continuation — October 18, 2026

## Result and scope

Another full web route sweep and focused remediation is complete. This is not a backend, production or physical-device certification. Nothing committed, pushed or deployed. React localhost:5174 used with demo-disaster-rescue Auth/Firestore emulators and local API. The separate Flutter/live-config process on 127.0.0.1 was not used or changed. Browser mutations were intercepted for the saving-indicator check; no product records were written in this pass.

376 tests across 52 files pass, including typecheck; scratch production build succeeds. git diff --check is clean. Shared dirty working tree preserved. Accessibility/craft guidance used; no new Impeccable detector claim.

## Fixes

- Audit log: readable actions, account names, report references and assigned team names. Original IDs remain in keyboard-operable Identifiers disclosures. Name lookup failure preserves audit entries and offers Retry names. Filters debounce requests and ignore stale responses. Dates/empty states from previous work retained. Positioned scroll container fixes an actual phone overflow caused by visually hidden transition text inside the wide table.
- Resident detail: Report activity shows the known submission date and current non-initial status. Response updates have their own heading, guidance, loading skeleton and truthful completed-empty message. No missing intermediate status events or timestamps are fabricated. Long unbroken update notes wrap and preserve line breaks.
- Report update hook: loading/error state is report-specific. Switching IDs immediately clears the previous report's entries, and late callbacks cannot restore them. Retry retains last good entries only for the same report.
- All three web tile maps: staff map, resident area map and location picker now explain tile failures and offer Retry map background. Markers, typed details and the map remain present; retry restores focus to the map. Resident map sizing accommodates the notice.
- Shared busy buttons: a visible spinner complements busy text/accessibility state. Reduced motion keeps the indicator still. Existing repeat-activation guards remain.
- Required stars and contextual error icons from the previous pass remain. Optional controls were not made required.

## Page ledger

All rows below have normal Chromium checks at 390, 768, 1024 and 1440px. These checks cover resolved rendered state, one main landmark, axe, document overflow, banned-copy probe and uncaught exceptions. They do not verify every mutation, every permission or every animation. The normal sweep precedes the last targeted fixes; focused evidence below supersedes changed surfaces.

| Page | Current result / remaining work |
| --- | --- |
| Landing `/` | Responsive/accessibility sweep clean. Keep approved film/header/motion. Real hotline, device autoplay and deployment-level checks remain. |
| Sign in `/login` | Sweep clean. Keep required marks, errors, password controls and prior auth evidence. No new auth failure matrix in this pass. |
| Register `/register` | Sweep clean, required marks retained. Interrupted provisioning and real transport still need controlled non-production verification beyond prior tests/mocks. |
| Forbidden `/forbidden` | Signed-out surface clean. Prior role guard evidence retained; no new complete role matrix. |
| Missing page `*` | Missing-address surface clean; recovery navigation retained. |
| Dispatcher `/dashboard` | Sweep clean, actual dispatcher checked at 390/1440. Queue mutations/concurrency and reconnect remain. |
| Map `/map` | Sweep plus tile failure/retry clean in Chromium/WebKit. Controlled tile image recovery is synthetic; real tile-provider/device recovery remains. |
| Monitor `/monitor` | Sweep clean, actual DMO checked at 390/1440. Real stale/reconnect behavior remains. |
| Teams `/teams` | Sweep clean. Busy indicator/focus/repeat guard verified with delayed intercepted failure. Real create/edit persistence/concurrency remain. |
| Users `/users` | Sweep clean. Real creation/role/account-state persistence and concurrency remain. |
| Analytics `/analytics` | Sweep clean. Export contents and reconciliation against real non-production data remain. |
| Audit `/audit` | Readability, keyboard identifiers, failed names lookup and recovery verified in both engines at phone/desktop. Phone overflow fixed. Large-data pagination/performance and complete historical identity resolution remain. |
| Assignments `/assignments` | Sweep clean, actual responder checked at 390/1440. Preserve prior acknowledgment race fixes. Real reconnect/action transport remains. |
| Admin `/admin` | Sweep clean. Prior empty/error/own-role protections retained. Complete real account/team/settings writes and concurrency remain; no invented hotline configured. |
| Incident `/incidents/:id` | Populated detail sweep clean. Previous busy/action/history work retained. End-to-end mutation/error/concurrency matrix remains. |
| Resident hub `/my` | Sweep plus failed/recovered area map clean. Real transport/subscription recovery remains. |
| Report `/my/report` | Sweep plus failed/recovered picker clean; typed details survive retry. Actual photo upload needs non-production Cloudinary. In-app navigation still has no unsaved-entry guard; reload/close warning exists. |
| Resident detail `/my/reports/:id` | Sweep, known activity and 120-update fixture clean. Full status-transition chronology is not available; real upload and reconnect remain. |

## Evidence

- `surfaces.json`: 82 Chromium normal cases, all zero axe violations/document overflow/uncaught exceptions, settled loading and no banned-copy matches. All 18 surfaces plus actual dispatcher/DMO/responder at phone/desktop. No writes.
- `details.json`: 28 Chromium/WebKit cases at 390/1440. Readable audit, keyboard disclosure, name lookup failure/recovery, resident activity, and browser-only 120-update history including a 1000-character unbroken note. Zero axe/overflow. Long history is a browser fixture, not persisted emulator history.
- `map-recovery.json`: 24 Chromium/WebKit cases at 390/1440 across three maps, failed and recovered. Requests aborted then replaced by a controlled valid PNG; this tests UI recovery, not real provider/network recovery. Markers and typed report description preserved.
- `browser-*.json`: three focused busy checks: Chromium normal/reduced motion and WebKit normal at 390. Create-team request intercepted and delayed, then failed with 503. Spinner, focus during/after failure and exactly one request after repeated Enter verified. This does not prove every saving button individually.
- `tests.log`, `build.log`, repeatable browser scripts and PNGs alongside this file. Scripts assume the current local emulator fixture data/accounts and absolute local tooling paths; no credentials included in handoff prose.
- Visually inspected current screenshots: Chromium phone Audit and desktop opened identifiers, WebKit phone long-history tail, Chromium phone failed map, WebKit phone recovered location form and Chromium phone Admin. Other fresh captures exist but were not individually visually inspected in this pass. Earlier page-composition reviews remain historical evidence.

## Remaining release gates

Non-production Cloudinary upload, real management persistence/concurrency, exports, actual reconnect/stale transport (including previously observed WebKit emulator Listen issues), screen-reader speech and physical phones/Flutter remain open. Backend idempotency key/body matching and retry after reload are not solved here. No new production config/security audit, performance trace or full motion/cross-browser route sweep was run. Do not interpret clean normal pages or the scratch build as deployment approval.

Next work should exercise these remaining real non-production flows and fix demonstrated defects, preserving the current design and evidence boundaries. Read root CLAUDE-NEXT.md and the previous re-audit record for contracts and owner preferences.
