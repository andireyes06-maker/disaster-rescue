# More emergency types: design

Status: **approved by Airen (28 Oct 2026). Plan: `docs/superpowers/plans/2026-10-28-emergency-types.md`. No code is written yet.** Date: 28 October 2026. Branch `feat/ui-response-workspace-2026-10-28`, base `54080d9`.

Marked **(my call)** = Airen has not said it; change it if wrong. Everything else comes from Airen's messages or the code.

## Intent
I-Report only offers Flood, Fire, Earthquake, Landslide and Other. Residents with a medical, road or power problem have to pick Other, which hides what the problem is from administrators and responders. Airen's screenshot (a map legend with a TYPE row) shows the wanted set: a medical, a road and a power-line type, added to the existing five. Airen asked for their own, more distinctive names, and for residents to be able to type out an emergency that fits no type. Airen asked for the legend to take inspiration from it, not copy it.

## Goals
1. Residents can report the 3 new types, or type their own short description when none fits (see Other), from the phone app (and from any web form that creates reports).
2. Administrators and responders see each new type with its own icon, colour and label on every screen that shows a type: inbox, details, assignments, maps, analytics, the report-review step.
3. The map legend shows all 8 types as a compact "Type" chip row, in our own style (see Legend).
4. One list of types per platform, with a test that fails if web, API and phone drift apart. Today the list is repeated in 12 places.
5. Nothing existing breaks: old reports, old APKs, rules, indexes.

## Non-goals
- No per-type workflow, team routing, priority defaults or extra fields (for example "number of patients").
- No admin screen to create types at run time.
- No migration or edit of existing reports. No change to the 5 existing keys or their meaning.
- No production data is written by hand or by script. Reports of the new types only appear when residents submit them through the shipped app. (Airen: "you can check it out"; the old line pointed to a questions section that does not exist.)
- The typed text of an Other report is not a filter or analytics category. Those reports count under Other.

## Anti-goals (a failure even if it "works")
- A raw key shown to people (for example `road_hazard report`). Every visible type name goes through a label lookup.
- Colour as the only signal. Colour always travels with the icon and the text.
- New colours so close to existing ones, or to priority colours, that two types or a type and a priority can be confused.
- Pushing or deploying without approval.

## Decisions

**Keys and labels (my call, Airen asked for unique names).** Stored keys stay plain and never change: `medical`, `road_hazard`, `power_line`. Display labels: **Lifeline** (medical), **Roadblock** (road hazard), **Live Wire** (power line). Existing labels unchanged. Order everywhere: the existing four, then Lifeline, Roadblock, Live Wire, Other last. Because the names are less literal, every place that picks a type (phone chooser, any web form) also shows the plain description line under the name, and the icon always travels with it. Labels live only in the registry, so renaming later is one edit.

