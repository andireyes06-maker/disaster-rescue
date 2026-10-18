# Mobile redesign: first design round

For Airen, October 16, 2026. **Design only. No Flutter or website source edits.** Airen requested a final web enhancement, then a start on mobile. The liked web direction is the strong indigo/violet integrated workbench; carry its identity, not its desktop layout.

## Current direction approval

Airen explicitly said “i love the web design, now we refine the mobile design.” Treat `dashboard-concept-v11-final-web.png` as the accepted web visual reference. This approves its design direction, not implementation, production readiness, or application-code changes. Continue refining mobile within that identity rather than reopening the web palette.

The second mobile round keeps the three chosen screens and improves native layout: four accurate progress segments, more compact category rows, consistent 40dp icon tiles, 48dp touch targets, clearer review/edit grouping, and a stable bottom action area. Keep call access visible. The focused review continues to propose hiding bottom navigation; preserve Back and the existing draft state if that behavior is later accepted and implemented.

[Mobile refinement concept 2](mobile-concept-v2-refined.png) reduces field icon clutter, makes editing affordances clearer, shortens category descriptions, and aligns bottom navigation treatment. The requested four-segment progress is still rendered as three segments in both flow screens; this is a known mockup defect, not a changed workflow. Exact touch dimensions, font metrics, and solid fills remain unverified. Keep the four-step specification authoritative. This image is a draft for visual review, not a final compliant native design or emulator capture.

## Actual application inspected

Flutter Material 3, Firebase Auth/Firestore, Provider, API client, flutter_map, geolocator, image_picker, drafts in shared_preferences, notifications, and hotline dialing. Evidence: `mobile/pubspec.yaml`, `mobile/lib/main.dart`, `mobile/lib/auth/role_gate.dart`, and feature files.

The current theme in `mobile/lib/theme/app_theme.dart` is teal/cream. The proposed indigo/violet scheme is a future replacement, not an installed theme. No custom font assets are declared in pubspec. Use native Material type roles as the initial mobile proposal; assess Inter later as a real font specimen rather than trusting raster lettering.

## Navigation that must survive

- Resident shell: **Report, My Reports, Profile**, backed by `features/home/resident_home.dart` and an IndexedStack that preserves child state.
- Resident reporting: four existing steps, **What is happening? / Where is it? / Tell us more / Check and send**, in `features/report/report_flow_page.dart`.
- Responder shell: **Assigned, Notifications**, in `auth/role_gate.dart`; assigned incident details, map, and operation forms already exist.
- Staff roles without mobile work receive the existing web-dashboard notice. Do not grant them new mobile permissions through visual redesign.

Do not insert a decorative home dashboard before Report. Do not copy the desktop sidebar onto a phone or invent extra bottom destinations solely for symmetry.

## Visual direction

Deep indigo top app bar, violet primary controls and selection, near-white neutral canvas, white reading surfaces. Colored wave/flame/building icons share the web family. Keep semantic red/amber separate. Use restrained color on forms and long text; strong branding belongs in app bars, primary actions, and selection.

Map values into Material color roles rather than pasting independent hex values onto each widget. Include a deliberately designed dark scheme and verify both later. Preserve stable emergency semantics if dynamic color is considered; do not recolor priority based on wallpaper.

Compact screens use Material NavigationBar, normal top app bars, SafeArea/window insets, 48dp minimum targets, and system Back. iPhone builds must retain safe areas, edge-swipe expectations, text scaling, and Reduce Motion. Tablet layouts require a separate adaptive treatment if tablets are in scope.

## First three concepts

1. **Report, step 1:** app identity, clear hotline entry, progress 1 of 4, What is happening?, five labeled category choices with meaningful icons, visible chosen state, Continue near the thumb, existing bottom navigation. Do not use red for every category or hide the hotline behind menu navigation.
2. **Check and send, step 4:** concise situation, saved location, contact details, optional photos if present, direct edit affordances, accurate delivery disclaimer, and one Send report action. Preserve required fields and existing API validation. No fake rescue ETA, dispatch guarantee, or automatic priority selection.
3. **My Reports:** selected bottom destination, readable report records with reference/location/time/status, and explicit report-detail links. Distinguish Submitted from Verified and Team Assigned; never imply a submitted record has been accepted for rescue. Include a designed empty/error/loading variation in the later prototype.

The reporting form currently requires contact name and a validated phone number; the web form has different optional-contact behavior. Preserve the actual mobile validation unless product requirements are explicitly changed. Existing saved drafts exclude photo attachments in the inspected draft payload; never promise photos will be restored from a text draft.

## Remaining screen coverage

| Flow | Design work |
|---|---|
| Sign-in/register | Clear identity, autofill, keyboard-safe layout, role-appropriate help, error and pending states |
| Location | GPS permission explanation, denied/unavailable recovery, actual map/coordinate selection, address/landmark context |
| Details/evidence | Text grouping, clear required contact fields, safe photo picking/removal, attachment validation |
| Submission result | Reference and Submitted state only after server success; failure explicitly says not sent and preserves recovery |
| Offline help/drafts | Clear local-save versus server-delivery distinction; no silent background-send claim |
| Resident report/history | Current state, timestamps, reference, and allowed cancellation using existing workflow rules |
| Responder assignments | Readable location/priority/status, next allowed action, map access, no-team and empty states |
| Rescue update form | Structured fields, field errors, pending/save feedback, preserved data on failure |
| Notifications/profile | Consistent lists, long text support, real preferences only, relevant access/account actions |
| Maps | Marker text/shape meaning, readable attribution, safe-area controls, coordinate-privacy rules unchanged |

## Mobile motion proposal

Use Flutter's native Material transitions and curves instead of copying web CSS timings literally. Keep bottom destination switching immediate and preserve IndexedStack state. Use directional transitions only for entering deeper details and reporting steps. Respect system animation settings and Back gestures. Save/submit feedback begins immediately; animate success only after the response. No progress-count animations or idle category bouncing.

Exact Flutter motion values belong in a later mobile-specific implementation specification after device review. No animation package is needed merely to plan this work. Haptics are optional later polish, not a substitute for visible feedback or a reason to block emergency actions.

## Evidence and completion boundary

[First mobile concept board](mobile-concept-v1.png) shows incident choice, review/send, and report tracking. It uses synthetic references and honest placeholder contact information. The focused review screen proposes hiding bottom navigation until leaving the flow, which differs from the current IndexedStack shell and needs design acceptance before implementation. The rendered step-4 progress strip has three visual segments; correct it to four completed steps in the actual design. Generated gradients, type metrics, and target dimensions are not authoritative native specifications.

This round inspects source and creates static concepts. It does not run the app or establish current rendered defects. The final website concept is a polished **design target**, not a finished deployed product or proof that every state is tested. Native browser-style screenshots are not emulator evidence.

Before any implementation, settle the mobile concepts with Airen. Later verification must use emulator/device captures, text scaling, dark/light themes, keyboard and safe-area checks, permission denial, offline/failed submission, real Back behavior, and separate resident/responder roles. Keep live credentials and production writes out of design testing.
