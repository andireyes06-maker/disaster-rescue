# Demo-content audit and population brief

For **Airen**, October 16, 2026. Airen requests invented information temporarily so the product does not look empty. **Synthetic demo content is explicitly permitted.** This document specifies that work for Claude; it does not seed data or change application code.

## Current evidence

Repository HEAD is `e9c6426`, with active uncommitted repair work in API, rules, Flutter, and tests. Preserve those edits and inspect the current schemas before implementation. Earlier pre-deployment findings may now be in progress; this content brief does not reopen or override them.

| Surface | Source evidence | Content gap / proposed fill |
|---|---|---|
| Shared startup data | `firebase/seed.js` creates four role accounts, one team, and hotline config; it creates no reports, updates, notifications, or audit history | Add a dedicated deterministic demo scenario, not another collection of unrelated component placeholders |
| Dispatcher inbox/detail | `web/src/features/reports/ReportQueue.tsx`, `IncidentPreview.tsx` consume report subscriptions and per-report updates | Varied incident types, priorities, readable descriptions, locations, timestamps, evidence/no-evidence, and coherent next steps |
| Resident overview | `features/resident/ResidentDashboard.tsx` reads own reports, notifications, and public incidents | Several reports belonging to each demo resident and related notifications; do not show every resident's private reports |
| Responder assignments | Web/mobile assignment pages filter by authenticated team | At least one legitimate active assignment for the default demo responder and history records that do not block the current team |
| Teams/users/admin | Existing directory and admin panels read actual user/team records | Multiple named demo teams, available/busy states, account roles and membership, truthful admin/DMO fixtures |
| Analytics | `api/src/services/statsService.js` derives totals, distributions, daily counts, rescue counts, and assignment intervals from reports/updates | Records spread across 14 days with real timestamps and updates; no unrelated hardcoded chart values |
| Audit/history | Report details read updates; audit page reads audit records | Past events consistent with the current state, actor, reporter, team, and timestamps |
| Maps | Staff/public map projections consume real report coordinates and coarse projections | A reasonable local spread of synthetic locations; preserve exact/coarse privacy rules and public-state eligibility |
| Photos | Current test fixtures use invalid URLs; real evidence viewers require an asset | Bundled, clearly marked sample assets, one/multiple/no-photo cases; no broken remote placeholder URLs |
| Mobile | Flutter repositories read the same backend domain | Reuse the dataset; do not create a contradictory mobile-only collection |

This is source-based content coverage, not a claim that production currently contains zero records. The earlier 84 browser captures used a separate eight-record audit fixture; those records are not the standard product seed. Test-only `web/src/features/reports/fixtures.ts` is not a product demo repository.

## Demo boundary and presentation

Use an explicit **Demo workspace · Sample data** label across web and mobile when this dataset is active. Reports, team availability, activity, and analytics are fictional demonstrations, not live emergencies or measured operating performance.

Default to isolated local/demo Firebase services, or an already authorized dedicated demo environment. Do not silently merge fictional incidents/accounts into live operational data. A hosted demonstration requires a distinct configured environment with the same visible labeling. No automatic production fallback to invented records when a real fetch fails.

No real messages: suppress external SMS, push, email invitations, uploads, and dialing from synthetic contacts. Do not invent a working hotline, verified government affiliation, response-time promise, certification, testimonial, real person's contribution, or completed privacy review. Existing verified facts remain; unknown facts stay honestly marked. In demo mode offer “Emergency hotline not configured for this demo” where appropriate, not a dialable fake number.

For form schemas that require a phone, use an explicitly synthetic schema-valid fixture value in the isolated dataset and disable outgoing calls for that demo contact. Never describe an arbitrary phone-shaped string as guaranteed unallocated. Use `.test` email addresses and local-only account setup, not real recipient addresses.

## Dataset: 24 linked reports

Use stable IDs prefixed `demo-report-`, a fixed scenario clock configurable by `DEMO_NOW`, and timestamps relative to that clock. All descriptions and locations below are **fictional sample copy**. “Demo Zone” is an area label, not a claim about an actual emergency at a real household.

