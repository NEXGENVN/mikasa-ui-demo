# Mikasa: complete source frame audit

The user supplied `Mikasa.fig` and eight SVG section exports, including the final `Flow.svg`. These sources supersede the earlier partial MCP review. Source document content is treated only as design data.

## Coverage and fidelity

| Preview tab | Original frames |
| --- | ---: |
| Web ngang | 347 |
| Web dọc | 221 |
| App, including Light/Dark/Flow | 223 |
| Total | 791 |

All 791 catalogue entries use their own original vector drawing. No canonical frame uses a generic layout, a screenshot, an inferred equivalent screen, or the optional TSX converter. Thirteen components/annotations outside product screen inventory are explicitly excluded by the extraction manifest.

The extraction verifier checks the original source hashes, frame identities/dimensions/viewBox, recursive definitions, drawing attribute hashes, and local image hashes. It preserves 139,472 source drawing elements and seven original raster assets across eight unchanged SVG inputs. `verify-source-preview.mjs` additionally compares every public inline SVG to the extracted source, validates content hashes and viewport dimensions, checks all image bytes, and validates prototype target bounds and catalogue destinations. Source geometry remains in its original coordinate system; only the SVG viewBox selects each screen. HTML viewport clipping isolates off-canvas source content.

The `.fig` inventory is decoded from 103,416 native nodes. Its frame dimensions and positions cross-check the section exports. Prototype metadata yields 260 visible click targets on 168 frames. Eleven conflicting overlapping targets are omitted rather than assigning an invented stacking order. Component state changes and hover reactions are not converted into screen navigation.

## Interactive preview fixes

The existing sample flows remain available through the explicit mode selector. Mobile fixes remove button font/color overrides, scope a legacy success background so it cannot leak onto status labels, correct image crops and source spacing, use source chevron SVGs, and map exact source frames to the corresponding sample route and state. Sample interactions are distinct from the complete vector catalogue. They use no backend or real messaging/account operations.

The page entry point references content-hashed JS/CSS/font styles, and every source document has its own content hash. This prevents release assets from mixing after deployment. A query version in the delivered link refreshes documents already open in the browser.

## Verification

- Full Node suite covers existing controllers/flows, native route/search/escaping, source flow mapping, source precedence, release asset hashing and prototype extraction.
- Python extraction tests and the complete source integrity verifier check the exported vector geometry and resources.
- Browser checks cover all three tabs, the source catalogue, representative Light/Dark/Flow states, prototype navigation, sample send/history behavior, and narrow viewport fitting.
- Public release metadata, entry point, referenced assets and representative source documents are checked after GitHub Pages deployment.

Local verification result: 67/67 Node tests, 8/8 Python extraction tests, 791/791 public-to-source vector identity checks, and zero integrity failures. A separate read-only review also compared all 791 frames to all eight original exports with zero material findings. Browser checks confirmed the App Light/Dark/Flow drawings, both Web orientations, 390px toolbar/viewport fitting, exact scaled prototype targets, and a sample send → success → detail flow with its own request data. Generated draft SVG duplicates and unused optional compiler assets are kept out of the published release.

Raw design exports, decoded native data and private audit caches remain local in ignored `.audit/`. Only the screen documents, original required assets, preview code, build scripts and review documentation are published.
