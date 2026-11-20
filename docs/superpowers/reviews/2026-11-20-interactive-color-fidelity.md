# Interactive source-paint correction

The supplied SVG exports resolve instance/theme colors that differ from the fallback colors in native `.fig` component masters. Interactive OA states and changed single-run text previously reused those older master colors.

- OA plus: the supplied `1635:105527` SVG uses `#0F4D88` and a `#F8FAFF` plus sign. Eight generated Light/Dark states used `rgba(25, 92, 250, 1)` and dark glyphs. Their original geometry is retained and their paints now come from that exported source button. The component compiler applies the same reconciliation on future builds.
- Changed hour/minute text retains the actual matched original SVG paint, transform, parent context and clipping. Explicit entered-value font colors and mixed-color text remain supported. Newly projected calendar-day fonts also resolve their original exported paints.
- The initial color-only correction left calendar compositing unchanged. The user's subsequent reference shows white wheel surfaces; the raw SVG's blur declarations alone did not establish the intended rendered appearance. See [the compositing correction](2026-11-20-calendar-compositing.md).

Verification: 230 tests pass; original-source verification covers all 791 frames with zero errors; all 10,772 control/timer action probes pass. Source SVG documents are unchanged. Computer Use stopped before local interactive rechecking because it could not determine the current browser URL confidently; final publication is checked through HTTP byte comparisons.

Release: `608c994f96c7`.
