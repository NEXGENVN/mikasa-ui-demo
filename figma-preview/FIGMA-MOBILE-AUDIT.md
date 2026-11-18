# App fidelity correction · 18 November 2026

Reference: [Mikasa / Mobile](https://www.figma.com/design/2oHQaSkcqH2GoOidQMwrEs/Mikasa?node-id=506-23873).

The previous App implementation reused Web forms and invented several secondary screens. This revision replaces those layouts with the Mobile frame structures, original downloaded assets and source frame links. `mobile.mjs` contains the complete route-to-frame registry, including the corresponding dark frames. The toolbar and screen index link to the selected frame rather than the style-guide overview.

| Area | Main light reference frames | Correction |
| --- | --- | --- |
| Account | TK1 `823:51460` | Original sections, Vinh fixture and inset navigation |
| Profile | H1 `843:50360`, H1.1 `843:50716`, H1.3 `843:50893` | Banner/avatar, five source fields, edit and success screens |
| Appearance / language | GD1 `863:1499`, N1 `863:1189` | Three theme list rows and downloaded/available languages |
| Password | Đ1.1 `843:50060` | Original banner, three fields and 8–20 character rules |
| Devices | Q.1 `843:51550` | Three approved Samsung devices and original explanatory notice |
| Session security | P1 `852:51826` | Idle timeout, two privacy switches and system-managed session status |
| Data | TK2 `1112:76654`, TK3 `1112:76816`, TK4 `1112:76975` | Two original actions and destructive bottom sheets |
| Fingerprint | ĐN2 `891:2144`, ĐN2.1 `916:2740` | Verification and success sheets |
| Send | B1.1 `734:77892`, B1.2 `773:88074`, B1.4 `1279:8766` | Phone/template/OA controls, original stepper and confirmation cards |
| Schedule | B1.3.2 `1279:8468`, B1.3.3 `1086:73093` | Calendar/time sheet and scheduled-success layout |
| Processing / result | B1.4.1 `778:89003`, B1.4.2 `1279:8878` | Progress/wait cards, history exit and original success illustration |
| History / details | L2 `784:48201`, L2.5–L2.14 | Seven source fixtures, separate sent/failed/completed/multi-OA/scheduled structures |
| Recovery | A1.1–A1.4 `658:34375`, `658:34596`, `658:34855`, `658:35036` | Phone → OTP → new password → success |

Removed fabricated standalone Help and logout-confirmation routes, extra profile role field, Web device revocation controls, theme thumbnails, App CSV/restore actions, and the manual processing-result button. Bottom tabs now appear only on the four source main screens. Long details retain their source frame heights.

This is an interactive prototype: edited values, new requests and schedule dates are sample data. They occupy the source layout slots. Where no dark counterpart is recorded, the source light frame is retained. This registry covers 23 primary routes and contextual variants; it does not claim every validation/loading duplicate in the Figma canvas.

Validation: 22 Node tests; local Chromium render of all 23 routes in both theme settings; no missing image assets or JavaScript exceptions. Browser checks cover profile save, OA controls after entering a phone number, scheduled send/detail, phone recovery/OTP, and Web overview. Representative light/dark screenshots were compared with the Figma reference screenshots. Windows Computer Use could not determine the browser URL, so the local browser checks used a separate headless development browser.

