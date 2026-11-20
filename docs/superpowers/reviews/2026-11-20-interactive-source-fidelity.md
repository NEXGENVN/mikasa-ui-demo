# Interactive preview source fidelity — 20 November 2026

Both preview modes now share the same 791 original source documents: 347 landscape Web, 221 portrait Web and 223 App. Interactive mode places semantic controls at original Figma coordinates and updates proven glyph slots instead of rendering separate HTML product layouts. Source viewing remains unchanged.

Native component assets supply popup menus, conditional OA counter states, role-card backgrounds, checks/switches and source content below the viewport. The calendar retains original selection artwork and font geometry while projecting valid dates and Bangkok time. Source-clipped fields keep their original clipping.

Sample flows cover authentication/recovery, account creation/editing, source sidebar variants, filters/pagination/details, OA/GIF/message records, report downloads, role permissions, preferences/security and App sending/scheduling/results/history/profile/data. Scheduled edits and cancellations persist independently of later sends. There is no standalone map source page; the supplied detail-map controls remain available.

## Verification at release preparation

- Full suite: 227 passing, zero failures.
- Source verification: all 791 documents and seven original raster assets retained; zero errors.
- Interactive verification: 10,731 controls and 41 timers; all 10,772 action probes resolve without handler exceptions or invalid/cross-platform destinations. All 791 rendered interactive documents retain their original source-file identity. All 560 referenced component artifacts exist.
- Glyph ownership: 11,608 source slots, comprising 11,471 matched, nine proven fully clipped and 128 empty. No unresolved/ambiguous slots or unsupported source paths. Duplicate original/component glyph copies are hidden together only after editing and restored together.
- Browser checks exercised App login, phone input, OA count, confirmation/result/detail, calendar month/day/time/save; landscape sidebar/account creation/card selection and native role menu; portrait live search/detail; and the OA form below the original viewport, including keyboard submission.
- Independent code/semantic review found and corrected retry destinations, copied GIF/message classification, role selection/permission isolation, scheduled edit/cancel hit areas, transaction isolation and scheduled-detail time projection. Later targeted regressions are included in the full suite.

The browser tool became unavailable during the final audit. Final public deployment verification therefore uses HTTP status and byte comparisons against the exact locally tested release; it does not constitute an additional public browser interaction run. Deployment evidence is recorded locally in `.audit/public-deployment-verification.json`.

Release: `415707db9512`. GitHub Pages serves `main` at `/figma-preview/`; existing root and `/vuexy/` previews are preserved. All operations remain simulated in browser memory.