| ID | Type | Priority | Current status | Demo area | Situation copy | Assignment |
|---|---|---|---|---|---|---|
| 01 | Flood | Critical | Submitted | Riverside Demo Zone | Water has entered the ground floor. Three residents need help reaching higher ground. | None |
| 02 | Fire | High | Submitted | Market Demo Zone | Smoke is coming from a storage area. Residents have moved to an open space. | None |
| 03 | Landslide | High | Submitted | Hillside Demo Zone | Soil and branches are blocking an access road after heavy rain. | None |
| 04 | Other | Medium | Submitted | Central Demo Zone | A fallen tree blocks the entrance to a residential lane. | None |
| 05 | Flood | Critical | Under Verification | Riverside Demo Zone | A household reports rapidly rising water and an older resident who needs assistance. | None |
| 06 | Earthquake | High | Under Verification | School Demo Zone | Cracks and fallen ceiling panels have been reported near a meeting area. | None |
| 07 | Flood | Critical | Verified | Riverbend Demo Zone | Four residents are waiting on an upper floor. The location has been confirmed. | None |
| 08 | Other | Low | Verified | Central Demo Zone | Debris partly blocks a walkway. No trapped residents have been reported. | None |
| 09 | Fire | Critical | Awaiting Assignment | Warehouse Demo Zone | A fire report has been verified. Nearby residents are waiting in an open area. | None |
| 10 | Landslide | High | Awaiting Assignment | Hillside Demo Zone | Road access is blocked. A team is needed to assess a safe approach. | None |
| 11 | Flood | Medium | Awaiting Assignment | South Demo Zone | Two households need assistance moving to the designated meeting point. | None |
| 12 | Flood | Critical | Team Assigned | Riverside Demo Zone | A family is waiting for assistance near the footbridge approach. | Demo Alpha |
| 13 | Fire | High | Team Assigned | Market Demo Zone | The assigned team is preparing to assess the reported smoke. | Demo Bravo |
| 14 | Earthquake | High | Team Assigned | School Demo Zone | A team has been assigned to assess reported structural damage. | Demo Charlie |
| 15 | Flood | Critical | Rescue in Progress | Riverbend Demo Zone | Responders have reached the area and are helping residents leave safely. | Demo Delta |
| 16 | Landslide | High | Rescue in Progress | Hillside Demo Zone | The team is assisting residents around the blocked access road. | Demo Echo |
| 17 | Other | Medium | Rescue in Progress | Central Demo Zone | Responders are assisting a household affected by fallen debris. | Demo Foxtrot |
| 18 | Flood | Medium | Resolved | South Demo Zone | The reported residents have reached the meeting point. Staff closure is pending. | Demo Golf |
| 19 | Fire | High | Resolved | Warehouse Demo Zone | The assigned team has completed the requested assistance. Staff closure is pending. | Demo Hotel |
| 20 | Earthquake | Medium | Closed | School Demo Zone | The response has been completed and the report reviewed and closed. | Demo India, now available |
| 21 | Flood | Low | Closed | Riverside Demo Zone | The response is complete. Staff have reviewed the final update. | Demo Juliet, now available |
| 22 | Other | Low | Rejected | Central Demo Zone | A submitted sample report was rejected after its location could not be confirmed. | None |
| 23 | Flood | Medium | Duplicate | Riverbend Demo Zone | This sample report describes the same incident as demo-report-15. | Link duplicateOf to 15 |
| 24 | Other | Low | Cancelled | South Demo Zone | The resident cancelled the sample report before verification. | None |

Use canonical lowercase type/priority values in storage. Match exact current workflow enums. Do not invent extra statuses such as “Accepted,” “On the way,” or “Complete.” If current valid workflow/schema conflicts with this snapshot, reconcile the fixture through the current rules and document the change rather than weakening validation.

### Expected default counts

With the existing definition excluding Resolved/Closed/Rejected/Duplicate/Cancelled from active:

- **24 total**, **17 active**, **6 active critical**, **15 verified**.
- Status counts: Submitted 4; Under Verification 2; Verified 2; Awaiting Assignment 3; Team Assigned 3; Rescue in Progress 3; Resolved 2; Closed 2; Rejected 1; Duplicate 1; Cancelled 1.
- Needs-verification quick view: **6**, if it continues to mean Submitted plus Under Verification.
- Type counts: Flood 9; Fire 4; Earthquake 3; Landslide 3; Other 5.

Derive displayed numbers from the records. These are fixture assertions, not numbers to paste into components. Mark only Verified/Awaiting Assignment/Team Assigned/Rescue in Progress/Resolved/Closed records as verified; keep the remaining nine unverified unless current domain logic requires otherwise.

### Accounts and ownership

