# Figma Interactive Fidelity Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans for shared integration, with independent App/Web source adapter tasks. Track the steps below through deployment.

**Goal:** Make the interactive preview visually match the original Figma frames while supporting all source controls and sample flows on Web ngang, Web dọc and App.

**Architecture:** Share the original vector canvas between source and interactive modes. Derive semantic control overlays and text slots from native Figma geometry; preserve the original drawing until a value changes. Domain adapters update the existing sample model and route to exact source states.

**Tech Stack:** Static ES modules, original inline SVG documents, native HTML controls, local font assets, Node build/test tooling, CUA browser checks, GitHub Pages.

**Spec:** `docs/superpowers/specs/2026-11-19-figma-interactive-fidelity-design.md` and the user's current request.

## Global constraints

- All 791 original source frames remain available, with no invented product screens.
- Each platform uses its own source dimensions and states; collapsing the sidebar never changes orientation.
- No real external operations; mutations stay in sample browser memory.
- No new renderer-specific visual approximation for initial states.
- Preserve release hashes and unrelated existing previews.

## Review focus

- Overlapping parent/child hit areas must not steal clicks from input or icon controls.
- Text replacement must not hide unrelated icons, labels, borders or background drawings.
- Input values and sample records must persist across original frame variants and history navigation.
- Source prototype errors must not send a clearly labeled submit button into an unrelated flow.
- Validation, repeated clicks, IME typing and narrow viewport zoom must not corrupt state or hit geometry.

## Task 1: Derive complete source control manifests

Files: new build scripts and generated interactive metadata for App and Web; source inventories remain private.

- [x] Record all visible interactive source nodes, exact rectangles, labels, text slots and source targets.
- [x] Classify native input/button/select/toggle/table/filter/dialog actions; expand source instances where needed.
- [x] Test source geometry, overlap policy, target existence and all-frame coverage; report unresolved controls explicitly.

## Task 2: Shared original-vector interactive renderer

Files: `figma-preview/interactive-preview.mjs`, `.css`, state/slot helpers and corresponding tests; integrate `app.mjs`.

- [x] Write failing tests for shared source file identity, control bounds, text escaping, state persistence and same-platform navigation.
- [x] Render transparent semantic controls over the same original frame used by source mode.
- [x] Implement precise source glyph slot replacement and persistent native input focus/value handling.
- [x] Implement keyboard/focus/selection behavior, scaled hit geometry and source-backed component/dialog states.

## Task 3: Domain sample flows

Files: App/Web interactive adapters/controllers and tests; reuse `core.mjs` where compatible.

- [x] Implement App authentication/recovery, send/schedule/process/result/history, profile/settings/security/data flows using original states.
- [x] Implement Web navigation/collapse, account/OA CRUD, history filters/details, report/export, security/settings/roles using original states.
- [x] Verify each visible action has meaningful behavior, all state-changing operations persist, and repeated submit cannot duplicate a request.

## Task 4: Complete validation and publication

- [x] Run full tests and source/control coverage checks, resolve all important review findings.
- [x] Browser-compare source and interactive initial/edited/overlay states for all three platforms and narrow viewport.
- [ ] Build content-hashed release, commit and push to the already authorized Pages branch.
- [ ] Verify the deployed release and return fresh versioned links; final public browser verification depends on tool availability.
