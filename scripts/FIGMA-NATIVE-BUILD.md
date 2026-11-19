The native catalogue is built from cached Figma TSX source, exact frame dimensions and original source assets. It emits ordinary static HTML and CSS; esbuild is used only at build time.

```powershell
npm ci --ignore-scripts
node scripts/figma-native-build.mjs --manifest .audit/combined-native-manifest.json --metadata .audit/mobile-page-current.xml --metadata .audit/web-page-current.xml
```

The input is an array of `{id,name,width,height,platform,theme,family,group,contextPath}` objects. `w` and `h` are accepted as aliases. A manifest object with `frames`, `metadataPaths`, and optional `options` is also supported. All local input paths resolve against the current repository root. Run `--help` for CLI options.

Each successful frame becomes `figma-preview/native/{id-dash}.{content-hash8}.html`. The public `figma-preview/native/manifest.json` retains display metadata and a relative `file` path. It excludes source cache paths and temporary URLs. A failed frame has no published manifest entry, no fabricated replacement and no stale HTML left for its ID.

The private `.audit/native-build-report.json` records every source, failure reason, unsupported class, source node ID, component adapter, and SHA256 asset checksum. `figma-preview/native/assets-manifest.json` contains only public filenames, sizes and checksums. Original assets resolve to `../assets/figma/{filename}` from the native frame. Missing assets are prefetched unchanged with up to eight concurrent curl downloads; `--no-download` makes absent originals strict build failures.

`compileFrame(frame, options)` and `buildManifest(manifestOrPath, options)` are exported for incremental builds. Options include `root`, `outputDir`, `assetDir`, `metadataPaths`, `downloadAssets`, `emit`, `componentSources`, `componentOverrides`, and `builtinAdapters`. Passing `emit:false` audits conversion without changing generated files. `componentSources` maps a component name to its actual JS/TSX implementation and overrides the builtin adapter.

CodeConnect wrappers are removed from output while their node IDs and metadata dimensions reach explicit adapters. Current builtin adapters reuse the existing mobile statusbar geometry, the existing Vuexy Lucide WiFi component's original official SVG, and the original native chevron SVG. They use no text glyph substitutes. Each use is recorded with provenance. These are component adapters, not native exports of complete frames. Sparse source responses require sublayer design-context fetches. Unknown components, missing originals and unsupported utilities fail the frame build.

Source callbacks run in a fresh VM realm without host callbacks, filesystem, network, process or require. Dynamic code generation is disabled and rendering is bounded by a timeout. Only JSON crosses from source evaluation back to the builder. Motion elements retain their native styles as static tags; animation timelines are not synthesized.

Native frames load selfhosted Inter, Roboto and Baumans originals through a content-hashed `figma-preview/assets/fonts/native.{sha12}.css` copy of `native.css`. The stylesheet version participates in each HTML content hash. The builder verifies every referenced local font file exists; callers can explicitly provide `fontCSS` for controlled fixtures. That folder records the Google Fonts source, checksums and original licenses. No network font request is needed while viewing a frame.
