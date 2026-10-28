# More Emergency Types Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Lifeline, Roadblock and Live Wire as report types, let residents type their own description when they choose Other, and show every type with its own icon, colour and label everywhere a type is shown.

**Architecture:** One type registry per platform (API `reportTypes.js`, web `reportTypes.ts`, phone `report_models.dart`), each holding key, label and description, with a parity test that fails when they drift. Every screen shows a type through a label lookup, never the raw key. `typeDetail` is a new optional report field, valid only when `type` is `other`.

**Tech Stack:** Node API with zod 4 (vitest), React + TypeScript web (vitest, lucide-react, Leaflet), Flutter phone app (flutter_test, goldens).

**Spec:** `docs/superpowers/specs/2026-10-28-emergency-types-design.md` (approved by Airen, 28 Oct 2026).

## Global Constraints

- Stored keys: `flood`, `fire`, `earthquake`, `landslide`, `medical`, `road_hazard`, `power_line`, `other`. The 5 existing keys never change.
- Labels: Flood, Fire, Earthquake, Landslide, Lifeline, Roadblock, Live Wire, Other. Order everywhere: flood, fire, earthquake, landslide, medical, road_hazard, power_line, other.
- Chooser descriptions: Lifeline "Someone needs urgent medical help"; Roadblock "Blocked, damaged or unsafe road"; Live Wire "Fallen, sparking or damaged power line"; Other "Something else. You will describe it next". Existing descriptions unchanged. Lifeline does not promise a response. "If you are in danger, call your local emergency hotline" stays.
- `typeDetail`: 3 to 40 characters, trimmed, plain text, control characters stripped. Stored only when `type` is `other`. Optional at the API (installed `update14` APK sends none); required by the new web schema and new phone app.
- Icons: web lucide `HeartPulse` (medical), `TriangleAlert` (road_hazard), `Zap` (power_line); phone `Icons.medical_services_outlined`, `Icons.warning_amber_outlined`, `Icons.bolt`.
- Colours: existing five unchanged. Proposed new: medical deep rose, road_hazard amber ochre, power_line slate blue. Text on soft background at least 4.5:1, icon at least 3:1, measured with `mcp__plugin_antislop_antislop-contrast__check_contrast`. Must stay distinguishable from fire and from the four priority colours. Colour always travels with icon and text.
- Legend: one wrapping row, small uppercase "Type" label then one chip per type (tint, icon, label), all 8 types always listed, wraps to two rows at 390 px. A legend on the responder map, not a control.
- Analytics chart and filter counts hide types with zero reports.
- Other reports count under Other in maps, filters, analytics and the legend. `typeDetail` is not exposed on the public incidents feed.
- No migration, no per-type workflow, no production data written, no push or deploy without Airen's approval. Firestore rules and indexes hold no type list (checked: `firebase/firestore.rules` has no type or key allow-list), so they do not change.
- Copy: no em dashes in user-facing text. Web tests run with `--maxWorkers=2`; typecheck and tests are run as separate commands. Do not regenerate goldens without viewing them. Do not revert the Zod 4 migration.

## Review Focus

- `typeDetail` of whitespace only, 2 characters, 41 characters, or containing control characters or markup (`<b>x</b>`): rejected or cleaned at the API; rendered as plain text, never HTML. Tests in Tasks 1 and 4.
- `typeDetail` sent with a non-`other` type, or `other` sent with no detail by the installed APK: first is rejected with 400; second is accepted and shown as plain "Other". Task 1.
- A stored report whose type is unknown to a client (a future key, or empty): shown as "Other", never as the raw key or a crash, on web and phone. Tasks 4 and 6.
- A retried submission with the same idempotency key but a different `typeDetail`: not treated as the same submission (the fingerprint covers validated data). Task 1.
- Phone chooser with 8 choices at 200% text and 390 px width, and a saved draft that holds `other` plus text surviving an app restart. Task 6.

## File Structure

- Create `api/src/domain/reportTypes.js`: API registry, `REPORT_TYPE_KEYS`, `reportTypeLabel(type, typeDetail)`.
- Create `web/src/lib/reportTypes.ts`: web registry, label helper, icon and CSS class lookup.
- Create `web/src/features/map/TypeLegend.tsx`: the chip row.
- Modify `mobile/lib/data/report_models.dart` (registry map, draft field), `mobile/lib/features/report/report_flow_page.dart` (chooser), `mobile/lib/theme/app_theme.dart` (colours).
- Create `api/test/domain/reportTypes.parity.test.js`: compares the three registries.
- Existing tests next to each changed file; new tests named in each task.

