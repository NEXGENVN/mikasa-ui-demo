# App audit against current Figma

Source: [Mikasa Mobile](https://www.figma.com/design/2oHQaSkcqH2GoOidQMwrEs?node-id=506-23873). Native design context and its screenshot were refreshed on 19 November 2026 with session `87ac9ceb-fa14-4ec7-ba37-c313587a48dc`.

65 context/screenshot pairs were acquired: all 23 base routes, their 19 registered dark counterparts, both empty-phone Send variants, six data/schedule sheets, two biometric sheets, and thirteen additional detail variants. Local evidence is in `.audit/contexts/mobile-current-<node>.txt` and `.audit/current-mobile-screenshots/<node>.png`.

## Source mappings and corrections

The route registry remains in `figma-preview/mobile.mjs`. The App has only the source's four main tabs; help/logout remain actions rather than fabricated pages. Profile, security, deletion, phone/OTP recovery, and send/schedule behavior use their Mobile frames.

| Source | Current correction |
| --- | --- |
| Login `658:1036` / `1456:19654` | Current logo mark `c8d96.svg`, exact decorative ellipses, halo, orbital rings, fingerprint and dots; source positions and form spacing. |
| Home `506:23873` / `1430:85737` | Primary `#0F4D88`, orange greeting, source avatar size, send icon `222a8.svg` / `725e3.svg`, summary dots and proportions, 65 px recent rows and their distinct message icons. |
| Send `773:88074` / `1430:86331` | Notice `accc5.svg` / `38e9a.svg`; exact text “Mỗi OA gửi 1 cặp , tương ứng 2 tin.”; source phone/template fields, quantity controls, submit shape and source step positions. |
| Confirm `1279:8766` / `1430:88175` | Notice `497e2.svg` / `df652.svg`; phone `37e64.svg`, template `eb9eb.svg`, account `e4909.svg`; current selected radio; send-now `bdc59.svg`, schedule `0fb9a.svg`, submit `a9191.svg`, back `32de8.svg` / `fb81e.svg`. |
| Scheduled result `1086:73093` / `1442:91277` | Calendar `a3317.svg` inside the source 80 px circle; borderless date/time/status rows, exact copy and footer. |
| History `784:48201` / `1430:85846` | Current source nav/search assets, filter dots, source background glow, row dimensions and initial source statuses. |
| Account `823:51460` / `1450:9744` | Current setting icons, profile card and source switch, current light/dark navigation assets and dark surfaces. |
| Profile `843:50360`, `843:50716` / `1456:12239`, `1456:12749` | Current banner `58960.svg` / `57c76.svg`, phone exchange `a03f0.svg` / `cb66e.svg`, camera `8d03a.svg` / `d3aff.svg`; five source fields only. |
| Appearance `863:1499` / `1450:10174` | Three source choices, current icons and native static radio assets; status bar restored. |
| Password `843:50060` / `1456:14695` | Current banner `996e3.svg` / `9d18d.svg`, source eye/check assets, source button shape. |
| Devices `843:51550` / `1456:14865`; security `852:51826` / `1456:14881` | Source notices `76cab.svg`, approved device icons, approved/status assets and source privacy switch assets. |
| Data `1112:76654` / `1450:9816`; deletion `1112:76816`, `1112:76975` / `1450:9840`, `1450:9918` | Data icon `23231.svg`; destructive sheets use `30a3a.svg` and `48784.svg`, exact warning and destructive styling. |
| Schedule `1279:8468` / `1430:87964` | Source header/calendar/time areas and footer; source underlay retains only the visible confirmation notice and steps. |
| Biometrics `891:2144`, `916:2740` | Original sheets and their own underlying account layout/assets, fingerprint `a8c33.svg`, success `6046c.svg` in its source circle. |
| Recovery `658:34375`, `658:34596`, `658:34855`, `658:35036` | Source phone-only request field, OTP shield `8b8b1.svg`, six input cells, source password eyes, typography and success layout; submitted recovery phone is masked in the OTP screen. |
| All fifteen registered detail frames | Frame-specific status, copy, clock, terminal, notice, recorded/eye, map/ring and back assets are recorded in `detailFrameAssets`. Failed/scheduled variants use their source terminal states, copy, row/card geometry and footer. Dark sent/failed info icons have transparent backgrounds and the source dark borders. Static detail metadata follows the current source; newly created requests retain their own IDs, times, templates and IP data. |

Current-source assets were downloaded unmodified with `curl -L` from the context-provided URLs into `figma-preview/assets/figma/`. Runtime modules and CSS use local files. Source-only reference screenshots are not implementation assets.

The light Home frame currently shows Account selected in the source navigation; that source state is preserved. Frames with no dark counterpart, including recovery and biometrics, retain their actual source theme.

## Verification

`node --test figma-preview/mobile-fidelity.test.mjs` passes 10 tests. Coverage includes route/frame references, source Send/Confirm asset slots and copy, every rendered local image in both themes and sheets, request IDs/timestamps, source-only page structure, recovery/privacy interactions, and the ten additional detail variants. A source-context asset audit also checks frame-specific assets and missing local files. Browser comparison is coordinated by the parent task.

The final detail audit refreshed `1086:73413`, `1308:6902`, `1308:7021`, `1308:7105`, `1309:7446`, `1430:87138`, `1444:95125`, `1450:9014`, `1450:9130` and `784:50672`, completing source coverage. It corrected scheduled status/notice assets (`ce8d2.svg`, `1ee08.svg`), failed status/notice/terminal assets (`41c72.svg`, `81b8b.svg`, `2feb1.svg`), the dark single-completed map (`97b8d.png`), dark recorded/eye/clock assets, and each frame's original map ring assets. Twelve missing files were downloaded unchanged from those contexts. The scheduled actions now match the source's horizontal neutral and destructive outlines; the failure timeline uses its red terminal state and source error text.

Native dimensions are respected per frame: dark failed details are 844 px high, dark multi-sent is 926 px, dark single-completed is 1190 px, and dark multi-completed is 1198 px. Their light counterparts retain their own 926/1164/1199 px source heights.
