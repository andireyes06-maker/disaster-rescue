# Motion and remaining-route check, October 17, 2026 (Claude)

Skill: `fixing-motion-performance`. Demo emulator only (`demo-disaster-rescue`). Phone width measured in a same-origin 390px frame.

## Static review (web/src)

| Motion | Surface | Verdict |
| --- | --- | --- |
| `.btn`, `.navlink`, `.emergency-type`, inputs: `transition` on color, background, border-color | small controls | Allowed: paint on small isolated elements |
| `.skeleton-block` shimmer animated `background-position` on full-width rows, infinite | audit (6 rows), analytics (3 blocks) | **Fixed.** Repainted large surfaces every frame. Now a transform-only `::after` sweep (`styles.css`, `skeleton-sweep`) |
| `resident-motion.css` blanket `animation: none; transition: none` under reduce | resident pages | Kept |
| scroll listeners, `requestAnimationFrame`, `IntersectionObserver`, `will-change`, `transition: all` | web source | None found |

## Browser checks

- Skeleton shimmer while `/api/audit` is delayed: 6 running `skeleton-sweep` animations on `::after`.
- Same state with reduced motion emulated: 6 static blocks, 0 running animations.
- After load, all routes below show 0 running animations, no horizontal overflow, and no contrast failures in the direct-text check:
  - Admin (all staff routes): `/admin`, `/map`, `/teams`, `/users`, `/monitor`, `/assignments`, `/analytics`, `/audit`, `/incidents/demo-report-01`
  - Resident: `/my`, `/my/report`, `/my/reports/demo-report-05`, `/my/reports/no-such-report`
  - Public (signed out): `/`, `/login`, `/register`, `/forbidden`

## Not verified

- Leaflet zoom animation on `/map` (library-driven CSS transforms; not measured).
- Frame timing or paint cost (no performance trace taken).
- Flutter animations on a device: pending.

## Superseded (October 17, 2026, later)

Airen then requested a dynamic interface (`../MOTION-IMPLEMENTATION.md`). The "zero running animations after load" result above applies to the static pass only. It is not a requirement. Interaction motion (notification lifecycle, route entrances, landing sequence) is intended. Verified afterwards in `motion-interaction-2026-10-17.md`.