---

### Task 1: API accepts the new types and `typeDetail`

**Files:**
- Create: `api/src/domain/reportTypes.js`
- Modify: `api/src/domain/validation.js:55` (type enum, new `typeDetail`), `api/src/services/reportService.js:46` (`buildReport`), `api/src/routes/reports.js:38` (pass `typeDetail` through), CSV export (`api/src/routes/export.js:24` and the `toCsv` it calls)
- Test: `api/test/domain/validation.test.js`, `api/test/domain/reportTypes.test.js`, plus the existing reports route test file under `api/test/routes/`

**Interfaces:**
- Produces: `REPORT_TYPES: readonly { key: string; label: string; description: string }[]` in the order above; `REPORT_TYPE_KEYS: string[]`; `reportTypeLabel(type: string, typeDetail?: string): string` returning the label, or `Other: <detail>` for `other` with a detail, or `Other` for any unknown key.
- Produces: `parseReportInput` output gains `typeDetail?: string`.

- [ ] **Step 1: Write failing tests.** `reportTypes.test.js`: `REPORT_TYPE_KEYS` equals the 8 keys in order; `reportTypeLabel('road_hazard')` is `Roadblock`; `reportTypeLabel('other','gas leak')` is `Other: gas leak`; `reportTypeLabel('zzz')` is `Other`. `validation.test.js` (base input as in `areas.parity.test.js`): each of the 8 keys parses; `'tornado'` throws 400; `{type:'other', typeDetail:'  gas leak  '}` yields `typeDetail 'gas leak'`; `typeDetail` of `'ab'`, 41 characters, and `'   '` throw 400 when type is `other`; `{type:'flood', typeDetail:'x y z'}` throws 400; `{type:'other'}` with no detail parses with `typeDetail` undefined; control characters (`'gas\u0000 leak'`) are stripped.
- [ ] **Step 2: Run** `cd api && npx vitest run test/domain/validation.test.js test/domain/reportTypes.test.js`. Expected: FAIL.
- [ ] **Step 3: Implement** the registry and `reportTypeLabel` in `reportTypes.js`. In `validation.js` replace the enum with `z.enum(REPORT_TYPE_KEYS)` and add `typeDetail` using the same `sanitizeText` preprocess pattern as `placeName`, then a `.superRefine` on the object: for `other`, a present detail must be 3 to 40 characters after trimming; for any other type a present detail is a 400 issue.
- [ ] **Step 4: Run Step 2 again.** Expected: PASS.
- [ ] **Step 5: Write failing route/service tests.** Creating a report with `type:'power_line'` stores `type 'power_line'`; with `type:'other', typeDetail:'gas leak'` stores `typeDetail 'gas leak'`; a non-`other` report stores no `typeDetail` field; two submissions with the same key and different `typeDetail` give different `submissionFingerprint` values. In the export test, a `road_hazard` row has `Roadblock` in the type column and an `other` row with detail reads `Other: gas leak`. Public incidents feed: a report with `typeDetail` returns no `typeDetail`.
- [ ] **Step 6: Implement** `buildReport` (`if (data.typeDetail) report.typeDetail = data.typeDetail;`), the route pass-through, and `reportTypeLabel` in the CSV type column. Check the public incident mapper at `api/src/services/publicIncidentService.js:31` still returns only `type`.
- [ ] **Step 7: Run** `cd api && npx vitest run`. Expected: all pass, only the known pre-existing skip.
- [ ] **Step 8: Commit** `feat(api): accept medical, road hazard and power line reports, and a typed Other`.

---

### Task 2: Web registry, domain type and schema

**Files:**
- Create: `web/src/lib/reportTypes.ts`
- Modify: `web/src/types/domain.ts:3` (derive `REPORT_TYPES` from the registry; add `typeDetail?: string` to the report type near line 55), `web/src/lib/schemas.ts:83`
- Test: `web/src/lib/reportTypes.test.ts`, `web/src/lib/schemas.test.ts`

**Interfaces:**
- Produces: `REPORT_TYPE_LIST: readonly { key: ReportType; label: string; description: string; icon: LucideIcon; className: string }[]`; `typeLabel(type: string, typeDetail?: string): string` (same rules as the API helper); `typeMeta(type: string)` returning the entry or the `other` entry for unknown keys. `REPORT_TYPES` stays exported from `domain.ts` as `readonly ReportType[]` so existing imports keep working.
- `className` values: `type-icon--<key with underscores kept>`; the CSS in Task 3 defines them.

