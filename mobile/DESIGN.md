---
name: Rescue Reports — Flutter
description: A light response workspace within a purple harbor frame.
colors:
  primary: "#6D28D9"
  primary-soft: "#EFE8FF"
  harbor: "#241747"
  on-harbor: "#DAD2EE"
  workspace: "#F5F6FA"
  surface: "#FFFFFF"
  text: "#211D35"
  muted: "#625E73"
  decorative-border: "#E5E3ED"
  control-outline: "#8B849D"
  critical: "#B42318"
  high: "#8A5100"
  medium: "#4338CA"
  success: "#176747"
typography:
  headline-large:
    fontFamily: Geist
    fontSize: "36px"
    fontWeight: 700
    lineHeight: 1.1
    letterSpacing: "-1.1px"
  headline-medium:
    fontFamily: Geist
    fontSize: "28px"
    fontWeight: 700
    lineHeight: 1.15
    letterSpacing: "-0.7px"
  headline-small:
    fontFamily: Geist
    fontSize: "24px"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "-0.5px"
  title-large:
    fontFamily: Geist
    fontSize: "21px"
    fontWeight: 600
    lineHeight: 1.25
    letterSpacing: "-0.4px"
  title-medium:
    fontFamily: Geist
    fontSize: "16px"
    fontWeight: 600
    lineHeight: 1.4
  body-large:
    fontFamily: Geist
    fontSize: "16px"
    lineHeight: 1.5
  body-medium:
    fontFamily: Geist
    fontSize: "14px"
    lineHeight: 1.5
  body-small:
    fontFamily: Geist
    fontSize: "13px"
    lineHeight: 1.45
  label-large:
    fontFamily: Geist
    fontSize: "15px"
    fontWeight: 600
    lineHeight: 1.3
rounded:
  badge: "8px"
  md: "10px"
  control: "12px"
  lg: "16px"
  dock-dialog: "20px"
  sheet: "24px"
spacing:
  compact: "8px"
  related: "12px"
  row-gap: "14px"
  regular: "16px"
  surface: "20px"
  section: "24px"
  touch: "48px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.surface}"
    typography: "{typography.label-large}"
    rounded: "{rounded.control}"
    padding: "14px 20px"
    height: "54px"
  button-outlined:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text}"
    typography: "{typography.label-large}"
    rounded: "{rounded.control}"
    padding: "12px 16px"
    height: "50px"
  field:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text}"
    rounded: "{rounded.control}"
    padding: "18px 16px"
  task-surface:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.lg}"
    padding: "20px"
  app-bar:
    backgroundColor: "{colors.harbor}"
    textColor: "{colors.surface}"
    height: "68px"
  navigation-dock:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.dock-dialog}"
    height: "74px"
---

# Design System: Rescue Reports — Flutter

## Overview

**Creative North Star: "Purple Harbor"**

A clear, composed response service built around a light workspace and a dark harbor header. Violet identifies deliberate actions and current progress; white task surfaces keep reports, assignments, and recovery information readable.

This is the native Flutter expression of Rescue Reports. Preserve the purple harbor identity and cross mark while using native Material controls, readable text, and finite transitions. The system describes implementation reviewed in Chrome and widget tests; physical Android and iOS behavior has not been verified.

**Key Characteristics:**
- Light task workspace beneath a dark service header.
- Bundled Geist with compact headings and comfortable body leading.
- White bordered task groups, explicit status labels, and generous control targets.
- A compact navigation dock adapts to a wide-screen harbor rail.

## Colors

Decisive violet and deep harbor frame cool paper and white task surfaces. The frontmatter is the normative palette.

### Primary

- **Decisive violet:** primary actions, current progress, selected controls, and the cross mark.
- **Soft violet:** selection containers, completed timeline markers, and quiet supporting feedback.

### Secondary

- **Harbor:** service headers, navigation rail, and floating snackbars.
- **Harbor foreground:** supporting text and unselected rail destinations against harbor.

### Tertiary

- **Critical red:** critical priority and field errors.
- **High amber:** high priority and awaiting-assignment status.
- **Medium indigo:** medium priority and verification status.
- **Success green:** resolved status.

### Neutral

- **Cool paper:** scaffold workspace.
- **White:** task surfaces, fields, and foreground on strong fills.
- **Ink:** primary body text; **muted plum:** supporting text, low priority, and quiet workflow states.
- **Decorative border:** card edges, dividers, and noninteractive progress lines.
- **Control outline:** visible editable-field boundaries and unselected report-choice indicators.

**The Harbor Frame Rule.** Keep the task workspace light; use harbor for service context, app bars, and wide navigation.

**The Control Boundary Rule.** Use control-outline for editable field boundaries and unselected choice indicators; decorative-border belongs to noninteractive surface separation.

## Typography

**Display Font:** Geist. **Body Font:** Geist. The variable font is bundled at `assets/fonts/Geist-Variable.ttf`; its OFL license is included through `pubspec.yaml`. Flutter supplies platform fallback if required.

Compact, moderately tight headings establish hierarchy; body copy retains comfortable leading. Use the frontmatter hierarchy through `Theme.of(context).textTheme`. The shared theme defines headlines (36/28/24), titles (21/16), bodies (16/14/13), and action labels (15). Sizes here are Flutter logical pixels; the portable frontmatter encodes logical dimensions with `px`, not physical device pixels. Body weights inherit Material defaults where the source does not explicitly set them.

The public welcome headline is an observed special case: bold (700), 40 logical pixels or 58 when its local constraint exceeds 700, leading (1.05), and tracking (-1.1). App-bar titles use 18/600, leading (1.25), tracking (-0.3). Dock labels use 12, selected weight (700) and unselected weight (500). These are context-specific roles rather than replacements for the task hierarchy.

