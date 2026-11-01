# Opus source review: local-followup

Actual model: claude-opus-5-5

Airen, I found one confirmed Important issue and nothing Critical.

**Important**
- `web/src/features/auth/LoginPage.tsx:132`: the recovery status `<p>` now stays mounted even when it has no text. Its only style rule, `web/src/pages/public.css:108`, gives it padding (12px/16px), a 16px top margin and a `--color-primary-soft` background, and I found no `:empty` rule anywhere. So every sign-in page shows an empty tinted box, roughly 24px tall, under the recovery links before any reset is requested. The new test (`LoginPage.test.tsx:112`) only checks that the element is empty, so it can't catch this. Fix: add `.login__recovery-notice:empty { display: none; }`, or move the padding and background onto an inner span that only renders when there is text.

**Checked, no findings**
- **Photo rate limit** (`users.js:16-34`): it runs after `auth`, so `req.user.uid` is always set, and before multipart parsing. It copies the pattern already used in `reports.js:16-22`, and DELETE is not limited.
- **API test**: it proves real behaviour. The 11th upload gets 429, the uploader count stays at 10, and a different account and DELETE still go through.
- **Avatar race** (`AppShell.tsx:71,83`): `ProfilePhotoControls.tsx:50-52` calls the callback it captured when the upload started, so a late result from the previous account hits the uid guard and is dropped.
- **Mobile timeout**: only the profile multipart call gets 60s. Other requests keep 20s. The Dart tests check both sides of each boundary (21s still waiting, 61s times out).
- **ProductMark**: the asset is declared in `pubspec.yaml:79`, and the 26px-tall logo (about 93px wide) fits the 104px navigation rail.

**Limits**: I only read the code and ran nothing. The rate limiter's in-memory store is per instance, so the limit is weaker when several instances run.
