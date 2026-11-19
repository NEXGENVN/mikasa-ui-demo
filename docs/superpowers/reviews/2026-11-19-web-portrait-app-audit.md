# Web ngang, Web dọc and App source audit — 19 November 2026

Source file: [Mikasa](https://www.figma.com/design/2oHQaSkcqH2GoOidQMwrEs/Mikasa). Current native design contexts and screenshots were retrieved after the Figma connection was restored. Source screenshots are comparison references only; runtime UI uses HTML/CSS and the original local assets.

## Delivered structure

The preview has three independent entries, with shared sample-domain data and independent last-screen navigation: `#web/overview`, `#web-portrait/overview`, and `#app/overview`. Both Web variants have 16 registered routes; App has 23. The toolbar links to the frame actually used, including selected OA/security/role states and source modals. Web canvases preserve their source dimensions and scale to the available width; content within them can scroll. Root and Vuexy demos are outside this change.

| Web area | Landscape source | Portrait source |
| --- | --- | --- |
| Login | 67:1340 | 495:41658 |
| Phone recovery / OTP / new password / result | 64:2776 / 64:2818 / 64:2905 / 64:3266 | 495:42245 / 495:42342 / 495:42405 / 495:42546 |
| Overview | 1144:70434 | 1214:84730 |
| Accounts / create / detail / edit | 64:3513 / 64:4748 / 64:5315 / 98:2568 | 458:15284 / 458:16759 / 458:18079 / 458:19300 |
| Deactivation confirmation | 98:2356 | 458:18733 |
| Recovery tab — literal source backup table | 557:35890 | 580:27340 |
| OA / GIF / messages | 557:36756 / 557:36948 / 557:37037 | 458:21540 / 458:22952 / 458:26862 |
| History / success detail / failure detail | 557:49673 / 557:50194 / 557:50113 | 31:5251 / 98:3079 / 47:8835 |
| Reports | 105:2990 | 470:16153 |
| Security configuration / account / notifications | 1214:69975 / 1214:70371 / 1214:70572 | 495:39196 / 1226:92877 / 1226:93090 |
| Roles / management selection / add-role overlay | 491:19159 / 540:26898 / 540:27304 | 552:25880 / 556:26026 / 556:26290 |

The source registry includes per-frame canvas and main-column geometry rather than treating portrait Web as the App layout. Both Web sources are Light. No Web dark design was invented. Current Light Primary is `#0F4D88`. The NEXGEN SVG supplied by the user is unmodified (SHA-256 `389a81526f4aee0fcc804e61fb506a1bc93f3499f78258e07499994d0a41285f`). App retains Mikasa branding as its source does.

## Corrections and interaction scope

Removed the invented Web send route, sidebar user/logout block, email recovery dialog, account editing dialog, generic OA-result/timeline detail panels, session-revoke page and unsupported settings profile/notification forms. Source account creation/editing are full pages; source admin overlays remain contained in the Web canvas. OA/GIF/message tabs retain their own source fields, rows, detail content, provider forms, token metadata and source assets. Portrait source inconsistencies (including reused row names) are preserved.

Source-backed sample interactions include phone/OTP recovery, account creation/edit/deactivation, account/history/OA filtering and pagination, overview date/status filtering, report filters and CSV/Excel export, session policies, MFA, device decisions, role creation/status and permissions. The account recovery tab displays the source's backup rows rather than a fabricated password-reset queue. Restore and provider connection actions report sample outcomes without contacting services. Source-visible Map and unsupported settings tabs have no invented destination.

App was refreshed from 55 current context/screenshot pairs. Its route and asset audit, source oddities and ten detail variants which could not be refreshed due to Figma's tool-call limit are documented in [the App audit](2026-11-19-mobile-current-figma-audit.md). This delivery does not claim a new pixel comparison of those ten variants, or implementation of every frame in the entire Figma file.

## Verification

- 42 Node tests pass, covering routing, escaped sample input, request snapshots, source structures/assets, source modal/state mappings, report reconciliation/export, account recovery, overview filtering and role status/search behavior.
- Browser route sweep: all 32 Web entries and all 23 App entries in both themes loaded local images without failures; no JavaScript errors were captured.
- Browser interaction checks: account creation, source backup tab, GIF tab, failed history detail, security tabs, role search/caret, inactive role creation, phone/OTP/password recovery and App send/processing/result.
- Visual inspection at the source comparison viewport and a 390 px viewport confirmed separate portrait layout, retained source canvases and no document horizontal overflow. App light/dark and Web overview, roles, backups and GIF were inspected visually.
- Five final review findings were corrected: backup destination, account empty/reset state, overview date filtering, inactive role status, and role search focus preservation.

All data is temporary browser-memory sample data. Only the preview theme is persisted. There are no backend calls, real ZNS deliveries, credential updates or live administrative changes.
