# Figma interactive preview fidelity

The user requests the same Figma appearance in the interactive mode as in the source viewer, with all buttons and flows for Web ngang, Web dọc and App, followed by GitHub Pages publication. Existing authorization covers sample data and publication. This continues the approved preview; it does not introduce a new product design or require a further approval round.

The current mismatch is architectural: source mode renders 791 original SVG frames, whereas interactive mode renders separate HTML/CSS screens. The correction is to use the original vector frame as the shared visual canvas in both modes. Interactive mode adds semantic native controls at Figma node coordinates, changes only the source slots whose values actually change, and navigates to the supplied full-screen states. Source mode remains an untouched visual reference.

## Requirements

- Preserve the original artwork, positions, dimensions, colors, text styles and assets in the three independent form factors.
- Make visible buttons, inputs, selections, switches, filters, table actions, pagination and dialogs operable. Source prototype interactions are evidence, supplemented by the actual visible control labels and source state frames when source links are missing or erroneous.
- Support sample authentication/recovery, App sending/scheduling/results/history/profile/preferences, and Web account/OA/history/report/security/settings administration. Edits must persist across the corresponding steps and list/detail states.
- Use the existing sample data model; no real authentication, messaging, account mutation, payment or external service connection.
- Keep input and selection state when navigating. Support keyboard operation and meaningful accessible names. Avoid remounting active inputs on each keystroke.
- Reuse the canonical frame SVG unchanged at rest. Replace glyphs only inside proven text slots when a sample value changes; do not paint broad rectangles over source artwork.
- Use only provided source screen states. Do not fabricate help screens, layouts, or destination pages.
- Preserve the entire source catalogue, exact source links, content-hashed releases, and existing `/` and `/vuexy/` pages.

## Approaches

Repairing hundreds of independent HTML screens would keep the mismatch-prone duplicate renderer. Navigation-only hotspots retain the drawing but cannot edit forms or update sample data. The implementation choice is an original-vector canvas plus semantic controls and source-backed state transitions. This is the technical choice for fulfilling the user's already explicit fidelity and interaction requirements.

## Boundaries

Build tooling derives control geometry, labels, typography, prototype links and source states from the local `.fig` and SVG exports. App and Web adapters assign business actions using source context. The shared renderer handles native controls, focus, scaling, input values, exact source text slots and event dispatch. Domain controllers handle sample mutations and select the corresponding original frame. The preview shell owns mode/platform switching and history.

## Verification

Test geometry and control coverage against the source inventory, target existence/form-factor isolation, validation, persistent create/edit/send/filter/export flows, repeat submissions, and safe text rendering. Compare the rendered interactive canvas with the source frame at rest and inspect edited/selected states in the browser for all three tabs, including a narrow viewport. Verify the deployed release and public interactive outcomes before returning links.
