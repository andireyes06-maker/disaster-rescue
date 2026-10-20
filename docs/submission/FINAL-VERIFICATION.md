# Submission preparation verification, 20 October 2026

Source: design/flutter-harbor-2026-10-20 in the authoritative integration. Reviewed redesign checkpoint: 1cf0f33. Production default branch remains the earlier release; this source is not described as a new deployment.

## Final checks

- Flutter analyze: no issues; full Flutter suite: 222 passed after explicit emulator-host handling and native welcome status-bar contrast changes. Golden references unchanged by these two fixes.
- Android debug APK: built successfully with local API 3407, Auth 9407, Firestore 8407, explicit loopback and USB forwarding. Debug-only cleartext permission; production release guard retained.
- Real Android emulator: API 35 arm64 AOSP, software graphics. Welcome/status icons inspected; resident sign-in reached Android notification permission; denial did not prevent the report workspace or populated My Reports. A force-stop/relaunch retained the resident session and returned to the reporting workspace without sign-in. Android repeated its optional notification prompt after the first denial; declining it again still allowed the workspace. Responder sign-in reached the Active assignment list; the empty state matched the closed rehearsal fixture. Recently closed displayed the exact rehearsal report and seeded closed report, confirming the native query against the local rules. This is native emulator evidence, not physical hardware or FCM delivery.
- Web workflow rehearsal: resident UI create, dispatcher verify/assign, responder acknowledge/progress/resolve, resident live update, dispatcher close, read-only closed detail. Final API read: Closed. DMO Monitor/Analytics and Admin Accounts/Teams rendered. No page exceptions. Fictional local data only.
- Guide: 12-slide PPTX and PDF rendered with LibreOffice; all slides visually inspected. Slide 7 title shortened to remove overlap. Notification screenshot is a widget fixture, clearly identified.
- Technical video: 13 scenes, about 7 minutes 12 seconds, H.264/AAC 1440 by 900, synthetic Samantha narration and SRT captions. Persistent synthetic/fictional-data disclosure. Sampled middle/end frames inspected, audio stream and level checked. Full audio has not been independently listened to; review playback before submission.
- Earlier final audit: web 579, API 463, adapters 65, rules 160. Those suites were not rerun merely for document changes. Full evidence is in the final-submission-audit-2026-10-20 record.

## Remaining limits

Physical Android/iOS, TalkBack/VoiceOver, camera/GPS permissions on hardware, signed native/store release and real Cloudinary/email/push delivery remain unverified. Local immediate-reload Firestore/WebKit Listen errors remain a recorded limitation. Hotline, authority, privacy/retention and support policy must not be invented. Member identities and contributions remain explicitly marked where unknown. Synthetic narration does not satisfy member participation by itself.
