# MIKASA · Figma Web & App Preview

Preview tương tác theo Figma Mikasa, xuất bản ở https://nexgenvn.github.io/mikasa-ui-demo/figma-preview/.

- Ba tab độc lập: [Web ngang](https://nexgenvn.github.io/mikasa-ui-demo/figma-preview/#web/overview), [Web dọc](https://nexgenvn.github.io/mikasa-ui-demo/figma-preview/#web-portrait/overview), [App](https://nexgenvn.github.io/mikasa-ui-demo/figma-preview/#app/overview).
- Mỗi tab Web có 16 màn chính: đăng nhập/khôi phục qua điện thoại và OTP, tổng quan, tài khoản/tạo/sửa/chi tiết, OA/GIF/tin nhắn, lịch sử/chi tiết, báo cáo, bảo mật, vai trò và quyền. Tab khôi phục của quản trị giữ bảng bản sao lưu đúng nguồn Figma.
- App có 23 màn chính, gửi tin qua 1–5 OA, xác nhận/hẹn giờ, xử lý/kết quả, lịch sử/lọc/chi tiết, tài khoản và tùy chỉnh.
- App dùng các biến thể sáng/tối có trong nguồn. Hai bộ Web giữ Light theo mẫu, kể cả khi thanh preview chuyển tối. Bảng màu và trạng thái nằm ngoài khung sản phẩm.
- 7 SVG minh họa lấy từ Drive được cung cấp; icon và ảnh lấy từ Figma và lưu cục bộ. Không dùng URL tài nguyên tạm thời.

Tất cả dữ liệu là mô phỏng trong bộ nhớ trình duyệt. Không kết nối backend, gửi ZNS, thay đổi mật khẩu hoặc tài khoản thật. Tải lại trang/Khôi phục mẫu để đưa dữ liệu về ban đầu. Chỉ theme được ghi nhớ cục bộ.

## Nguồn

- Figma: https://www.figma.com/design/2oHQaSkcqH2GoOidQMwrEs/Mikasa
- SVG: https://drive.google.com/drive/folders/1hFvOE3yWOokpyOpSvXFh7JBtfJwNAjR3
- Font Roboto qua Google Fonts; dự phòng Arial/system font khi offline.
- App giữ các giá trị mẫu của frame Figma; yêu cầu được tạo mới dùng dữ liệu mô phỏng.
- Bản sửa App ngày 18/11/2026 có 23 màn chính và các biến thể theo ngữ cảnh, được liên kết tới từng frame nguồn. Xem [bảng đối chiếu](FIGMA-MOBILE-AUDIT.md).
- Rà soát ngày 19/11/2026 cập nhật màu Primary sáng `#0F4D88`, tài nguyên hiện tại và cả Web ngang/dọc. Logo NEXGEN được sao chép nguyên vẹn từ SVG người dùng cung cấp. Xem [bản đối chiếu Web và giới hạn kiểm tra](../docs/superpowers/reviews/2026-11-19-web-portrait-app-audit.md) và [cập nhật nguồn App](../docs/superpowers/reviews/2026-11-19-mobile-current-figma-audit.md).

## Chạy và kiểm tra

Phục vụ thư mục repository bằng HTTP server tĩnh, mở `/figma-preview/`.

```sh
node --test figma-preview/*.test.mjs
node --check figma-preview/app.mjs
node --check figma-preview/web.mjs
node --check figma-preview/mobile.mjs
```

GitHub Pages phục vụ nhánh `main`, thư mục `/`. Các bản preview trước ở `/` và `/vuexy/`.
