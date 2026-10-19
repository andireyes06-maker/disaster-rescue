# Start here: release-readiness handoff, 19 October 2026

Authoritative source: this folder (`/private/tmp/rescue-release-integration-2026-10-18`), branch `integration/redesign-functional-2026-10-18`, base `76e54ff`, plus uncommitted work. Do not copy the older product tree in `/Users/rien/Documents/FINAL_PROJECT` over it.

Authoritative release ledger: `/Users/rien/Documents/FINAL_PROJECT/design-plans/full-repair-2026-10-19/RELEASE-LEDGER.md` (status, checks on this source, route checklist, defects, gates, owner questions).
Source manifest and recovery bundle: `/Users/rien/Documents/FINAL_PROJECT/design-plans/full-repair-2026-10-19/REPAIRED-SOURCE-MANIFEST.json` and the adjacent `bundle/` (verify before any edit).

Status: not release-ready. Local checks pass on this source. Open defects and external gates are listed in the ledger.

## Verified on this source (see the ledger for exact evidence)
- Web tests 579/579; typecheck and production build pass (installed-skill follow-up).
- API tests 463 passed, 36 environment skips; emulator adapters 65/65; Firestore rules 160/160.
- Flutter analyze clean; Flutter tests 168/168.
- Surface suite: 84 cases across 24 role/route combinations, axe 0, overflow 0, page errors 0.
- Browser scenarios: profile sync (7), offline cached and uncached with reconnect and retry (3), responder states with keyboard and focus checks (6 per engine and width), identity and closure regression (earlier source).

## Confirmed defects (open)
1. WebKit reload Listen errors: reproduced on an immediate reload while listeners start (2 per run). Not reproduced once listeners are established. Also reproduced by a minimal Firebase-only control; exact transport cause and hosted behavior remain unverified. Not suppressed.

## Known limits (not defects against stated rules)
- Landing mock uses 9 to 12 px labels (design question). Desktop filter controls are 36 to 40 px by design.
- Safari Tab does not reach buttons by default; keyboard checked in Chromium and Firefox only.
- No Firestore persistence: an uncached profile holds protected views until the connection returns. Unsent drafts are memory-only.
- Team and role changes reach an open page through the profile listener and a token refresh; retries are bounded, then "Retry access check" or reconnect.

## Not verified (external gates)
Hosted Auth and token revocation; hosted indexes, rules and listeners; real Cloudinary; real email and push; native release builds and signing; actual Safari, screen-reader and device behaviour. Unblockers and owner questions are in the ledger (sections 8 and 9). Do not guess a staging project, and do not use production credentials.

## Rules for the next session
- Verify the manifest and bundle first; regenerate both after any source change.
- Do not commit, push, merge or deploy without explicit approval. The proposed checkpoint file list is `design-plans/full-repair-2026-10-19/CHECKPOINT-FILES.txt`.
- Do not stop another session's processes. Start only your own servers on free ports.
- Do not invent hotline, privacy, retention, owned identifiers or support contacts.
- The closed-draft "Check whether update was saved" is a read-only lookup with the original key and current authorization. It must never submit an update.

Resume prompt: "Read HANDOFF.md, then RELEASE-LEDGER.md. Verify the manifest and bundle. Then continue the open defect (WebKit Listen attribution) and the owner questions; do not commit."

Installed-skill follow-up: `/Users/rien/Documents/FINAL_PROJECT/design-plans/full-repair-2026-10-19/SKILL-FOLLOWUP.md`. Fixes obsolete-session refresh failures, access-hold semantics/appearance, FLIP measurement order and touch hover motion; adds independent three-engine workflows and a Chromium trace.
