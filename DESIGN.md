---
name: Rescue Reports
description: Incident reporting and connected response
colors:
  primary: "#6D28D9"
  harbor: "#241747"
  paper: "#F5F6FA"
  surface: "#FFFFFF"
  ink: "#211D35"
  muted: "#625E73"
  critical: "#B42318"
  high: "#8A5100"
rounded:
  control: "10px"
  surface: "16px"
typography:
  body:
    fontFamily: "Geist Variable, system-ui, sans-serif"
    fontSize: "15px"
    fontWeight: 400
    lineHeight: 1.55
  display:
    fontFamily: "Geist Variable, system-ui, sans-serif"
    fontSize: "clamp(42px, 4vw, 62px)"
    fontWeight: 550
    lineHeight: 1.08
    letterSpacing: "-0.04em"
---

# Rescue Reports design system

Implementation direction selected by Codex under Airen's October 17 authorization to redesign the entire product. Preserve the indigo/violet identity, real workflows, authorization and current functional repairs. Older screenshots are references, not binding compositions.

## Overview

A clear civic response service: composed, legible and specific to incident coordination. White and cool paper surfaces for reading; deep indigo for navigation and product demonstrations; violet for the next action. Red and amber retain their emergency meanings. A geometric cross within a rounded square identifies Rescue Reports without implying medical certification or government affiliation.

## Colors

Use `web/src/theme/tokens.css`, mirrored in `docs/design-tokens/tokens.json`; Flutter owns its native equivalents in `mobile/lib/theme/app_theme.dart`. Paper #F5F6FA, white #FFFFFF, ink #211D35, muted #625E73, primary #6D28D9, harbor #241747, mist #E5E3ED. Keep critical #B42318 and high #8A5100. Corners: 10px controls, 16px major surfaces. Reserve shadows for elevated navigation and substantial composed panels.

## Typography

Geist Variable is self-hosted and remains the web family. Use weight 400 for prose, 500 for controls, 600–650 for titles. Body 15–16px; metadata 13px; workspace titles 30–36px; public display fluid 42–62px. Tracking never below -0.04em. Prioritize actual wrapping over artificial line counts. Native uses the platform text family with the same hierarchy.

## Layout

Public: compact navigation, a large editorial proposition, an integrated illustrative incident workspace, then concise workflow/audience access. Avoid an oversized purple billboard and repeated definitions.

Residents: compact top navigation, a restrained page heading and a readable task workspace. Reporting uses incident category choices and description beside an explicit location panel; evidence/contact follow. No extra wizard or forced navigation steps. Show actual selected location, no fabricated map position.

Staff: deep-indigo rail, slim account bar, light page header, dense operational panels. Tables and inboxes have aligned columns and subtle separators. Detail, map, analytics and management each keep their own appropriate composition. Admin team creation stays above a searchable, bounded rename list; service checks use readable availability labels. Missing reports have an explained recovery action, and rescue histories distinguish loading from a completed empty read.

Native: safe-area aware, generous interactive targets, grouped fields, clear navigation and an action-led report flow. Preserve all four reporting steps and account-scoped recovery.

## Elevation & Depth

Use borders and spacing to separate routine content. Reserve depth for the public product scene, floating menus and modal surfaces. Maps own their stacking context; they must not cover navigation or form actions.

## Shapes

Use 10px control corners and 16px major surface corners. Icon tiles and category controls share these shapes. Avoid rounding each text row into a separate card.

## Components

Use shared state motion throughout forms and feedback. Field errors enter fully opaque with local feedback motion. Validation appears and clears in its final layout immediately, so neighboring controls never move through error text. Short FLIP transforms remain for ordinary form layout changes when feedback is unchanged. Keep validation and focus immediate. Banners acknowledge new copy, data states and selected incident previews arrive, and shared overlays complete their exits before removal. Dialog exits return focus promptly and support rapid reopen. Honor reduced motion for every state effect. Implementation and verification: `design-plans/codex-redesign/STATE-MOTION-HANDOFF.md`.

Keep feedback local. Real pending states prevent duplicate mutations; errors preserve values and identify recovery. Airen explicitly requested a dynamic motion system after the initial redesign: page workspaces enter in 280–320ms with navigation held steady, notifications open from the bell in 300ms and close in 160ms, and at most five notification rows enter with a capped stagger. The public focal sequence connects incident queue → drawn route → response update, followed by once-per-visit section reveals. Controls remain usable throughout; routine data refreshes do not replay page entrances. Honor reduced motion, including live preference changes. Keyboard focus is visible, and every route has a working skip target. Skeletons reserve the shape of content, empty states explain the next action, and background refresh preserves context.

## Do's and Don'ts

Illustrative maps/queues are visibly labeled and never represent live incidents. No invented hotline, endorsement, response guarantee, privacy promise or app-store release. Review the actual desktop and phone implementation, not only a concept. The handoff ledger records source changes and verified states separately.
