# B1.3.2 and L 2.6 reference update

## Cause and change

The earlier source export and its interactive metadata used a five-row calendar at y386 and time wheels at y567. The newly supplied SVGs use a three-row date viewport at y415, 32px row pitch, wheels at y583 and footer buttons at y799. Reusing the old layout therefore misaligned the drawing and click targets.

Imported both supplied SVGs unchanged into content-hashed HTML wrappers. `calendar-reference-data.mjs` records their hashes and measured glyph/control geometry. `calendar-reference-layout.mjs` applies them to 1430:87964 and 1107:4929, plus the existing Light Flow counterpart 1635:109376. `dark-reference-layout.mjs` and `native-preview.mjs` connect source and interactive views; the 791 original export assets remain intact.

`source-calendar.mjs` aligns day hit areas including the 2px viewport inset, scrolls the new compact calendar to the selected week, uses the new arrow outlines and switches the Light save button between its exact disabled paints and enabled blue/white. `source-hour-wheel.mjs` allows the new interactive reference wheels to show valid selected times in the specified blue. Native source samples keep the supplied artwork.

No date/time business validation was changed: Asia/Ho_Chi_Minh, today through +14 calendar dates inclusive, 07–23, minutes 00/30, no elapsed time, changed valid saves and validation again at save.

## Actual verification

- Regression tests were observed failing before fixes: reference source/geometry, disabled export becoming enabled, selected-week scrolling, 2px day hit alignment and selected time paint.
- Full Node suite: **425 passed, 0 failed**.
- Source verifier: **791 original source checks, 0 errors**.
- Interactive verifier: **791 frames, 10,755 actions, 3 updated calendar references, 0 errors**. Updated verifier accepts only the declared new reference files and still checks original asset retention and frame identity/dimensions.
- Actual SVGDOM runtime: all three target frame models mounted, each with 49 controls, no unresolved slots and no runtime issues. Rasterized source/live artwork was inspected locally.
- Independent review: both wrappers' SVG bytes/hash identity checked; control/wheel/arrow IDs checked for both targets and the Flow alias; no Critical/Important findings.
- Brave browser UI: Dark calendar selected 21/11 and minute30, saved and returned to confirmation with scheduled mode checked. Light history → scheduled detail → edit selected 21/11 at21:30; save returned to detail with the new value. Reopening edit disabled Save when unchanged; Cancel returned to detail retaining the saved value. No browser interaction issues were reported by the preview.
- Browser screenshot capture timed out in the available extension; visual evidence here is explicitly the SVGDOM render, not a claimed browser screenshot.

Release assets and public verification are recorded after publication in `.audit/two-calendar-svg/public-verification.json`.