## Layout

Use a full-width phone task body within SafeArea, with `ProductViewport` limiting wider task content to 760 logical pixels. Authentication uses a scrolling body with horizontal padding (16), vertical padding (24), and a measured sheet capped at 520. `ProductSurface` defaults to padding (20); common section gaps are 24 and related row gaps are 12–16. Preserve scrolling and wrapping when text grows.

At width 900 or above, `ProductNavigation` presents a harbor rail with minimum width (104) and destination labels. Below that breakpoint, a white dock uses outer insets (12 left/right, 6 top, 8 bottom), SafeArea, and height (74). The keyed task body stays in place as navigation adapts. Custom button and icon targets start at 48; filled and outlined buttons have minimum heights (54 and 50), rather than fixed content-clipping heights.

## Elevation & Depth

White surface contrast, quiet borders, and harbor framing provide most depth. Cards and app bars have zero elevation and transparent Material surface tint. The dock alone receives an ambient harbor shadow: opacity (0.10), blur radius (24), offset (0, 6), spread (0). It signals navigation above the workspace without turning each task group into a floating panel.

**The Finite Arrival Rule.** Arrivals settle once, tab changes preserve mounted task state, and reduced-motion preferences bypass the custom arrivals.

`ProductArrival` settles over 320ms with easeOutCubic, translating upward from 12 logical pixels while opacity rises from 0.8 to 1. Welcome uses 420ms and distance 16. Tab changes use 240ms, a 10-pixel horizontal arrival, and opacity 0.9 to 1. Custom route transitions use the route animation's duration, easeOutCubic, opacity 0.85 to 1, and a horizontal fraction 0.035 to 0. Reduced-motion settings bypass these custom transitions. iOS retains Flutter's platform route transition because no iOS override is installed. The four-step marker has a separate 200ms AnimatedContainer state transition.

## Shapes

Controls use softly rounded corners (12); task cards and ProductSurface use 16; dock and dialogs use 20; top sheet corners use 24. Compact priority badges use 8 and legacy supporting notices/timeline labels use AppRadius.md (10). Circular progress nodes remain circles. The violet cross mark has radius proportional to its size (0.28) and a native Material cross icon. Use native icons with descriptive labels or semantics; the mark itself is decorative.

## Components

### Buttons

Native Material actions provide clear priority. Filled buttons use violet and white with the shared label style. Outlined buttons use white and ink with a subdued outline; text buttons provide lighter supporting actions. Minimum dimensions are in the frontmatter. Material handles pressed, focused, hovered, and disabled overlays; do not invent browser-style state selectors. Shared focus color is violet at opacity (0.16).

### Inputs / Fields

Always-floating labels keep context visible on filled white fields. Enabled borders use control-outline (1); focused borders use violet (2); error borders use critical (1.5), or (2) while focused. Labels and hints use muted text (14); helper/error text uses the small body style. Errors can wrap to five lines. Input radii and padding follow the shared field token.

### Cards / Containers

`ProductSurface` and themed cards use white, decorative borders (1), rounded task corners, and zero elevation. `ProductDatum` pairs a muted native icon (20) with a small label and medium title value. Empty states use a soft violet icon container, a clear title, and centered explanation. Loading uses four static placeholder groups inside a finite arrival; it does not shimmer continuously.

### Chips

Status and priority indicators pair text with a native icon, preserving meaning without color. `ProductPriority` uses the semantic priority color with a tinted background at opacity (0.09), padding (9 horizontal, 6 vertical), 12/600 label text, and an 8-pixel radius. Filter chips inherit white and soft-violet selection; shared chip borders remain decorative where text and state identify the control.

### Navigation

Dark app bars carry service/task context, white titles, and white native icons. Tabs on harbor use white selected labels, pale supporting labels, and a light violet indicator. The compact dock uses violet selected icons/text and a soft-violet indicator; the wide rail uses white selected icons/text and a violet indicator. Preserve selected state and mounted drafts through `ProductTabHost`; hidden tabs do not tick.

### Report steps and timeline

`ProductSteps` displays four labeled stages with violet completed/current nodes, check icons, and quiet connecting lines. At text scale 1.4 or higher the visual labels are omitted while the semantic step count remains. The report timeline combines native icons and explicit Done/Current/Pending markers; terminal side statuses use a separate explanatory notice. Report-type choices retain a visible unselected outline and use violet when selected.

## Do's and Don'ts

### Do:

- **Do** preserve the light workspace, dark harbor context, violet actions, and existing cross mark.
- **Do** retain visible labels and icons alongside priority and workflow color.
- **Do** use at least 48 logical pixels for interactive targets and preserve text scaling and SafeArea behavior.
- **Do** reuse ProductViewport, ProductSurface, and the shared theme before adding a local visual treatment.
- **Do** distinguish Chrome and widget evidence from physical-device verification.

### Don't:

- **Don't** use the pale decorative border as the sole editable-field or unselected-choice boundary.
- **Don't** replace real task information with invented incidents, metrics, hotline claims, or response guarantees.
- **Don't** restart an arrival on every data refresh or add ambient looping decoration.


## Incident identity refinement, 28 October 2026

Type color matches the web tokens: flood #215D98 on pale blue, fire #9C391B on pale ember, earthquake #79501F on pale earth, landslide #376749 on pale green, and other uses the violet brand. Type color does not indicate priority. Category symbols and text remain present. Incident cards, the report chooser/review, and map filters use the same mapping. Responder details lead with the incident type; page counts describe the loaded assignments. Purple/harbor navigation and urgency/status colors are unchanged.