**Other, typed (new, Airen's request; details my call).** Choosing Other shows a required short field, "What kind of emergency is it?" (3 to 40 characters, trimmed, plain text). It is stored as `typeDetail` on the report, only when type is `other`. Admins and responders see it in the inbox, details, assignments and the review step as "Other: gas leak"; maps, filters, analytics and the legend still group it under Other. API: `typeDetail` is optional so the installed `update14` APK keeps working; the new clients require it; the API rejects it on any other type and strips control characters. Checked: `firebase/firestore.rules` has no type list and no field allow-list, so the rules do not change.

**Sources of truth (my call).** Replace the repeated lists with one registry per platform that holds key, label, short description, icon and colour token:
- web: `web/src/types/domain.ts` plus a small `reportTypes` module (label, lucide icon, DisasterSymbol path, colour class). Screens call it instead of keeping their own maps.
- API: `api/src/domain/validation.js` (zod enum) and any public-data type list.
- phone: `mobile/lib/data/report_models.dart` `reportTypes` and `reportTypeInfo` in `report_flow_page.dart`.
- A parity test reads all three and compares keys, as the existing `areas.dart` parity test does.

**Where the types appear today (from the code review; re-check line numbers):** `web/src/types/domain.ts:3`, `lib/schemas.ts:83`, `features/map/disasterSymbols.tsx:3-9`, `features/map/IncidentMap.tsx:114,120`, `features/reports/IncidentPreview.tsx:15-29`, `ReportQueue.tsx:70-73,259`, `features/analytics/ChartCard.tsx:20` and `AnalyticsPage.tsx:84`, `styles.css:186-190`, `responder-workspace.css:29-31,138-180`, `theme/tokens.css`, `pages/Landing.tsx:68`, `api/src/domain/validation.js:55`, `mobile/lib/data/report_models.dart:3`, `report_flow_page.dart:33-55`, `theme/app_theme.dart` (`AppColors.incident`). Screens that read `report.type` as plain text (for example the assignment heading) need the label lookup. Firestore rules and indexes hold no type list, so they do not change.

**Icons (my call).** Web (lucide): `HeartPulse` for medical, `TriangleAlert` for road hazard, `Zap` for power line. Phone: `medical_services_outlined`, `warning_amber_outlined`, `bolt`. Map symbols (`DisasterSymbol` paths) drawn to match the existing stroke style.

**Colours (my call, Airen delegated; to be checked).** Codex's palette stays: flood blue, fire ember, earthquake earth, landslide green, other violet. Proposed additions: medical = deep rose, road hazard = amber ochre, power line = slate blue. Each needs a text colour that is 4.5:1 on its soft background and an icon colour that is 3:1, checked with the contrast tool before use, and must stay distinguishable from the four priority colours and from fire. If the check fails I adjust the hue and say so.

**Legend (my call, Airen delegated).** A single wrapping row: a small uppercase "Type" label, then one chip per type. Each chip is a tinted tile in that type's own colour with its icon, then the label (our colours, not the screenshot's uniform dark tiles; chips are real text, not an image). It is a legend, not a control, on the responder map; on the admin map and the phone map it stays next to the existing Type filter, which gains the new options. Wraps to two rows at 390 px. Replaces the current vertical symbol lists on the admin map key and the responder legend.

**Phone type chooser.** The "what happened" step lists 8 choices instead of 5. It must not overflow at 200% text, and the Other choice stays last. The `report-type` golden changes; I view the render before regenerating it and record it in `mobile/test/goldens/PROVENANCE.md`.

**Compatibility.** The API must accept the new keys and `typeDetail` before any client sends them. Airen confirmed: a new APK will be built, and the push comes after this work (production deploy, approval at push time). Web and API ship together on one push. The phone app needs a new APK; the installed `update14` APK cannot submit the new types, and shows a report of a new type as "Other" on its list screens (the code already falls back to `other`; the map screen falls back to the raw key, which I will check and fix as part of this). No data migration.

**Analytics and filters.** Type filters and the analytics type chart use the registry, so they gain the three types with no extra rule. Types with zero reports are hidden in the analytics chart and in filter counts (Airen's decision). The legend on the map still lists all 8 types, since it explains symbols rather than counts (my call).

**Copy.** Resident-facing description lines for the chooser (my call): Lifeline "Someone needs urgent medical help", Roadblock "Blocked, damaged or unsafe road", Live Wire "Fallen, sparking or damaged power line", Other "Something else. You will describe it next". The existing line "If you are in danger, call your local emergency hotline" stays; the Lifeline description does not promise a response.

## Left to the builder
Exact SVG path geometry, exact hex values within the contrast limits above, test fixtures, and the order of changes.

## Verification (what "done" means)
- Web: typecheck, full test run, build; tests for the registry, the parity check, the schema (accepts the 8 keys, rejects others), the legend, and a label lookup for every type.
- API: validation tests accept and reject the right keys.
- Phone: `flutter analyze` and `flutter test`, including the type chooser at 200% text and the reviewed golden.
- Rendered check of the legend, inbox, responder map and phone chooser at 390 and 1440 px, with contrast measured.
- Stated plainly at the end: not run on a device, not run against production.
