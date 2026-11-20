# ZIP dark App references implementation plan

> **For agentic workers:** Use systematic debugging, TDD and verification before completion. Account/settings and message artwork are independent delegated modules; root owns integration, layout and publication.

**Goal:** Match all 26 PNG reference screens in `C:/Users/admin/Downloads/New folder.zip` and publish an updated interactive preview.

**Architecture:** Keep original SVG exports immutable. Apply frame-scoped reversible native SVG corrections shared by source viewing and interaction. Keep each interactive field's single drawing owner and existing Full/Single permission policies.

**Tech Stack:** ESM, native SVG DOM, Node tests, Resvg, GitHub Pages.

**Spec:** The 26 user-supplied PNGs extracted to `.audit/user-zip-20261120/New folder/`, plus existing scheduling and OA rules in this conversation.

## Global constraints

- No Web changes or original SVG rewrites; retain 791 original frames and old releases.
- Full 1–5 OA, Single 1 OA; data, drafts and background jobs stay isolated.
- Keep source geometry, fonts and correct dynamic values; use actual SVG paint before stale Figma metadata.
- Scheduling remains Asia/Ho_Chi_Minh, today through +14 inclusive, hours 07–23, minutes 00/30, future time validation.
- No screenshot bitmap used as an application screen asset.

## Review focus

- Dark corrections must not affect Light or Web.
- Repeated frame restoration must be idempotent and interact safely with live text/status projection.
- Single details use timeline; Full details show OA results; avoid unrelated off-fold blocks and clipped footer rows.
- Account dialogs retain click areas, overlays, return routes and sample-only deletion.
- All 26 references map to an existing frame, with a visible before/after artifact for changed areas.

## Tasks

- [x] Map 26 images to frame IDs and record measurable source differences.
- [x] TDD account/settings corrections in `source-dark-account-reference.mjs` and tests (delegated).
- [x] TDD message icon/tile/separator corrections in `source-dark-message-reference.mjs` and tests (delegated).
- [x] TDD root step/header/detail layout corrections, integrate helpers in native restoration and runtime as needed; correct native and dynamic decrement contrast and finite minute placement.
- [x] Render all 26 targets, verify live drawing ownership, controls and permission flows; independent review findings corrected and rechecked.
- [x] Run full suite (419), source/action verification (791/10,755), build and diff check; commit/push; verify release0805df9d9ea6,69 byte-identical public files and223 App frames before returning links.
