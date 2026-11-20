# Calendar wheel compositing correction

The authoritative user screenshot has white hour/minute wheel surfaces and blue emphasis on their numbers. The raw Figma SVG rendered large blue blurred rectangles in the browser. Treating their presence in the exported markup as proof of the intended appearance was incorrect.

The wheel's `color-burn` group and Gaussian filter were inside a clipped group with a transparent local backdrop. This differs from blending against the opaque white bottom sheet. Color burn preserves a white backdrop while tinting the gray glyphs; without that backdrop, the filtered blue graphic becomes visible. SVG compositing and isolation are specified in [Compositing and Blending Level 1](https://www.w3.org/TR/compositing-1/).

The shared frame renderer now inserts an opaque white copy of the native wheel viewport as its first child, before the glyphs and blend band. The original filter, blend mode, glyphs, coordinates, dimensions and clipping are retained. Both source viewing and sample interaction receive the same repair. Original exported SVG files remain byte-identical.

Verification:

- The real runtime function was applied to all 791 original SVG documents: eight calendar frames receive two backdrops each; 783 other frames remain untouched. Repeated application adds nothing.
- SVG XML DOM plus native SVG raster rendering confirms the original blue blank-area pixel `(159,184,208)` becomes white `(255,255,255)`, with the numeric emphasis retained. The resulting calendar was visually compared with the user reference.
- Full suite: 232 passing. Original-source verification and all 10,772 action probes pass. Independent code review found no blocking issue.
- Native browser automation stopped because its tool could not determine the URL confidently. The visual artifact above is an SVG render, and final public files are verified through HTTP byte comparison.

Release: `ca140365a7a8`.
