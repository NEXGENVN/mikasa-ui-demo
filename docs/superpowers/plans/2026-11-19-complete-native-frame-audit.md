# Complete native Figma frame audit implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Audit and expose every product frame in the supplied Figma, correct layout and asset discrepancies, preserve sample interactions, and verify the updated GitHub Pages deployment.

**Architecture:** Extract original vector drawings from the user's eight SVG section exports and cross-check the native `.fig` inventory. Place each vector in an isolated static HTML document. The three-tab shell offers all 791 original frames and sample interaction flows separately. Source frames use their actual dimensions; no full-screen screenshot is used as runtime UI. The earlier TSX converter remains optional tooling, not the canonical renderer.

**Tech stack:** Static HTML/CSS/ES modules, a build-only native TSX converter with esbuild, existing Node tests, and CUA browser verification.

**Spec:** The user's current request and the supplied Mikasa Figma file. Prior authorization covers implementation and GitHub Pages publication; no new design approval is required to reproduce that source.

## Global constraints

- Preserve Web ngang, Web dọc and App as separate tabs.
- Preserve the source's exact positions, dimensions, text, assets, colors and states; do not infer unseen screens from metadata.
- Keep all original assets local and unmodified; no temporary Figma URLs or screenshot-as-page implementation.
- Missing/sparse/unavailable contexts remain explicit failures until resolved, not substituted with a generic screen.
- Preserve working sample flows, including source-backed creation/send/history/security states.
- Keep `/` and `/vuexy/` unchanged.

## Review focus

- CSS cascade leaking between the shell and source products.
- Source frame IDs/dimensions differing from the state actually rendered.
- Images loaded asynchronously after screenshot capture.
- Stale HTML, JavaScript or CSS mixing deployment versions.
- Code Connect source components requiring explicit compatible adapters.

## Tasks

- [x] Reproduce the reported App and inspect its rendered geometry and image resources.
- [x] Trace Mobile button typography/color resets and legacy success backgrounds to the source of the mismatch.
- [x] Inventory all Web source groups and all Mobile page frames; retain exclusions explicitly.
- [x] Acquire complete native source and all eight section SVG exports, including Flow.
- [x] Build strict native TSX conversion as optional tooling; extract all canonical source vectors without redrawing.
- [x] Add a complete source-frame catalogue with searchable groups and exact frame/source links in the three-tab shell.
- [x] Correct the existing interactive Mobile cascade/layout and any source-backed missing interaction states.
- [x] Add versioned release assets so the public preview cannot mix previous and current code/styles.
- [x] Verify every generated frame structurally/assets/geometry, then inspect representative rendered screens and fix differences.
- [x] Run relevant interaction/routing checks and obtain a bounded independent review.
- [ ] Commit and publish the verified release.
- [ ] Verify the exact deployed artifact versions and visible public outcomes before returning the link.
