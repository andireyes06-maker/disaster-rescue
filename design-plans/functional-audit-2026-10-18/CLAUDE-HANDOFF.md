# Functional audit handoff

Read `REPORT.md` in this directory first. This is a read-only product audit with real mutations only in the isolated `demo-functional-audit` project. The findings are not fixed.

Priority findings:

1. F01 — immediate role demotion can leave an old dispatcher token privileged on the API (emulator reproduction plus delayed control).
2. F02 — newly created staff have no password/activation path.
3. F03 — no later team assignment API/UI for an existing unlinked responder.
4. F04 — exports ignore Analytics type/status filters.
5. F05–F10 — idempotency body mismatch; dirty router navigation; offline/stale feedback; missing resident email; team audit events; inconsistent settings required validation.

Baseline: 381 web tests plus typecheck; 305 API tests pass with one skipped; 128 Firestore rules tests pass; scratch production build passes. These passing suites do not cover the newly reproduced defects. Add meaningful regression tests when fixes are authorized.

Evidence: `api-results.json`, `critical-results.json`, `browser-curated.json`, `followup.json`, `management-browser.json`, `management-recheck.json`, `cross-browser-final.json`. The full report explains harness mistakes, 429 interruptions and successful repeats so they are not mistaken for product bugs. WebKit logged two Firestore Listen errors and must not be reported fully clean.

Use 5177 / API 3104 / Auth 9499 / Firestore 8390 for these audit fixtures. The clean presentation remains 5176, and original QA remains 5174. The separate Flutter process on 127.0.0.1:5174 may target the live project. Verify emulator project before every write. No source fix is authorized merely by reading this handoff; Airen requested an audit in this pass.

When fixes are requested, preserve the approved design and motion, account self/last-admin protections, canonical Firestore guards, current filename/CORS export fix, and existing report retry UX. Do not invent a hotline, credential-delivery success, incident evidence, or production test result. Do not bulk commit the shared dirty tree, merge the export branch, push, or deploy without the corresponding user instruction.

Real non-production uploads, physical/device services, hosted realtime compatibility, and remaining idempotency failure windows still require verification. The audit workspace has been intentionally mutated; do not reseed QA or overwrite the clean presentation to replay tests.
