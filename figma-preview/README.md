# MIKASA · Figma Web & App Preview

Preview theo Figma Mikasa, xuất bản ở https://nexgenvn.github.io/mikasa-ui-demo/figma-preview/. Cả **Xem mẫu Figma** và **Bấm thử dữ liệu mẫu** dùng chung 791 frame vector gốc do chủ thiết kế xuất, gồm cả `Flow.svg`.

- Ba tab độc lập: [Web ngang](https://nexgenvn.github.io/mikasa-ui-demo/figma-preview/#web/overview), [Web dọc](https://nexgenvn.github.io/mikasa-ui-demo/figma-preview/#web-portrait/overview), [App](https://nexgenvn.github.io/mikasa-ui-demo/figma-preview/#app/overview).
- Chế độ mặc định **Xem mẫu Figma** có đủ **791 frame**: Web ngang **347**, Web dọc **221**, App **223**. Chọn hoặc tìm theo tên/mã frame, dùng nút trước/sau để rà từng màn. App gồm Light, Dark và 31 frame Flow.
- Mỗi frame đối chiếu giữ nguyên nét vẽ, tọa độ, kích thước, chữ, màu, ảnh và các lớp của bản SVG gốc. SVG được đặt trong tài liệu HTML riêng với viewport đúng Figma; không chịu CSS của thanh preview và không dùng ảnh chụp toàn màn hình. 7 ảnh nhúng được tách thành tài nguyên cục bộ, nguyên vẹn từng byte.
- 260 vùng bấm từ prototype Figma nối 168 frame tới đúng đích. Những phản ứng hover, đổi trạng thái component, hoặc vùng bấm chồng lấn có đích mâu thuẫn không được suy đoán thành điều hướng mới. Vẫn chọn được toàn bộ frame trong danh mục.
- Chế độ **Bấm thử dữ liệu mẫu** giữ nguyên frame đang xem khi đổi chế độ, đồng thời đặt các nút và trường nhập có tên truy cập tại tọa độ Figma. Danh mục đủ 347 Web ngang, 221 Web dọc và 223 App trong cả hai chế độ. Chữ thay đổi dùng đường nét font gốc; menu, bộ đếm OA, trạng thái chọn, lịch và phần cuộn dùng tài nguyên component gốc. Các ô nhập giữ focus khi gõ và lọc.
- Luồng App gồm đăng nhập/khôi phục, gửi 1–5 OA, hẹn giờ theo múi giờ Việt Nam, kết quả/lịch sử/chi tiết, hồ sơ, sáng/tối, dữ liệu và bảo mật. Luồng Web gồm thu gọn sidebar, tài khoản, OA/GIF/tin nhắn, lọc/phân trang/chi tiết, báo cáo/xuất file, vai trò/quyền và bảo mật. Dữ liệu chỉnh sửa giữ trong phiên mẫu. Bản đồ nằm trong màn chi tiết của nguồn; không có trang bản đồ riêng trong bộ frame được cung cấp.
- App dùng các biến thể sáng/tối có trong nguồn. Hai bộ Web giữ Light theo mẫu, kể cả khi thanh preview chuyển tối. Bảng màu và trạng thái nằm ngoài khung sản phẩm.
- 7 SVG minh họa lấy từ Drive được cung cấp; icon và ảnh lấy từ Figma và lưu cục bộ. Không dùng URL tài nguyên tạm thời.

Tất cả dữ liệu là mô phỏng trong bộ nhớ trình duyệt. Không kết nối backend, gửi ZNS, thay đổi mật khẩu hoặc tài khoản thật. Tải lại trang/Khôi phục mẫu để đưa dữ liệu về ban đầu. Chỉ theme được ghi nhớ cục bộ.

## Nguồn

- Figma: https://www.figma.com/design/2oHQaSkcqH2GoOidQMwrEs/Mikasa
- SVG: https://drive.google.com/drive/folders/1hFvOE3yWOokpyOpSvXFh7JBtfJwNAjR3
- Font Roboto, Inter và Baumans được lưu cục bộ kèm giấy phép. Chữ trong vector gốc giữ nguyên đường nét từ bản xuất Figma.
- App giữ các giá trị mẫu của frame Figma; yêu cầu được tạo mới dùng dữ liệu mô phỏng.
- Bản sửa App ngày 18/11/2026 có 23 màn chính và các biến thể theo ngữ cảnh, được liên kết tới từng frame nguồn. Xem [bảng đối chiếu](FIGMA-MOBILE-AUDIT.md).
- Rà soát ngày 19/11/2026 cập nhật màu Primary sáng `#0F4D88`, tài nguyên hiện tại và cả Web ngang/dọc. Logo NEXGEN được sao chép nguyên vẹn từ SVG người dùng cung cấp. Xem [bản đối chiếu Web và giới hạn kiểm tra](../docs/superpowers/reviews/2026-11-19-web-portrait-app-audit.md) và [cập nhật nguồn App](../docs/superpowers/reviews/2026-11-19-mobile-current-figma-audit.md).
- Đợt rà toàn bộ bằng file xuất đã giải quyết giới hạn MCP của các báo cáo trước. Xem [báo cáo 791 frame](../docs/superpowers/reviews/2026-11-19-complete-source-preview.md).

## Chạy và kiểm tra

Phục vụ thư mục repository bằng HTTP server tĩnh, mở `/figma-preview/`.

```sh
npm ci --ignore-scripts
npm test
npm run verify:source
npm run verify:interactive
npm run build
node --check figma-preview/app.mjs
node --check figma-preview/web.mjs
node --check figma-preview/mobile.mjs
```

GitHub Pages phục vụ nhánh `main`, thư mục `/`. Các bản preview trước ở `/` và `/vuexy/`.

JS, CSS, font CSS và từng frame có tên chứa hash nội dung. `release.json` lưu mã bản phát hành. Link trả lại người dùng thêm `?v=<version>` trước dấu `#` để buộc tài liệu đang mở tải lại đúng bản phát hành.

Nguồn `.fig`, SVG toàn section và cache giải mã không đưa lên Git. Để tách lại nguồn khi thiết kế thay đổi, chạy `scripts/fig-source-inventory.mjs`, `scripts/import-figma-svg-sections.py`, `scripts/verify-figma-svg-extraction.py`, `scripts/build-source-hotspots.mjs`, rồi `scripts/publish-source-svg.mjs` với bộ file mới. Lệnh publish yêu cầu mỗi frame có SVG gốc của chính nó; thiếu nguồn sẽ dừng build.

Sau khi có cache nguồn mở rộng, chạy `scripts/build-source-glyphs.mjs`, `scripts/build-source-control-artwork.mjs`, `scripts/build-source-component-states.mjs`, `scripts/app-interactive-source.mjs` và `scripts/build-web-interactive-controls.mjs` để cập nhật lớp tương tác. `verify:interactive` kiểm tra toàn bộ hình học, định danh nguồn, xử lý thao tác và đích điều hướng; `interactive-coverage.json` lưu kết quả kiểm tra công khai.
