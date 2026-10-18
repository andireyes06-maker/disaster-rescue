# Website finished-look review — 18 October 2026

## Verdict

Most page layouts now look finished and consistent. I would not call the currently populated website completely presentation-ready: QA reports and test accounts are prominent in several normal views. The remaining visual work is concentrated finishing work, rather than evidence that every page needs another redesign.

This is a visual judgment of the current local working tree, not a deployment approval. No product code or data was changed in this review.

## Design language

The current Geist typography, violet actions, deep-indigo navigation, pale page backgrounds, white surfaces, icons, and restrained borders form a coherent system. Public pages explain the service; resident pages emphasize tasks; staff pages emphasize operational information. Those differences are appropriate. Empty space on a short operational page does not by itself mean the page is unfinished.

The landing now has a substantial header, opening message, animated product film, workflow, resident explanation, staff roles, questions, access/privacy information, and footer. Its composition reads as complete. The schematic film remains deliberately illustrative; more sophisticated artwork would be an optional creative improvement, not a demonstrated missing section.

## Page-by-page assessment

“Finished layout” means the captured normal state looks intentional; it does not certify every interaction or backend behavior.

| Page | Visual verdict | Remaining work / observation |
| --- | --- | --- |
| Landing `/` | Finished layout | Complete section sequence and consistent desktop/phone composition. Optional: more distinctive film artwork; the small internal film text should remain supplementary to the external explanation. |
| Sign in `/login` | Finished layout | Clear hierarchy, focused form, supporting panel, phone form-first order. No new visual defect established. |
| Register `/register` | Finished layout | Required-field convention and cohesive form treatment. Error-state and successful provisioning behavior were not re-exercised in this visual pass. |
| Forbidden `/forbidden` | Finished layout | Deliberately compact explanation and recovery action. |
| Unknown address / 404 | Finished layout | Deliberately compact recovery page. Tested `/audit-address-not-found`. |
| Resident hub `/my` | Layout finished; content needs finishing | Several reports visibly say “Fixture street.” Use a clean isolated presentation dataset. |
| Report form `/my/report` | Finished layout | Numbered task sections, icon choices, required marks, location, attachments, contact details, and submit area form a complete page. Phone page is long because it contains the full form; this is not a missing-design finding. |
| Resident detail `/my/reports/:id` | Layout finished; evidence content needs finishing | Clear report/status/activity structure. Current attachment is an illustration labeled sample evidence, which makes the normal populated state feel like a fixture. Do not portray generated evidence as a real incident photo. |
| Dispatcher dashboard `/dashboard` | Layout finished; content needs finishing | Most obvious unfinished impression: newest reports expose test scenario names, timestamp suffixes, and fixture addresses in both queue and selection. |
| Operational map `/map` | Finished layout | Map, filtering, and incident context follow the staff system. Underlying report data still requires presentation cleanup. |
| Monitor `/monitor` | Finished layout | Read-only purpose is clear; map and severity legend are coherent at both sizes. |
| Staff incident `/incidents/:id` | Layout finished; evidence content needs finishing | Report, status, actions, and updates read coherently. Sample-evidence attachment affects the presentation. Dispatcher and DMO variants inspected. |
| Assignments `/assignments` | Finished, utilitarian layout | Responder has a meaningful assignment with status, location, acknowledgment, and update action. Admin's no-team state is intentional. A short assignment list leaves desktop space; no decorative filler is needed. |
| Teams `/teams` | Finished, utilitarian layout | Consistent operational list and controls. No new visual defect established. |
| Users `/users` | Layout finished; content needs finishing | Test account names make the view look like QA rather than a prepared product presentation. |
| Analytics `/analytics` | Finished, utilitarian layout | Summary, filters, exports, charts, and accessible tables are present. The phone layout is lengthy but coherent. Category-label capitalization could receive optional copy polish. |
| Audit `/audit` | Finished, utilitarian layout | Readable operational table/filter surface. Phone filters are tall; a compact filter layout is an optional density improvement, not a demonstrated broken layout. |
| Admin `/admin` | Layout finished; content and configuration need finishing | All four sections inspected expanded: accounts, teams, health/settings, audit/exports. Accounts expose QA names. Hotline and resident-notice fields are empty in this environment; these require owner-approved information, not invented content. |

## Findings

Only one confirmed cross-page visual-content finding is recorded. Aesthetic preferences above are not being promoted into defects to fill a quota.

| # | Problem | Evidence | Proposed change | Scope | Confidence |
| --- | --- | --- | --- | --- | --- |
| 1 | Test scenarios and test identities occupy normal populated views, undermining the requested professional presentation. | `admin-dashboard-1440.png` and `dispatcher-dashboard-390.png`: “Lost-response check 1792284333760”, “Fixture for the cancel-refused check”, “Fixture street”. `resident-my-390.png`: repeated fixture addresses. `admin-accounts-390.png` and Users captures: “Audit Tester”, “Fresh Two”. This conflicts with the requested finished product copy and removal of demo/filler presentation. | Separate QA scenarios from a repeatable, isolated Harbor presentation dataset with credible fictional names, descriptions, addresses, and coherent report histories. Preserve QA evidence and records; do not delete or silently relabel operational records. Keep illustrative attachments truthful. | Local fixture/presentation data and reset workflow; affected queue, resident, account, and evidence views. A product-layout rewrite is not established as necessary. | High for visible content; this does not establish that production contains the same data. |

## Improve first

Prepare an isolated presentation dataset and recapture the affected pages. This should produce the largest immediate improvement in the “finished product” impression. Then make a separate creative decision about whether the schematic landing film needs richer art direction; the current layout is complete.

## Evidence and limits

- Fresh Chromium capture matrix: 46 route/role/width cases, covering 18 page surfaces at 390 and 1440 CSS pixels. See `surfaces.json` and the individual PNGs.
- Expanded Admin inspection: eight captures across the four sections and both widths; see `admin-interiors.json`.
- Normal motion enabled. Entry animations were recorded by the capture script. Static screenshots cannot establish motion quality, and this pass did not re-test bell interruption, every interaction, or animation performance. No reduced-motion audit was performed.
- All 46 route cases recorded zero axe findings, zero horizontal overflow, zero captured page runtime errors, and zero API writes. These checks support the review but do not determine aesthetic quality or prove full accessibility.
- Reviewed full-page captures and section/contact sheets, including the lower landing, full report form, and analytics. Capture sheets are scaled for comparison; individual PNGs retain detail.
- Local emulator accounts only; no production actions, report submissions, saves, commits, pushes, or deployment. No source changes, so the test suite was not rerun for this read-only review.
- Loading/error/long-history edge cases, Firefox/WebKit, physical devices, and Flutter were not freshly verified here. Earlier ledgers are historical evidence, not new results from this review.