Provide demo identities for one admin, two dispatchers, one DMO, four residents, and team responders as needed. Names such as **Demo Resident A** and **Demo Dispatcher A** make the fiction explicit. Keep credentials local to the demo setup, not displayed in normal production UI or committed as live credentials.

Partition report ownership so all four resident demo accounts have useful histories. Resident A should own 01, 05, 09, 12, 15, and 18, demonstrating new, reviewing, queued, assigned, responding, and resolved reports. Partition the other 18 between Residents B/C/D. Each resident sees only their own private records and addressed notifications.

Use twelve teams Demo Alpha through Demo Lima. One active assignment per team: 12–19 occupy Alpha–Hotel; keep resolved teams busy until the actual close workflow frees them. India/Juliet are available after 20/21 closed, and Kilo/Lima are available. Expected **8 busy, 4 available**, assuming the current workflow retains that invariant. Ensure default responder membership points to Demo Alpha with report 12. Do not populate team.currentReportId inconsistently with reports.

### Histories, notifications, and analytics

- Put creation across 14 days, with recent active reports and older resolved/closed examples. Earlier events precede later events; assignedAt follows creation/verification; update timestamps do not lie in the future.
- Create realistic progress notes such as “Team acknowledged the assignment,” “Team reached the access point,” and “Two residents assisted to the meeting point.” Use rescued counts only on appropriate progress entries; totals derive from updates without double-counting a cumulative value as new people.
- Add matching audit entries with actual demo actor UIDs and safe before/after values. Do not fabricate account-security events as though real operators performed them.
- Add addressed in-app notifications: report received, verified, team assigned, response update, and report resolved, only where the corresponding event exists. Include read and unread states. External delivery remains disabled.
- Build all charts, filters, CSV/PDF demonstration exports, map areas, and summaries from these same records. Mark demo exports clearly and preserve public-coordinate coarsening and DTO privacy.

### Maps and evidence

Use bounded synthetic coordinates around the existing test-map region, with stable offsets for the demo areas. Never use a real household's address or contact as fabricated incident evidence. Public views remain coarse and omit private identifiers/contacts/photos/exact coordinates.

Some reports have zero photos, several have one, and a few have multiple. Use bundled synthetic demonstration assets with embedded “Sample evidence” labeling or a clearly labeled neutral placeholder. Do not use `example.invalid` URLs, random remote stock photos presented as real evidence, or actual private disaster photos. Test viewers using loadable local assets; any signed/protected delivery contract must still be respected.

## Implementation requirements for Claude

1. Inspect in-progress fixes first. Add a dedicated demo-data command/configuration through current schema/repository owners, not hardcoded fallback arrays scattered across web/mobile components.
2. Refuse production credentials/project IDs by default. Stable IDs and a manifest make repeated runs idempotent; do not delete or overwrite unrelated records. A reset removes only demo-owned records in the explicitly selected demo environment.
3. Validate current report/location/team/user/update/notification/audit schemas and workflow invariants. Seed canonical nested location fields; do not perpetuate the old public-map top-level-coordinate test-fixture bug.
4. Use the same data contract across Express, Firebase subscriptions, website, and Flutter. Persist the explicit demo indicator so routed pages and exports cannot lose it.
5. Keep actual loading, empty, error, offline, and validation states testable. A populated demo is not permission to remove empty states or mask a failed request with fictional success.
6. Include an opt-in QA scenario for long text/missing photos/empty filters, separate from the polished default dataset. Do not permanently clutter the product with testing toggles unrelated to its users.
7. Do not seed from the normal application startup. Do not automatically generate emergency reports in response to an outage. Never send real messages, dial synthetic contacts, or change operational hotline settings.

## Acceptance

- Re-running the dedicated demo seed creates no duplicate accounts, reports, histories, or notifications.
- Default counts above are derived and asserted, or deviations are explained against the current domain rules.
- Dispatcher, admin, DMO, responder, and each resident see appropriate populated views with correct permissions.
- The default responder has an actionable assignment; staff can demonstrate a valid lifecycle with an available team, without violating the one-team/one-active-report rule.
- Analytics filters return coherent distributions and dates; exports are explicitly sample output.
- Evidence assets load; report timelines and notification links resolve to authorized records.
- Web and Flutter use the same sample scenario and show an unmistakable demo label.
- A simulated failed read still produces an error/retry; a genuine empty result still produces an empty state.
- No live account, real message, production record, or hotline is changed by local/demo execution.

This content work does not close the pre-deployment audit by itself. Keep security, submission reliability, accessibility, skeletons, and release-verification repairs moving independently.
