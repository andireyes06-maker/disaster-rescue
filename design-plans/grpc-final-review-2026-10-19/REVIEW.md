# Applied gRPC decision review — 19 October 2026

All 344 manifest files match the current uncommitted integration. The web manifest contains the approved grpc-js1.14.5 override. The isolated-install logs and audit outputs have been copied from scratch into raw/ so the durable review no longer depends solely on ephemeral logs. This review did not change product source, rerun full suites, apply additional dependency changes, commit, push, merge or deploy.

## Console entries

browser-results.json records five console errors and one unique message: `Failed to load resource: net::ERR_INTERNET_DISCONNECTED`. The harness stores every error's first200 characters, deduplicates them, and retains up to eight distinct samples. Since only one unique sample exists, the five recorded entries share that message. The flow explicitly toggles offline mode. This is consistent with deliberate offline network failures; zero pageErrors were recorded. Request URLs, timestamps and test phases were not retained, so this does not independently attribute each failed request or certify a console-clean hosted run.

## Remaining harness defect

`web/e2e/visual.spec.ts` hardcodes `http://localhost:5173/login` as the current capture URL. Its screenshot path bypasses the isolated Playwright baseURL5293. Enabling BASELINE_URL without repairing this could capture another session's server again. Use the configured baseURL and a relative `/login` for current captures, retaining an explicit owner-verified URL for the comparison baseline. Verify both server identities before capturing.

These four specs are optional historical screenshot captures of the pre-Tailwind baseline, not assertion-based visual regression tests: they save screenshots but do not compare them to an approved image. Their skip does not negate the four valid smoke passes, and enabling them alone would not establish current full-site visual regression coverage. Keep the purpose and status explicit. Do not adopt the old f30db64 design as the current approved appearance merely to enable the captures.

## Disposition

The local dependency change has supporting clean-install/build/suite evidence, and direct exact-package Node gRPC evidence is preserved in the earlier approval review. Integration node_modules still points to the original installation: use the isolated install as the authoritative validation environment for the new lockfile. Do not modify the original dependency directory through that symlink.

Next local work is the isolated visual-capture target correction and owner-verified current captures. All provider/hosted/index/device/release/hotline/privacy/retention gates remain open. No new policy decision is required for unkeyed uploads or unresolved rows; the earlier decisions remain binding.