- [ ] **Step 1: Write failing tests.** Registry has the 8 keys and labels in order; `typeMeta('nope').key` is `other`; `typeLabel('other','gas leak')` is `Other: gas leak`; `typeLabel('', undefined)` is `Other`. Schema: the 8 keys pass, `'tornado'` fails; `other` with no `typeDetail` fails with message `Say what kind of emergency this is.`; `other` with `'ab'` fails with `Describe it in 3 to 40 characters.`; `other` with 41 characters fails; `flood` with a detail passes and drops it.
- [ ] **Step 2: Run** `cd web && npx vitest run src/lib/reportTypes.test.ts src/lib/schemas.test.ts --maxWorkers=2`. Expected: FAIL.
- [ ] **Step 3: Implement** the registry (import the three icons from `lucide-react`, keep the existing four icons currently in `IncidentPreview.tsx:15-29`), `typeLabel`, `typeMeta`; derive `REPORT_TYPES`; extend `webReportSchema` with `typeDetail` and a refine on `type === 'other'`.
- [ ] **Step 4: Run Step 2 again, then** `npx tsc --noEmit` (separate command). Expected: PASS, no type errors. If tsc flags other files using a literal union, fix them to use `ReportType`.
- [ ] **Step 5: Commit** `feat(web): report type registry and typeDetail schema`.

---

### Task 3: Symbols, colours and styles for the three types

**Files:**
- Modify: `web/src/features/map/disasterSymbols.tsx:3-9` (three path sets), `web/src/theme/tokens.css:22-29` (new `--color-medical`, `--color-medical-soft`, `--color-road`, `--color-road-soft`, `--color-power`, `--color-power-soft`), `web/src/styles.css:186-190`, `web/src/responder-workspace.css:29-31,138-180`, `web/src/product.css:69-72`, `web/src/features/analytics/ChartCard.tsx:20` (`CHART_COLORS` gets `medical`, `road_hazard`, `power_line`)
- Test: `web/src/features/map/disasterSymbols.test.tsx`

**Interfaces:**
- Produces: CSS classes `type-icon--medical|road_hazard|power_line`, `response-type--medical|road_hazard|power_line` (text, and the symbol-background variants used by `response-row__symbol` and `response-incident-symbol`), `emergency-type--*` where `product.css` uses it. `DisasterSymbol` and `disasterSymbolHtml` render a distinct drawing for each of the 8 types.

- [ ] **Step 1: Write failing test.** For each of the 8 keys, `disasterSymbolHtml(key)` returns markup containing at least one `<path`, and the 8 outputs are pairwise different; an unknown key renders the `other` drawing.
- [ ] **Step 2: Run** `npx vitest run src/features/map/disasterSymbols.test.tsx --maxWorkers=2`. Expected: FAIL (new keys fall back to `other`, so the pairwise check fails).
- [ ] **Step 3: Implement** the three `PATHS` entries in the existing 24-unit, 1.8 stroke style: a heart with pulse line, a warning triangle with a barrier bar, a lightning bolt over a wire. Widen `PATHS` to `Record<ReportType, string[]>` (already is).
- [ ] **Step 4: Pick colours.** Start from deep rose `#A3294F` on soft `#FBE9EE`, amber ochre `#8A5A00` on soft `#FBF0D9`, slate blue `#3F5A78` on soft `#E8EEF5`. Run the contrast tool for each text/soft pair (need 4.5:1) and each icon/soft pair (3:1), and for each new colour against fire `#9C391B`, the four priority colours in `markerStyle`, and the existing five (must not read as the same hue at a glance; adjust hue and say so in the commit if one fails). Record the measured ratios in `design-plans/emergency-types-2026-10-28/CONTRAST.md`.
- [ ] **Step 5: Implement** tokens and the CSS classes above, copying the structure of the `flood` rules. Add the three keys to `CHART_COLORS`, using the same colours.
- [ ] **Step 6: Run** the Step 2 test, then `npx tsc --noEmit`. Expected: PASS.
- [ ] **Step 7: Commit** `feat(web): symbols, colours and styles for Lifeline, Roadblock and Live Wire`.

---

### Task 4: Every web screen shows a label, never a key

