# Codex review of the retry repair — October 18, 2026

Verdict: request changes for browser retry lifecycle and collision-safe claim identity. The atomic persistence repair is a substantial improvement; the targeted tests pass, but the remaining browser cases below prevent calling the retry repair complete.

No product code changed in this review. Nothing committed, pushed or deployed. Scope: current integration source, repair handoff and focused local probes. The broad test/browser results in Claude’s handoff are reported evidence, not newly repeated here.

## Independently checked

- API domain + atomic service tests: **25 pass**, two files.
- Browser attempt store + form retry tests: **20 pass**, two files.
- Read the transaction adapter, domain decisions, report service, retry store and form wiring.
- Reproduced the two bookkeeping cases below by importing the actual retry-store module, using injected Storage write failure where specified. See codex-repair-review/probes.json and probes.mjs.
- Confirmed claim document ID ambiguity with two concrete account/key pairs. No cross-account endpoint exploit was attempted.
- Golden PNGs and provenance now exist under mobile/test/goldens. They are candidate tracked files until committed; legacy design status is stated correctly. Flutter was not rerun by this review.

## Findings

### R1 — Unconfirmed eviction can turn a retry into a new submission (high)

Location: web/src/features/resident/submissionAttempts.ts:115–122 and ReportForm.tsx:168–170.

Reproduction: create an attempt for payload A, add five other unconfirmed versions, then retry A. The actual store returns a new key. The form shows an eviction notice and immediately POSTs that new key without waiting for any decision. If A was already accepted but its response was lost, this permits another report. Backend at-most-one-per-key protection cannot deduplicate two different keys.

This is not the original same-key transaction bug, which the new atomic path addresses. It violates the repair spec’s requirement to avoid automatically resending an ambiguous attempt as new.

Required behavior: retain unresolved identity or stop before sending when bookkeeping capacity is reached. Offer a clear path to My reports and deliberate resolution/new intent. Increasing the cap alone only moves the same defect. Add a service-backed browser case with a committed/lost response, capacity pressure, and retry of the original payload; assert no automatic duplicate POST/report.

### R2 — Distinct account/key pairs share a claim ID (medium, conditional custom UID)

Location: api/src/adapters/firestoreRepo.js:113,124,138,147.

These both become account__extra__1234567890123456:

- uid=account, key=extra__1234567890123456
- uid=account__extra, key=1234567890123456

The adapter does not check the stored uid/key before deciding whether to replay, conflict, take over or release. Risk depends on such custom UIDs existing and a colliding request being possible; ordinary generated UIDs do not establish exploitability. The ID construction itself is ambiguous.

Use an unambiguous namespace (nested path or hash of a canonical tuple). Preserve existing completed/pending claim behavior through explicit, ownership-checked legacy handling. Do not read a colliding legacy document as belonging to the caller. Test both accounts together against the real adapter, including identical payloads, concurrent requests and legacy records. This is a technical repair, not a policy decision that needs an owner to choose the delimiter.

### R3 — Failed storage clearing can replay a confirmed send as a later new intent (medium)

Location: web/src/features/resident/submissionAttempts.ts:98–111,124 and ReportForm.tsx:171.

Injected reproduction: persist key K for A; let the server-confirmation path call confirm(A) while Storage.setItem throws; restore storage access and construct a new store. keyFor(A) returns K because removal failed silently. A later deliberate identical report can therefore replay the old report instead of creating the new intended one.

Also, keyFor returns persisted=false on a write failure, but the form never consumes it, so the documented reload limitation is not communicated when persistence falls back to memory.

Required behavior: make confirmation/removal failure observable and prevent stale confirmed bookkeeping from silently controlling a later new intent. Cover write failure after prior successful persistence, remount/reload, and independent unresolved entries. Do not erase other unresolved keys as a shortcut. Surface storage fallback accurately while preserving entries/focus and never storing raw report data. Evidence here is an injected Storage fault, not a newly reproduced browser quota event.

## What remains sound / bounded

The code reserves report identity, binds server fingerprints before takeover, fences stale generations, commits report plus claim in a transaction, refuses unresolved legacy pending claims and keeps uploads outside transactions. These are the right safeguards, with passing focused tests. Same-key persistence and browser intent bookkeeping are different guarantees; do not conflate them.

The documented orphaned-upload and post-commit audit/notification delivery gaps remain separate work. Delivery, hosted WebKit, Firefox retry interception, actual uploads, devices and owner configuration are not certified by this review. No reduced-motion audit was run.

## Handoff

Use CLAUDE-REPAIR-FOLLOWUP.md to continue. Fix these findings, add regressions that would fail on the current code, rerun affected suites and real emulator/browser checks, then refresh source recovery artifacts. Existing archives describe Claude’s pre-follow-up repair and have not been regenerated by this read-only product review.
