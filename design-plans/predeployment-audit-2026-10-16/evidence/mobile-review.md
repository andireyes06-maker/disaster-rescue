# Mobile audit, October 16, 2026

Scope: all mobile/lib Dart source, Android manifest/release configuration and iOS usage declarations; current HEAD e9c6426. Read-only product review. Impeccable native audit and Android guidance applied, plus Software Build Guidelines AGENTS/index, motion chapter and relevant frontend guidance. Impeccable context launcher failed with permission denied; existing PRODUCT.md was read directly (it is web scoped); DESIGN.md is absent. No product code changed.

## Verification

- flutter analyze --no-pub: clean.
- Existing flutter test --no-pub suite: 107 passed. Log /tmp/rescue-mobile-tests.log.
- Temporary extra widget checks: 1 passed, 3 failed. Log /tmp/rescue-mobile-edge-tests.log, source /tmp/rescue_mobile_audit_test.dart. Passing: 320x640 screen at 200% text, first category screen. Failed: hotline accessibility tap action absent; category accessibility tap action absent; 640x320 incident map overflows 120 px vertically.
- ADB installed, devices list empty. Emulator -list-avds empty. xcrun simctl unavailable. No device/emulator screenshots, physical device measurements, TalkBack/VoiceOver session, push delivery, IME/platform permissions or release package build verified.
- Existing tests use large 800x2400 viewport for reporting and thus do not prove real phone adaptation.

## Findings

### M01 P1: Two critical controls lose accessibility activation (runtime confirmed)
Locations mobile/lib/features/report/hotline_button.dart:32 and mobile/lib/features/report/report_flow_page.dart:470. Both set excludeSemantics:true on an outer Semantics with button:true but no onTap; this hides the actual button/InkWell action. Temporary tests prove hasAction(SemanticsAction.tap)==false on both. Screen-reader users can read labels but cannot activate emergency hotline/category choices. Preserve native button semantics, exclude decorative content only, or wire the wrapper action correctly without duplicate nodes. Add semantics activation tests, verify TalkBack/VoiceOver actions actually call/select.

### M02 P1: Saved report crosses signed-in accounts (source confirmed)
Locations mobile/lib/features/report/report_draft_store.dart:15, mobile/lib/features/report/report_flow_page.dart:82, mobile/lib/auth/auth_repository.dart:222, mobile/lib/main.dart:82. SharedPreferences report_draft_v1 is global and payload includes precise location, description, contact name and phone. Logout clears neither draft nor its ownership; the next resident sees Continue saved report and restores another resident’s data. Scope storage and UI state by authenticated uid, migrate or discard ownerless legacy drafts, and clear in-memory sensitive state on account change. Preserve a returning owner’s draft only under explicit ownership policy. Regression test A draft -> logout -> B login -> no disclosure, then A login -> intended retention.

### M03 P1: Confirmed server success can be reported as failure
Location mobile/lib/features/report/report_flow_page.dart:179-207. reports.create succeeds, then drafts.clear is awaited within same catch block. If preferences cleanup throws, the user reaches Report not sent after a successful server write. Retrying creates another report. Separate confirmed server result from best-effort local cleanup; display receipt/reference even when cleanup fails, and mark stale drafts appropriately. Add fake DraftStore.clear throwing after successful create; assert one report and visible success.

### M04 P1: Uncertain network outcomes are presented as definitely not sent
Locations mobile/lib/data/api_client.dart:94 and mobile/lib/features/report/report_flow_page.dart:199-214; mobile/lib/features/offline/offline_help_page.dart:45. A response timeout does not prove the API failed to commit. All status=0 network errors save a draft and say Your report has not been sent, then retry POST without client request identifier. Provide durable idempotency keys with server support, distinguish uncertain outcome, reconcile against server before reissuing. Verify lost-response-after-commit scenario creates one report. Coordinate with API audit; do not merely change copy while allowing duplicate rescue requests.

### M05 P1: Responder details do not receive current assignment/status
Locations mobile/lib/features/responder/incident_detail_page.dart:14-23,49-55,84. Screen accepts an AssignedReport snapshot and updates _status only after its own mutation; no live document subscription or revalidation. Another dispatcher can reassign, resolve or edit while the responder still sees old exact location and actionable controls; acknowledgement resets each visit. Observe authorized report updates, clear confidential data on revoked access, gate action eligibility using current state, show clear conflict/revocation feedback, and reconcile acknowledgement from server. Test reassignment/terminal update during open detail. API remains authority.

