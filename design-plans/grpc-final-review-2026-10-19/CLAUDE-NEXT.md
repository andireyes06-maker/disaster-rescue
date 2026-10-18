The applied grpc-js1.14.5 decision is reviewed. All344 source hashes match; durable logs are copied beside REVIEW.md in raw/. Do not reopen the settled unkeyed-attempt or unresolved-reconciliation decisions.

Fix the remaining capture harness issue in web/e2e/visual.spec.ts: current captures hardcode localhost5173, bypassing the isolated configuration. Use `/login` against Playwright's configured baseURL for current pages and an explicit owner-verified URL for any historical baseline. Verify server source identity and port ownership. Do not reuse or stop another session's servers.

Keep historical before/after captures distinct from actual visual regression assertions. The old pre-Tailwind baseline is not approval of the current design. Capture and inspect the intended current pages at the required widths with normal motion; record skipped historical comparisons honestly if no baseline is configured.

The five recorded console errors share ERR_INTERNET_DISCONNECTED, consistent with intentional offline testing; no page exceptions were recorded. Future runs should retain request URL, timestamp and test phase so expected offline errors can be attributed rather than broadly suppressed.

Use the isolated fresh install for the approved lockfile. Preserve the production emulator guard and the original node_modules symlink target. Update the current ledger/handoff, and regenerate/reconstruct source artifacts if tracked source/tests change. No commit, push, merge or deployment. Real provider, hosted indexes/browser, native device/release and owner-copy gates remain open.