**Files:**
- Modify (replace each raw `report.type`, `r.type`, `c.type` shown as text or used in a `title`/`aria-label`/search string with `typeLabel(...)`, and icon/class lookups with `typeMeta`): `web/src/features/reports/IncidentPreview.tsx:15-29,59-61`, `ReportQueue.tsx:46-80,164,259`, `IncidentDetails.tsx:84,105,274-296`, `web/src/features/responder/ClosedReportDetail.tsx:40`, `AssignmentRows.tsx:14`, `AssignmentsPage.tsx:101,162,218,255,285`, `AssignmentMap.tsx:25,41`, `TeamMap.tsx:40-41`, `web/src/features/map/IncidentMap.tsx:91,114,145`, `web/src/features/analytics/AnalyticsPage.tsx:82-84` (options use labels) and the by-type chart data (labels through `typeLabel`), `web/src/pages/Landing.tsx` (leave the three sample incidents as they are; they are fixed sample copy)
- Test: `web/src/features/reports/typeLabels.test.tsx` (new), plus existing test files for each touched component updated where they asserted raw keys

**Interfaces:**
- Consumes: `typeLabel`, `typeMeta` from Task 2; CSS from Task 3.

- [ ] **Step 1: Write failing tests** in `typeLabels.test.tsx`, using `fixtures.ts` with `type:'road_hazard'`, then `type:'other', typeDetail:'gas leak'`, then `type:'zzz'`. For each of `IncidentPreview`, `ReportQueue` (row and the Type filter options), `IncidentDetails` (both Type facts and the heading), `AssignmentRows`, `AssignmentsPage` heading, `TeamMap` selection, `IncidentMap` marker title: the rendered text contains `Roadblock`, then `Other: gas leak`, then `Other`, and never contains `road_hazard` or `zzz`. A report with `typeDetail:'<b>x</b>'` renders the literal characters, with no `<b>` element. Searching the queue for `roadblock` finds the road-hazard report. The by-type chart for stats `{road_hazard: 2}` shows `Roadblock` and no row for types with zero.
- [ ] **Step 2: Run** `npx vitest run src/features --maxWorkers=2`. Expected: FAIL in the new file only.
- [ ] **Step 3: Implement** the replacements listed in Files. Where a heading read `{type} report`, it becomes `{typeLabel} report` (for Other with a detail: `Other: gas leak report`). Remove the per-file `TYPE_ICONS`/`TYPE_CLASS` maps in favour of `typeMeta`. Confirm the stats mapping drops zero-count types; if the API returns them, filter `count > 0` in `AnalyticsPage.tsx`.
- [ ] **Step 4: Run** the full web tests, `npx vitest run --maxWorkers=2`, then `npx tsc --noEmit` separately. Expected: all pass (583 before this work, plus new), no type errors.
- [ ] **Step 5: Commit** `feat(web): show type labels and the typed Other everywhere`.

---

### Task 5: The Type legend

**Files:**
- Create: `web/src/features/map/TypeLegend.tsx`, `web/src/features/map/typeLegend.css` (or the nearest existing map stylesheet)
- Modify: `web/src/features/map/IncidentMap.tsx:118-120` (replace the vertical "Disaster type" group), `web/src/features/responder/AssignmentMap.tsx:72` (replace `.response-legend-types` for types only; the priority row and HQ entry stay)
- Test: `web/src/features/map/TypeLegend.test.tsx`

**Interfaces:**
- Produces: `TypeLegend(): JSX.Element` with no props. Renders `<ul aria-label="Emergency types">` preceded by a visible "Type" label; one `<li>` per registry entry containing `DisasterSymbol` and the label.
- Consumes: `REPORT_TYPE_LIST`, `DisasterSymbol`.

- [ ] **Step 1: Write failing test.** Renders 8 list items with the 8 labels in order; each item has an `svg`; the "Type" label is present; no element is a button or has `onClick`/role button (it is a legend, not a control).
- [ ] **Step 2: Run** `npx vitest run src/features/map/TypeLegend.test.tsx --maxWorkers=2`. Expected: FAIL.
- [ ] **Step 3: Implement** the component and CSS: flex row with `flex-wrap: wrap`, each chip a tinted tile from the type's `-soft` and colour tokens with icon then label, label text 4.5:1 on the tile. Use it in both maps; the admin map keeps its existing Type filter next to it.
- [ ] **Step 4: Run** the Step 2 test and the whole `src/features/map` and `src/features/responder` tests. Expected: PASS; update any assertion that looked for the old list.
- [ ] **Step 5: Rendered check.** Start the web dev server, open the admin map and the responder map at 390 px and 1440 px (signed in with a sample account; passwords are in `~/Documents/i-report-sample-logins.txt`, never print them). Confirm the row wraps to two lines at 390 px without horizontal scroll, and screenshot into `design-plans/emergency-types-2026-10-28/`. If a signed-in view is not possible, say so in the handoff.
- [ ] **Step 6: Commit** `feat(web): compact Type legend on both maps`.

