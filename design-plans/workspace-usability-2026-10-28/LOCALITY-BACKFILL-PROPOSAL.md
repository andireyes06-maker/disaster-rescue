# Proposal: backfill stored locality for older reports (NOT executed)

Status: proposal only. Nothing in this file has been run against production. Production writes need Airen's explicit approval.

## Why
The "Reports by location" chart counts the stored `locality` field. The field is set at submission only when the pin's place lookup succeeded. Older reports, and reports whose drafts were restored from disk before the pin was picked again, have no stored value. The map label is a live lookup from coordinates, so the map can show a town while the chart shows "Place not recorded".

Normal rendering (this pass) reports missing values honestly in their own bucket. It does not geocode on read.

## Proposed steps (dry run first)
1. Read-only scan (Firestore, production project): count reports with a valid `lat`/`lng` and no `locality`. Record the count only.
2. For each distinct coordinate rounded to about 110 m, call the existing reverse lookup (`GEOCODER_REVERSE_URL`). Respect the existing 1.1 s spacing, 8-point queue and 512-entry cache. Expected time is about 1.1 s per distinct point, so the run should be batched and resumable.
3. Store only the `locality` string. Do not change `addressText`, landmarks, coordinates or audit entries. Do not write an audit entry per report unless the owner asks for one.
4. Skip any point whose lookup fails or returns no town or city. Leave it unset. Never guess.
5. Apply only after the dry-run output is reviewed and approved.

## Risks
- Provider terms: the public Nominatim policy limits aggregate traffic and bans systematic extraction. A one-off backfill of 22 or so points is small, but it must be checked against the policy and the owner's own provider if one is used.
- Municipality labels can differ in spelling between lookups. Grouping is case- and spacing-insensitive, but spelling variants are not merged.

## Verification before any run
- Run against the local emulator with synthetic fixtures only.
- Confirm `byLocation` totals equal the filtered total before and after.