### M06 P2: Incident map overflows in supported landscape (runtime confirmed)
Location mobile/lib/features/map/incident_map_page.dart:67-74. Fixed 260dp map plus wrapped filter area and Expanded list exceeds landscape space. 640x320 test fails with RenderFlex bottom overflow 120px. Use available-height layout or landscape split view, constrain/collapse filters, preserve usable incident list; test compact portrait, 640x320 landscape and enlarged type. iOS Info.plist explicitly supports landscape.

### M07 P2: Profile loading/failure is disguised as missing data
Locations mobile/lib/features/profile/profile_page.dart:30-50 and mobile/lib/data/services.dart:406-416. FutureBuilder ignores waiting/error; repository swallows every error into null. Name and phone render Not set while loading and after failures. Introduce explicit loading/error/empty/success states and Retry; cached content can remain with stale indicator. This is the clearest place to introduce a stable, labeled profile skeleton. Do not make decorative animation mandatory.

### M08 P2: Stream failures offer instructions without recovery controls
Locations mobile/lib/features/my_reports/my_reports_page.dart:70-76; features/responder/assigned_list_page.dart:91; features/notifications/notifications_page.dart:45; features/map/incident_map_page.dart:42. Errors replace all content with try again text but no retry/reconnect control. Firestore listeners terminate on errors, so there is no assurance another snapshot arrives. Recreate streams through explicit Retry, preserve last confirmed content with stale/offline explanation where authorized, and distinguish loading vs empty vs error. Initial list skeletons can match card geometry; keep one-shot auth/action spinners when layout is unknown. Test initial failure, stale loaded data failure and successful retry.

### M09 P2: Ordinary in-progress reports are not saved on exit/interruption
Locations mobile/lib/features/report/report_flow_page.dart:82,166,202 and report_draft_store.dart:7. The sole save call occurs after failed network submission. Native Back on the resident root exits instead of navigating the form step; process death loses text before any failed send. Add owner-scoped debounced persistence and lifecycle handling, predictable internal step Back via native PopScope, and explicit discard when appropriate. Do not trap system Back. Photos are intentionally not serialized; disclose attachment loss and require reattachment after restart rather than promising full report recovery. Test native Back, process restoration, sign-out/account changes and retry.

### M10 P1 for Android distribution: Release uses debug signing key
Location mobile/android/app/build.gradle.kts:32. Release build signingConfig is debug. Configure protected release signing externally and fail a distribution pipeline when release signing is absent; never add secrets/keystore to source. Verify package signature before any Android public release. This does not by itself block a web-only deploy.

### M11 P2: Approved mobile identity and experience remain unimplemented
Location mobile/lib/theme/app_theme.dart:5-16 uses warm F6F1EA/teal0F6B66; the accepted indigo mobile concept has not been implemented. Confirm intended release scope instead of declaring whole-product redesign finished. Implement approved mobile system through Material roles and actual screens, not a generated screenshot. Dark theme, adaptive tablet navigation, and explicit mobile motion specification are absent: these are design scope/verification decisions, not proof that existing built-in Flutter animations violate reduced-motion settings. Native route, Material feedback and spinners must be tested with platform remove-animations before claims.

### M12 P2: Notification tap does not open its referenced incident
Location mobile/lib/features/notifications/notifications_page.dart:23-26. AppNotification contains reportId, but tapping only marks read; already-read taps return immediately. Resolve authorized report state and navigate to incident detail (with removed/reassigned/not-found recovery), mark read separately, and handle foreground/background push taps through the same route. PushRegistration currently registers tokens only; delivery/deep-link behavior remains unverified.

## Positive findings

Material3 component usage, safe areas on most forms, scrollable field layouts, optional-photo signature/size validation, GPS denial/manual fallback, semantic priority markers, liveRegion errors, auth fail-closed behavior, cancellation confirmation, duplicate-tap disabled submission, local hotline cache, and 107 passing unit/widget tests are worth preserving. Reporting has four actual steps already. No case for installing web motion libraries into Flutter.

## Required closure evidence

Fix P1s before relevant platform release; add focused regressions above. Run existing tests plus compact landscape and semantics checks. Then install a local/demo build on an Android emulator/device; capture resident and responder flows including loading/error/empty/success, native Back, keyboard, permission denial, offline lost-response recovery, 200% text, reduced motion and current assignment revocation. If iOS is shipped, repeat iOS permissions/safe areas/VoiceOver/Back and release signing checks. Do not claim release-ready for untested platforms.
