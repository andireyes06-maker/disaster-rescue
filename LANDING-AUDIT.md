# Landing page redesign audit

Date: Oct 16, 2026. Scope: the public landing page at `/` (`web/src/pages/Landing.tsx`, landing rules in `web/src/styles.css`), compared with the staff sign-in page (`/login`) so the two look like one product. Status: audit only. No code changed.

## Verdict

The page works, and the text is correct and accessible. It does not yet look like a finished website, for three reasons:

1. **Colour is applied without a hierarchy.** The page is cream, teal, a dark teal gradient, and coral. Teal is used for eyebrows, role names, links, buttons, timeline dots, and the footer. Nothing stands out as the main action.
2. **The emergency path is buried.** The hotline sits about 1,000 px down on desktop and further down on a phone. For an emergency product this is the most important control, and it is not in the first screen.
3. **The page has no site structure.** There is no header, no navigation, and no clear split between the two front doors (resident app and staff web). The resident section is one placeholder paragraph.

## What was checked

- Rendered the landing page at 375, 768, and 1440 px in Chromium, Firefox, and WebKit. No horizontal scroll and no console errors.
- Rendered `/login` at 1440 px and compared it with the landing page.
- Measured contrast with the WCAG formula for the main text pairs. All pass AA:

| Pair | Ratio | Result |
|---|---|---|
| Body text on page background | 13.1:1 | Pass |
| Muted text on page background | 5.4:1 | Pass |
| Teal link on page background | 5.6:1 | Pass |
| White on teal (buttons, footer) | 6.3:1 | Pass |
| White on coral (hotline) | 5.2:1 | Pass |
| Light teal text on dark hero | 7.8:1 | Pass |

The problems are hierarchy, structure, and consistency, not accessibility.

## Findings

### Colour

- **Cream background (`#F6F1EA`) with teal reads as a generic template.** The page background does most of the visual work and makes it look unfinished. A white or very light neutral would look more deliberate.
- **Teal has no clear job.** It is the brand colour, the link colour, the eyebrow colour, the role-name colour, the timeline colour, and the footer. Use it for the header and the primary action only.
- **The hero and footer gradients use hardcoded colours** (`#0B4A47`, `#1D2B2A`, and similar) that are not in `web/src/theme/tokens.css`. They will drift from the design tokens over time.
- **Coral is only on the hotline.** That is correct, so keep it. Nothing else on the page should use red.
- **Amber (`--color-high`, `#9E5A00`) is unused.** It could carry warnings or notices.

### Organization

- **The hotline should be in a header on every screen.** On a phone, a visible "Emergency hotline" button in the top bar is the only control that matters in a crisis.
- **The two front doors are not presented side by side.** The spec says residents use the mobile app and staff use the web. Right now the staff path is a button and the resident path is an anchor to a paragraph. Two equal cards, "I'm a resident" and "I work for the response team", would make the split obvious.
- **The safety text is in the middle of the page.** It should sit directly under the hero, or in the header strip.
- **Section order.** The current order is hero, who it is for, safety, resident app, credits, footer. A better order is hero with front doors, hotline strip, how a report moves, who it is for, privacy notice, resident app details, footer.
- **The resident app section is too thin.** It is one sentence. It needs at least the app's main features and a clear "not published yet" status.
- **Placeholders show on the public page.** "Team names and roles: to be added" and "Privacy notice (pending review)" are honest, but they make the page look unfinished. They can move to the footer and stay small.

### Typography

- **Two fonts across the product.** The landing page uses Geist. `/login` uses the system font. A visitor who moves from the landing page to sign-in sees the typeface change. Pick one and load it everywhere.
- **Role names are not bold.** The "who it is for" headings are regular weight, teal, 17 px. They look like labels, not headings.
- **Heading scale is flat.** The h1 is large, but h2 (24 px) and the card titles are close in weight. A clearer scale would give each section a stronger start.

### Brand and consistency

- **No logo or brand mark.** "DR" in a square is a placeholder. It needs a real mark or a wordmark that matches the staff app.
- **`/login` has no brand.** It is a bare card with no header, no name, and no link back to the landing page.
- **The staff app's shell (sidebar, top bar) was not part of this audit.** A full review of the staff app would need its own pass.

### Content and completeness

- **Copy is plain and honest.** Keep it. Do not add testimonials, counts, or claims the project cannot back up.
- **Images:** the page has one illustration, and it is mostly hidden behind the status card. Stock photos were not used because licensed ones would need to come from you.

## Redesign options

**A. Calm civic (recommended).** White or very light neutral page, a dark teal header and footer, teal for the primary action only, coral for the hotline only, amber for notices. Two front-door cards under the hero. Hotline in the header. Logo and name shared with `/login`.

**B. Emergency services.** Dark slate header and hero, a stronger coral presence for emergency actions, larger type. More urgent, but the coral would then lose its meaning as the "emergency" signal.

**C. App-matched.** Build the landing page from the staff app's own shell and components so the two look identical. Most consistent, but it means reworking the staff app's theme too.

## Proposed page structure (option A)

1. Header: name and logo, links (Residents, Staff, Safety), emergency hotline button always visible.
2. Hero: headline, one sentence, two front-door cards.
3. Safety strip: the required safety line and the hotline, directly under the hero.
4. How a report moves: horizontal timeline on desktop, vertical on phone.
5. Who it is for: four role rows with bold role names.
6. Resident app: what residents can do, and the "not published yet" status.
7. Privacy notice (pending review).
8. Footer: staff sign-in, course line, credits (placeholder).

## Decisions needed from you

1. **Direction:** A, B, or C? (Recommended: A.)
2. **Scope:** change the colour tokens for the whole web app, or only the landing page? Changing tokens affects the dashboard and sign-in page too. Recommended: change tokens for the whole app, so the product looks consistent.
3. **Font:** keep Geist everywhere? (Recommended: yes, it is already loaded.)
4. **Logo:** do you have a logo or name mark? If not, I can make a simple wordmark.
5. **Stock photos:** send any photos you want used. Without them, the hero stays illustration and gradient only.
6. **Scope of the staff app:** should the audit include the dashboard and other staff screens in the same pass?

## Not checked

- A real phone, or Safari on a phone.
- The staff app's screens beyond `/login`.
- Any user testing with residents or staff.