---

### Task 6: Phone app registry, colours and fallbacks

**Files:**
- Modify: `mobile/lib/data/report_models.dart:3` (registry and labels), `mobile/lib/features/report/report_flow_page.dart:33-55` (`reportTypeInfo` gains three entries), `mobile/lib/theme/app_theme.dart:24-30` (`AppColors.incident` gains `medical`, `road_hazard`, `power_line` using the Task 3 colours; note it is called with the label today, so switch it to take the key), `mobile/lib/features/map/incident_map_page.dart:248,270,303,322` (fallback to the `other` entry instead of the raw key), `mobile/lib/data/services.dart:93,114,714` and `ReportSummary` plus the report detail model (carry `typeDetail`)
- Test: `mobile/test/report_type_test.dart` (new), `mobile/test/incident_map_page_test.dart`, `mobile/test/my_reports_test.dart`

**Interfaces:**
- Produces: `const reportTypes = ['flood','fire','earthquake','landslide','medical','road_hazard','power_line','other'];` `const reportTypeLabels = <String, String>{...}` one `'key': 'Label',` per line (the parity test reads this); `String reportTypeLabel(String type, [String? typeDetail])`; `ReportSummary.typeDetail` and the detail model's `typeDetail` as `String?`.
- Consumes: nothing from earlier tasks.

- [ ] **Step 1: Write failing tests.** `reportTypeLabel('road_hazard')` is `Roadblock`; `('other','gas leak')` is `Other: gas leak`; `('zzz')` is `Other`. A `my_reports` row for a `power_line` report shows `Live Wire`; one for an unknown type shows `Other`. The map page marker label for an unknown type is `Other`, not the raw key. `AppColors.incident('medical')` differs from every other key's colour.
- [ ] **Step 2: Run** `cd mobile && flutter test test/report_type_test.dart test/incident_map_page_test.dart test/my_reports_test.dart`. Expected: FAIL.
- [ ] **Step 3: Implement** as listed. Parse `typeDetail` from the API and Firestore maps next to `description` in `services.dart`.
- [ ] **Step 4: Run** the Step 2 command, then `flutter analyze` (separately). Expected: PASS, clean.
- [ ] **Step 5: Commit** `feat(mobile): type registry, colours and label fallbacks for the new types`.

---

### Task 7: Phone chooser and the typed Other

**Files:**
- Modify: `mobile/lib/data/report_models.dart` (`ReportDraft` gains `typeDetail`, in the constructor, `toJson` near line 90 and `fromJson` near line 98), `mobile/lib/features/report/report_flow_page.dart` (chooser lists 8 choices, a `typeDetail` field when Other is selected, review row near line 712, request body near line 323), the API body builder in `mobile/lib/data/api_client.dart` if it lists fields
- Test: `mobile/test/report_flow_test.dart`, `mobile/test/draft_store_test.dart`, golden under `mobile/test/goldens/` (`report-type`), `mobile/test/goldens/PROVENANCE.md`

**Interfaces:**
- Consumes: `reportTypes`, `reportTypeInfo`, `reportTypeLabel` from Task 6.
- Produces: `validateTypeDetail(String? value) -> String?` in `report_models.dart` (null when valid; messages `Say what kind of emergency this is.` for empty and `Use 3 to 40 characters.` otherwise), used by the form and tested directly.

