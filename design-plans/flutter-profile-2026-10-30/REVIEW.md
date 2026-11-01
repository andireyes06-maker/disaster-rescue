# Flutter profile review, 30 October 2026

Implemented the owner’s request: actual profile name as heading, no duplicate Name row, responder Team and Team identity from a live read of only the current team document. Residents do not issue a team read. Loading, no assignment, missing document, failure and retry states are distinct. Keying by account/team removes old values on membership change; widget regressions cover late old-team events.

Related fixes: the profile reloads when uid changes, and an earlier account’s photo completion cannot update the next account’s picture. The Privacy heading now wraps at200% text at320px. Both the old generic heading regression and the overflow were observed failing before repair. Other new regression cases were added with the implementation; no test-first claim is made for those cases.

Verified: analyzer clean;332 full Flutter tests;19 focused profile/photo checks;11 Chrome profile checks. Viewed both candidate images before promoting the resident reference and new responder reference; login/register candidate hashes were unchanged.16 golden checksums verify.

APK21 is online and uses the same signing certificate as20, so it can replace it without uninstalling. Debug-signed sideload, no visible debug ribbon. No physical phone, Android emulator or real hosted profile interaction was used. No source commit/push/deploy/public asset publication occurred. Build warnings concern plugin migration/native-access/SDK metadata compatibility; the build succeeded.

Read CHECKS.json and the release folder’s Source/SOURCE-OVERLAY.json. Unrelated HANDOFF.md and docs/documentation/handoff.md edits were not included in the source overlay.
