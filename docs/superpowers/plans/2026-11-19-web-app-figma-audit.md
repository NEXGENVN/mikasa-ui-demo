# Web ngang, Web dọc and App Figma audit

User request: audit both Web and App, remove invented product UI, add a separate Web dọc preview tab, and update the existing GitHub Pages deployment. Original interactive/sample-data authorization remains valid. No additional design approval is needed for reproducing the supplied Figma.

## Task 1: inventory source frames and deviations

- Source file: `2oHQaSkcqH2GoOidQMwrEs`; Web page `0:1`, Web ngang section `1000:111991`, observed overview frame `1144:70995`.
- Reuse Figma session `87ac9ceb-fa14-4ec7-ba37-c313587a48dc`.
- Obtain high-fidelity design contexts and screenshots for every implemented Web page, portrait counterpart, and product modal before changing their layout.
- Compare App against the saved high-fidelity contexts in `.audit/contexts/`, including icon assets and dynamic-state source links.
- Record confirmed source mappings and removals in a tracked audit report. The previous scope document contains inferred screens; it is not evidence that those screens exist in Figma.

## Task 2: three independent preview tabs

- Add `figma-preview/platforms.mjs` as the shared platform registry and route parser.
- Keep existing `#web/...` and `#app/...` URLs compatible; add `#web-portrait/...`.
- Update `figma-preview/app.mjs` to use the registry for labels, screen menus, last route, and desktop/portrait/mobile dispatch.
- Both Web tabs share sample-domain state and preserve Web form validation and submission behavior.
- Test valid/invalid hash routing and independent last routes; render portrait only from verified source variants before publication.

## Task 3: correct product views and assets

- Adapt the verified Web contexts in `web.mjs` and scoped Web CSS; remove unsupported sections/actions rather than adding explanatory product cards.
- Use dedicated source mappings for Web ngang and Web dọc; keep outer preview controls separate from product content.
- Correct remaining App deviations in `mobile.mjs`, `mobile-controller.mjs`, and scoped `mobile.css` from saved/new source contexts.
- Inspect the supplied `NEXGEN_Logo_Vector [Converted].svg`; preserve it unchanged and use only in the source design's NEXGEN logo slots.
- Preserve original static assets and their aspect ratios; download any missing assets from the context-provided URLs.

## Task 4: validate and publish

- Run meaningful routing and interaction tests plus the existing suites.
- Compare representative render screenshots at the source frame dimensions for all three tabs and theme variants.
- Verify no missing assets, invented product routes, stale frame links, or errors in representative flows.
- Request a bounded source/implementation review, resolve important findings, then commit and push the existing repository without force.
- Verify public Pages HTML/CSS/modules and all three entry URLs before sending the updated link.

Access resolved: the second reconnection restored native Figma access. Current Web ngang/dọc contexts and 65 App contexts/screenshots were acquired, including the ten initially limited detail variants. Implementation and the five review corrections are complete. Source mappings and checks are recorded in `docs/superpowers/reviews/2026-11-19-web-portrait-app-audit.md`. Publication follows the final local checks and is verified against the public deployment.