- [ ] **Step 1: Write failing tests.** Chooser shows 8 tiles in order with the Lifeline, Roadblock and Live Wire description lines, Other last. Choosing Other shows the field "What kind of emergency is it?", and Next is blocked until `validateTypeDetail` passes; choosing another type hides it and clears it. The submitted body for Other includes `typeDetail` trimmed; for Roadblock includes none. The review step shows `Other: gas leak`. A saved draft with `type 'other'` and `typeDetail 'gas leak'` restores both after `ReportDraft.fromJson(toJson())`. The chooser has no overflow at text scale 2.0 and width 390 (pump with `MediaQuery` `TextScaler.linear(2.0)` and assert no exception, scrolls to reach Other). `validateTypeDetail` covers null, `'  '`, `'ab'`, 41 characters, `'gas leak'`.
- [ ] **Step 2: Run** `flutter test test/report_flow_test.dart test/draft_store_test.dart`. Expected: FAIL.
- [ ] **Step 3: Implement.** Make the type list scrollable inside the existing step layout so 8 tiles never overflow. Keep keys `Key('description')` and existing keys unchanged.
- [ ] **Step 4: Run** the Step 2 command. Expected: PASS except the golden.
- [ ] **Step 5: Golden.** Run `flutter test --update-goldens test/report_flow_test.dart` only for the `report-type` golden, then open the new PNG with the Read tool and check 8 tiles, Other last, nothing clipped. Record date, command and the reason in `mobile/test/goldens/PROVENANCE.md`. If the render looks wrong, fix the layout and do not accept it.
- [ ] **Step 6: Run** the full suite, `flutter test`, then `flutter analyze` separately. Expected: 281 plus new tests pass, analyze clean.
- [ ] **Step 7: Commit** `feat(mobile): eight-type chooser and a typed Other`.

---

### Task 8: Parity test, full verification, APK and handoff

**Files:**
- Create: `api/test/domain/reportTypes.parity.test.js` (same pattern as `areas.parity.test.js`: `readFileSync` of each platform file)
- Modify: `HANDOFF.md`, `docs/history.md` (archive the previous "Start here"), the spec status line (change "draft" to "approved and built")

- [ ] **Step 1: Write the parity test.** Reads `web/src/lib/reportTypes.ts` and `mobile/lib/data/report_models.dart`; extracts `key: 'x'` / `label: 'Y'` pairs from the web file and `'x': 'Y',` lines inside `reportTypeLabels` from the phone file; expects keys and labels equal to `REPORT_TYPES` from `api/src/domain/reportTypes.js`, in order. Also expects the phone `reportTypes` list to equal the keys.
- [ ] **Step 2: Run** `cd api && npx vitest run test/domain/reportTypes.parity.test.js`. Expected: PASS. Then break one label in the web file temporarily and confirm it fails, then restore it.
- [ ] **Step 3: Full checks, each as its own command:** `cd api && npx vitest run`; `cd web && npx tsc --noEmit`; `cd web && npx vitest run --maxWorkers=2`; `cd web && npm run build`; `cd mobile && flutter analyze`; `cd mobile && flutter test`. Expected: all green.
- [ ] **Step 4: Rendered check** of the legend, inbox, responder map and phone chooser at 390 and 1440 px, with contrast ratios from Task 3 on file. State plainly in the handoff what was not run: no physical device, nothing against production, `build:release` needs deploy env vars.
- [ ] **Step 5: Build the APK** with the recipe in `docs/deploy.md`: `cd mobile && flutter build apk --release`. Report the output path, size and SHA-256 and note it is unsigned for the store if the signing config is missing. Do not install or upload it.
- [ ] **Step 6: Update HANDOFF.md** ("Start here" at most 60 lines: status, next step, open questions, gotchas, resume prompt), move the old content to `docs/history.md`, and commit with the work. `docs/documentation/handoff.md` has another session's uncommitted edits; do not stage it.
- [ ] **Step 7: Commit** `test: type registry parity, handoff for emergency types`. Then stop: the push deploys production, so ask Airen for approval and for the order (web and API together, one push) before any `git push`.

---

## Self-Review

- **Spec coverage:** goals 1 (Tasks 1, 2, 6, 7), 2 (3, 4, 6), 3 (5), 4 (8 parity, registries in 1, 2, 6), 5 (1 old APK and no migration, 6 fallbacks). Typed Other (1, 2, 4, 7). Compatibility, APK, push gate (1, 8). Zero-hidden (4). Copy (7, Global Constraints). Rules and indexes: verified no type list, no task.
- **Types:** `typeLabel` (web), `reportTypeLabel` (API, phone), `typeMeta`, `REPORT_TYPE_LIST`, `reportTypeLabels` and `validateTypeDetail` are each defined once and used with the same names after.
- **Open assumptions to confirm during execution:** the `toCsv` location and column layout (Task 1), whether the stats API already omits zero counts (Task 4), and the exact request-body builder on the phone (Task 7).
