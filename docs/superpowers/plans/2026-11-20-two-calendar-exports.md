# Two calendar SVG exports implementation plan

> **For agentic workers:** Use superpowers:executing-plans to implement this plan inline.

**Goal:** Match B1.3.2 and L 2.6 to the newly supplied vector exports in source and interactive views, then publish Pages.

**Architecture:** Preserve the 791 original exported frames. Add immutable, hashed reference HTML containing the new SVG bytes and a scoped adapter that supplies the matching file and calendar geometry to the renderer. Reuse existing date/time validation.

**Tech Stack:** Native SVG, JavaScript ES modules, existing calendar runtime and Node tests.

**Spec:** User attachments B1.3.2.svg and L 2.6.svg; existing Calendar/Time Picker requirements in this chat.

## Constraints and review focus

- Business zone Asia/Ho_Chi_Minh, today through +14 inclusive, 07–23, minutes 00/30, no elapsed time, changed valid saves only.
- Source and live hit areas must use the same new geometry, including three scrollable date rows, month arrows and wheels.
- Keep the original catalogue and all unrelated screens unchanged.
- Apply L 2.6 to its standard Flow equivalent as well as the permission preview.
- New source shapes must not be drawn twice; do not retain obsolete background bindings.

## Task: Import, align, verify and release

- [ ] Add failing regression tests for source override, measured grid/wheel/button geometry, Flow alias and untouched other frames.
- [ ] Import exact source SVGs into hashed wrappers; implement scoped metadata adapter; connect both render paths and source hotspots.
- [ ] Run targeted tests and actual SVGDOM runtime on both reference exports and the Flow alias; check binding issues and dynamic dates/time.
- [ ] Run full suite/source/interactive verification, build and review diff.
- [ ] Commit and push main without force; verify public release bytes and entry URLs; report actual evidence and links.
