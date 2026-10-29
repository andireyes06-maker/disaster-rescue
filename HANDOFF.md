# I-Report launch handoff, 29 October 2026

## Current source and deployment
- Local base: `135a3ad` on `feat/ui-response-workspace-2026-10-28`, plus the uncommitted repairs below. Another session committed the earlier Codex HQ/profile/dependency work in `560e16a`, added responder photos and pushed `7e21395`; do not revert it.
- Production web/API: `7e21395`. GitHub Vercel status and CI jobs pass; Render confirms live. Existing Vercel Git deployment belongs to `lajr-solute/disaster-rescue-web`; this CLI account cannot manage that workspace. Do not relink/create a replacement project.
- Team: **LAJR Solutions**, section **BSIT 3J-G1**. Members: Aclon, Franz Adriene R.; Cabuguang, Liam; De Leon, Justine; Lopez, Raymond DG.

## Current audit / local repairs
- Start with `design-plans/webkit-vercel-repair-2026-10-29/LAUNCH-AUDIT.md`. Web669 /88 files, API669 (36 skipped), Flutter320/analyze clean. Rules161 and real adapter65 checks remain unchanged. Release build/typecheck pass; production and full web dependency audits zero.
- WebKit local emulator cleanup: pause before unload, restore cancelled/back navigation; never installed against hosted Firestore. Routine admin/responder checks78 cases across three engines/390 and1440: no exceptions or overflow. An injected native confirmation/slow-navigation control still reports2 SDK teardown exceptions while live updates recover; not suppressed or claimed error-free.
- Native responder retry identity now hashes photo bytes, not just filename/size. Same-name same-size changed-photo regression was observed failing then passing (A→B→A). Submission freezes photos before location lookup and blocks attachment/text edits while busy.
- Profile privacy copy now names actual permitted roles. Only profile.png golden changed; rendered candidate and isolated diff viewed before promotion, provenance/checksums updated. Landing download-badge names now match visible text; source default points to the prepared update20 release. Publish the asset before deploying this code.
- Rebuilt online update20 in `../LAUNCH-REPAIR-2026-10-29/Android/`, same certificate as update19, debug-signed sideload, no visible debug ribbon, emulator mode off. Not phone-tested. Published update20 at the exact public GitHub tag on 29 October; deployment authorized by Airen. Its source archive/manifest is under that repair folder.

## Launch / submission gaps
- Live landing has Coming soon badges and no APK download link. Public `rescue-reports-downloads` currently has only the October23 prerelease. Publish approved update20 under the exact tag/filename in web/src/config/downloads.ts, verify HTTP200/hash, then deploy. The source-managed default avoids a Vercel account/env change. Airen authorized publication and deployment after this audit; verify the production commit and status in the final delivery release record.
- Existing final pack `../SUBMISSION-2026-10-29-FINAL-I-REPORT/` has313 valid checksums but contains update19 and source28d78bb. Preserve it; use the repair APK/source when assembling the next approved pack.
- Promo v2 is62s with LAJR branding. Technical/participation/intro/outro videos still use earlier Group3 branding and predate HQ/update photos; refresh before claiming current coverage. Actual contributions/reflections require member confirmation. Do not invent participation or whole-body photos.
- Physical Android/iOS, screen readers, real push/email, real Cloudinary upload/delete, signed-store builds and owner hotline/privacy/retention wording remain external gates, not passing tests.

## Decisions / rules to preserve
- Priority-first FR-06, oldest within priority, is accepted. Admin website; resident and responder Flutter, responder web also exists. Do not rebuild retired dispatcher/DMO workspaces.
- Optional responder update photos: accepted risk of orphaned assets on a crash/late upload; no ledger. Residents may read update-photo URLs on their own incident; no resident screen displays them. Do not reopen or change rules without approval.
- Profile photos on administrator report screens only. Medical is team identity; Lifeline is incident type. Camera and gallery both offered; required resident evidence remains1–5 photos.
- Fresh explicit approval for every push/deploy or production-data write. Stage named files only; never stage `docs/documentation/handoff.md`. No Android emulators; no directory-wide dart format; do not regenerate goldens without viewing; never print/commit keys.
- User cannot use Claude now. No external Opus was run in this audit; primary local source review/testing performed. The previous source-transfer rejection was not bypassed.
