# Required fields and fresh web audit — October 18, 2026

Airen requested asterisks on important fields and another audit of the whole website after Claude's resident/idempotency continuation. This pass covers all **18 web route surfaces**, including missing-address recovery. It is not a new native-device, backend-security or production release signoff. Nothing committed, pushed or deployed.

## Changes completed

1. **Required fields:** reusable RequiredMark / RequiredNote, visible red `*` and “* Required” legend. Registration, sign-in, resident emergency type/description/location, admin creation/settings, team creation/rename, staff account creation, assignment, priority/classification, rejection reason and operation updates now identify mandatory entries. Matching controls expose native required or aria-required semantics; stars are decorative and excluded from accessible names. Labels and associated errors remain intact. Optional address, notes and team fields are named accordingly; filters/photos/contact are not falsely marked mandatory. The report explicitly explains the required location alternatives.
2. **Landing chapter labels:** fresh axe scans found a visible-label/accessibility-name mismatch in the three chapter buttons at all four widths. Accessible labels now include the displayed chapter number and name, with an explicit separating space. Merely hiding the number did not clear the finding; the final full-label correction did. Existing chapter seeking/playback logic is unchanged.
3. **Incident busy feedback:** priority/classification now show Saving priority… / Saving classification…, retain focus, freeze the submitted control values and guard repeat activation with a ref. Delayed intercepted failures verify one request and focus recovery.
4. **Incident truthfulness:** Team Assigned no longer says Rescue in progress before that status is recorded. Staff details prefer the public report reference over a storage ID, with ID fallback for records lacking a reference.
5. **Photo retry identity:** Claude's new retry fingerprint used filename/size/lastModified only. Distinct files can share all three. A WeakMap now supplies an in-memory identity for each selected File. Retrying the same File keeps its key; replacing it gets a new key even with matching metadata. No persistent storage or real photo upload introduced. Regression test uses different bytes with identical metadata.
6. **Responder acknowledgement:** the timestamp-only hook previously returned null for loading, failed reads and genuinely missing acknowledgements. The button could flash during loading and reappear on error. The hook now exposes loading/error/acknowledged/time; loading and read errors do not offer Acknowledge. Successful POST immediately retains confirmed state while the stream catches up, without inventing a timestamp. Busy text and a ref guard protect repeated activation. Tests cover loading/error/confirmed-but-stream-delayed states; a browser fixture checks those states without writing records. The useAcknowledgedAt return type changed from Date|null to an object; update any external browser mocks accordingly.

## Fresh verification

- **371 tests across 52 files**, TypeScript clean and production build pass. Eight additional tests beyond Claude's 363: photo identity, two busy actions, status distinction, public reference, and three acknowledgement states. Existing label selectors were adjusted only where optional wording was clarified.
- **82 initial Chromium route/role/width combinations**, `surfaces-initial.json`: all 18 route surfaces at 390/768/1024/1440, with additional dispatcher/DMO/responder views at 390/1440. Real local reads and authentication; application API writes intercepted defensively. Zero horizontal overflow, uncaught page exceptions or failed settling checks in that run. One unique accessibility defect affected four landing cases; do not claim the initial run was entirely clean.
- **Four final landing rechecks**, `landing-final.json`: corrected chapter names have zero axe findings/overflow at all four widths. These supersede the initial landing findings.
- **28 Chromium/WebKit targeted cases**, `targets.json`: registration validation/required marks; expanded Admin accounts, teams and settings; delayed priority/classification saves; long histories at 390/1440. Zero axe/overflow findings. Saves were fulfilled with controlled failures and did not persist.
- **Ten final Chromium form cases**, `forms-final.json`: registration, expanded Admin account/team/user forms and actual responder operation forms at 390/1440. Optional team/notes remain optional; required control semantics checked. Zero axe/overflow findings. These capture the final required-note spacing and supersede earlier form captures for that spacing.
- **Acknowledgement fixture checks**, `acknowledgement.json`: Chromium loading/error/confirmed-after-mocked-POST at 390/1440. No persisted writes. Source/unit tests establish the new hook contract; no new real acknowledgement was posted.
- **Long history:** browser-only replacement of useReportUpdates supplies 120 updates, including a long note; scrolling reaches the last entry in Chromium/WebKit at both widths without overflow or axe findings. This closes the layout gap for a long staff history fixture, not real Firestore volume/performance or the separate resident history component.

