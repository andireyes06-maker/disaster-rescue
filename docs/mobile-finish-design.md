# Flutter finish: welcome, navigation and motion

Implementation snapshot: 20 October 2026. This scoped companion extends [DESIGN.md](../DESIGN.md) and [PRODUCT.md](../PRODUCT.md); it does not replace their authority or create another token source. Values below describe the Flutter implementation in `mobile/lib`, with unresolved differences called out explicitly.

## Overview

The welcome proposition is “A clear report. A connected response.” A purple action leads to resident registration, an outlined action returns existing users to sign-in, and a separate response-team sign-in explains assigned-account access. The harbor panel connects Report → Review → Respond through an authored schematic. It conveys information moving through a service, not a live map, live assignment, or response-time promise. The existing emergency disclaimer follows the introduction.

This continues the incumbent civic-service direction: readable paper surfaces, white task controls, dark ink, purple next actions and distinct urgency colors. The rounded cross mark names the service without claiming certification. Reporting keeps its existing four steps; this finish does not change API authority or role permissions.

## Colors

`mobile/lib/theme/app_theme.dart` owns native values. These match the incumbent DESIGN.md and shared JSON where those roles exist:

| Native role | Value | Use |
| --- | --- | --- |
| `primary` | `#6D28D9` | Main action, selected navigation, focus |
| `harbor` | `#241747` | Welcome schematic panel |
| `bg` | `#F5F6FA` | Scaffold / paper background |
| `surface` | `#FFFFFF` | Controls and cards |
| `text` | `#211D35` | Reading text |
| `muted` | `#625E73` | Secondary text |
| `border` | `#E5E3ED` | Routine separators; shared JSON calls this `mist` |
| `primarySoft` | `#EFE8FF` | Selected navigation and soft icon surfaces |
| `critical` | `#B42318` | Critical priority and field error outlines |
| `high` | `#8A5100` | High priority and inline recovery messages |
| `medium` | `#4338CA` | Medium priority / verification |

The schematic additionally uses local lavender route and road colors. Those illustration details are not new service-wide tokens. Priority and status pair color with labels and icons.

Pre-existing drift: native `AppColors.low` is `#625E73`; `docs/design-tokens/tokens.json` defines `low` as `#55516B`. This snapshot records the difference without changing either file.

## Typography

Flutter inherits `ThemeData(useMaterial3: true)` typography and its platform defaults; no custom font family is bundled or assigned. This gives the Android/Chrome Material presentation its Roboto family, while platform-dependent defaults remain applicable elsewhere. Web Geist is not imposed on Flutter.

Native overrides are headline medium (30, weight 600, height 1.15, tracking −0.8), title large (22, weight 600, tracking −0.5), and app-bar title (18, weight 600, tracking −0.4). Welcome display is weight 700, height 1.06 and tracking −1.5, at 43 or 58 logical pixels according to available content width. Introduction copy is 16 with height 1.6. This is the existing native hierarchy allowance in DESIGN.md, not a claim that the web and native type scales are identical.

## Layout

Values are Flutter logical pixels. Welcome uses a safe-area scroll view with a centered maximum width of 1120 and horizontal padding of 24. Within the padded content, width 760 or greater produces two columns separated by 56; narrower layouts stack the introduction and schematic with a gap of 28. The display size changes to 58 only above content width 760. Features follow as simple icon/text rows.

`ProductViewport` centers selected task pages within a maximum width of 760 and includes a safe area. Children own their padding. Notifications wrap the entire content column in this viewport, so warning, list padding and cards all fit within the 760 bound. This is the desktop-notification containment correction requested during review. It is not evidence of adaptive tablet navigation: resident and responder shells continue to use bottom navigation.

Repeated spacing includes field insets of 16, welcome/panel insets of 24, local gaps of 8–12 and larger section gaps of 20–32. `AppSpace.touch` is 44; outlined, text and icon buttons use that minimum size, filled buttons have minimum height 52, and Material padded tap targets remain enabled. The navigation bar is 76 high. These are implementation values, not measured physical-device usability findings.

## Elevation & Depth

Cards and app bars have zero configured elevation; borders, white surfaces and spacing separate routine content. The welcome panel gains emphasis through its harbor fill. Cards retain a shadow color in the theme, but their zero elevation does not apply the shared web card shadow.

## Shapes

Native control corners (10) and major surface corners (16) match incumbent tokens. The welcome mark uses 12, dialogs 20 and bottom sheets 24 at the top; these local shapes are not replacements for the shared radius scale.

## Components

Filled buttons carry the main action; outlined controls carry alternate actions. Inputs keep visible floating labels, white fill and 16-pixel insets. Focus uses a purple outline of width 2; error outlines use critical at widths 1.5 or 2. Inline recovery messages instead use a high/amber border and icon, with readable ink text and live-region semantics.

Residents have Report, My Reports and Profile destinations. A shared `NotificationAction` bell opens their notifications route from those task app bars and is hidden when the account is absent or syncing. Responders retain Assigned and Notifications destinations. Notification unread state has a dot and stronger border; push-registration failure leaves the in-app feed available with a retry action.

The native motion implementation is bounded and does not repeat ambient animation:

| Component | Implemented behavior |
| --- | --- |
| `ProductArrival` | Default 320ms, ease-out cubic, vertical displacement 12 → 0 and opacity .8 → 1; rerenders do not restart the mounted controller. |
| `ProductTabHost` | 240ms, horizontal displacement 10 → 0 and opacity .9 → 1 on selected-index changes. `IndexedStack` retains mounted drafts/scroll state; `TickerMode` enables only the selected child. |
| `ProductPageTransitions` | Ease-out cubic fade .85 → 1 and horizontal fractional slide .035 → 0 for configured platforms; the route owns duration. The first route skips this effect. iOS is omitted from the custom builder map and retains Flutter's default transition. |
| Welcome schematic | One 1400ms eased route draw in a repaint boundary; no repeating location pulse or live position. |
| `InlineError` | Message-keyed arrival of 160ms, displacement 4 → 0, using the same .8 → 1 opacity range. Its layout occupies its final space immediately. |

These custom effects consult `MediaQuery.disableAnimationsOf(context)` and settle at their final state when disabled. Native inline-error opacity differs from the fully opaque field-feedback description in root DESIGN.md; that broader description has not been rewritten by this scoped document. Browser screenshots cannot verify live preference changes or all platform transition behavior.

## Do's and Don'ts

- Do preserve mounted tab state and account-scoped navigation boundaries when extending the shells.
- Do keep the schematic separate from real incident location and retain the emergency disclaimer.
- Do use the native theme as implementation evidence and record token differences before synchronizing sources.
- Don't infer live rescue information, a hotline number, app-store distribution or guaranteed response from the welcome scene.
- Don't claim dark mode, adaptive tablet navigation or physical-device review from this finish.

Evidence supplied for visual inspection lives in `/Users/rien/Documents/ninie-work-full-backup/`: `flutter-finish-welcome-390-r2.png`, `flutter-finish-welcome-1440.png`, `flutter-finish-detail-1440.png` and `flutter-finish-notifications-1440.png`. These are local Flutter Chrome preview captures with synthetic emulator content. The refreshed notifications capture is 1440 × 1000 and shows its warning and feed centered within the bounded task column after the correction. This supports desktop Chrome containment for the captured state only.

Native hardware/OS review, keyboard and system-back behavior on devices, physical touch ergonomics, native accessibility behavior, and device frame performance remain unverified. The Chrome captures establish preview composition only; they do not close those release gates.
