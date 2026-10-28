# Emergency type colours, measured 28 October 2026

Measured with the contrast tool (WCAG 2). Text on its soft tile needs 4.5:1; the icon needs 3:1 (the icon uses the text colour, so it passes whenever the text does).

| Type | Text / icon | Soft tile | Ratio on tile | Ratio on white |
|---|---|---|---|---|
| Lifeline (medical) | #A3294F | #FBE9EE | 6.02 | 7.03 |
| Roadblock (road_hazard) | #6B6400 | #F6F3CF | 5.41 | 6.09 |
| Live Wire (power_line) | #0B6B73 | #DDF1F2 | 5.33 | 6.24 |

## Hue change from the spec's first proposal
The spec proposed amber ochre #8A5A00 and slate blue #3F5A78. Both passed contrast (5.24, 6.11) but were too close to existing colours: the ochre differed from High priority (#8A5100) by CIELAB distance 5.9, and the slate blue from Low priority (#55516B) by 10.7. They were replaced by an olive gold and a teal.

## Distance to the nearest existing colour (CIELAB, higher is more different)
- Lifeline #A3294F: Fire 33.6, Critical 36.2.
- Roadblock #6B6400: Earthquake 24.3, High 26.2.
- Live Wire #0B6B73: Landslide 23.8, Other 28.2, Low 30.2.
Each also travels with its own icon and label, so colour is never the only signal.