The 82-case normal sweep uses reduced motion to stabilize images. Existing motion is retained, but performance traces, all animations, screen-reader speech and physical devices were not retested. No Firefox state pass in this turn. Prior WebKit emulator transport issues are not closed by controlled state cases.

Representative screenshots for every route composition were opened: landing, sign-in, registration/error, Forbidden, missing address, resident hub/report/detail, dashboard, map, DMO monitor, teams, users, analytics, audit, assignments and expanded Admin. Specific final views include Chromium phone required-field registration, WebKit expanded desktop Admin, phone classification busy/focus, 120-entry history tail, and responder update form. Not every width of every screenshot was manually inspected. Earlier incident/assignment images precede the status/reference/acknowledgement fixes; targeted records supersede them for those behaviors.

## Per-page result and remaining work

| Route | This pass | Remaining work |
|---|---|---|
| `/` | Full composition retained; chapter label mismatch fixed and rechecked. | Physical phones, slow connections and updated hosted performance. |
| `/login` | Required marks/semantics and full layout reviewed. | Full screen-reader/expired-session recovery matrix. |
| `/register` | All five required fields marked; empty validation and phone/desktop layout checked. | Real interrupted provisioning across engines; previous success evidence remains separate. |
| `/forbidden` | Current signed-out composition checked. | Full role/announcement recovery matrix beyond prior evidence. |
| `/my` | Current populated report list/map reviewed, no overflow. | Real transport recovery, map-tile failures and large-data performance. |
| `/my/report` | Required type/description/location, optional address/contact/evidence distinction; retry photo-identity fix. | Non-production Cloudinary, in-app leave guard and key recovery after reload. |
| `/my/reports/:id` | Current populated detail/evidence reviewed. | Resident long-history layout. Its Status history currently shows operation updates rather than a complete record of every status transition; source/data follow-up needed. |
| `/dashboard` | Current populated inbox and phone preview reviewed. | Dense scrolling/task timing, stale/removed selection and genuine reconnect. |
| `/incidents/:id` | Required action fields, busy states, public reference and assigned-status guidance fixed; 120-update fixture checked. | Conflicting real writes, complete action failures and real large-history performance. |
| `/map` | Current markers/filter/legend composition reviewed. | Tile failures, overlapping-marker usability and reconnection. |
| `/monitor` | Actual DMO read-only layout reviewed. | Same map failure/density gaps and full navigation/announcement path. |
| `/teams` | Creation/rename required markers; expanded create forms reviewed. | Real management create/rename/reload and concurrent availability updates. |
| `/users` | Creation required markers, optional team, populated list and expanded forms reviewed. | Real create/status/reload, provisioning and permission failures. |
| `/assignments` | Actual responder and operation form reviewed; required fields and acknowledgement-state race fixed. | Reassignment/removal, connection loss, multiple assignments and server-side duplicate acknowledgement handling under response loss. |
| `/analytics` | Full populated composition retained; filters remain optional. | Large datasets, export contents compared with records, date boundaries. |
| `/audit` | Complete populated table reviewed; no overflow. | Product readability: raw actor/report IDs, raw action/field names and dense change text. Resolve to names/public references with traceable ID fallback; preserve audit integrity. |
| `/admin` | Required creation/settings/team fields; expanded panels reviewed. | Real account/role/team/settings persistence and concurrent changes. Settings still require a verified hotline before saving; none was invented. |
| Unknown URL | Full recovery screen checked. | Hosted deep-link/refresh behavior and screen-reader recovery. |

Some current local rows have QA names/descriptions from previous browser checks. This pass did not delete or overwrite those records to make screenshots look cleaner. Content cleanup should use known fictional fixtures and preserve test provenance/custom edits.

## Claude continuation

Keep the current design, error signs, copy cleanup, motion and idempotency work. The newest user direction is mandatory-field stars, with genuine optional fields left optional. Do not restore school credits, environment badges or unfinished team-lead copy.

Next priorities: improve audit-log readability and resident history truthfulness; verify remaining real management writes and reconnect/failure paths; test non-production uploads when credentials exist. The API still accepts reused idempotency keys without comparing bodies. The web protects its own same-session attempts but is not the server's integrity boundary. Reload recovery and in-app leave protection remain open; no router migration was performed.

Use only http://localhost:5174 after verifying demo-disaster-rescue/Auth emulator. Local account mapping remains in the product-copy handoff. The separate 127.0.0.1:5174 Flutter/live process and production were untouched. No commit/push/deploy. No new native code or physical-device tests in this web pass.
