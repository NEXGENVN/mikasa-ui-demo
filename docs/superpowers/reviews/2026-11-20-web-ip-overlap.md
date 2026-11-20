# Sửa chồng chữ IPv4/IPv6 trên Web — 20/11/2026

Phạm vi: bảng lịch sử và màn chi tiết Web ngang/Web dọc, bao gồm bảng với sidebar thu nhỏ. Giữ nguyên bố cục Figma và Calendar/App của bản trước.

## Nguyên nhân

Bước chuẩn hóa văn bản gộp dấu xuống dòng trong ô IP thành khoảng trắng. Bước đọc IP sau đó tiếp tục tách theo xuống dòng, nên không tách được hai địa chỉ. Cả `ipv4` và `ipv6` đều nhận nguyên chuỗi chứa hai IP. Bảng lặp lại chuỗi này trên hai dòng; màn chi tiết đưa cả hai IP vào từng ô, tràn sang ô bên cạnh.

## File thay đổi

- `scripts/build-web-interactive-controls.mjs`: tách các token theo khoảng trắng; lấy đúng một token IPv4 hoặc IPv6. Regex IPv4 khớp cả token, tránh lấy nhầm phần IPv4 nằm trong IPv6 mapped. Giữ nguyên cách viết địa chỉ trong nguồn.
- `figma-preview/web-interactive-controls.mjs`: sinh lại dữ liệu mẫu, chỉ30 trường IP thuộc15 bản ghi thay đổi. Toàn bộ568 metadata frame/control/geometry và các trường khác khớp bản trước.
- `figma-preview/web-interactive-controller.mjs`: khi mở chi tiết từ bảng, đánh dấu nội dung cần cập nhật để hiển thị IP của đúng bản ghi ngay cả khi chưa lọc hoặc sửa dữ liệu.
- Kiểm thử: `scripts/build-web-interactive-controls.test.mjs`, `figma-preview/web-interactive-controller.test.mjs`, `scripts/web-ip-opacity.test.mjs`.
- Tệp bản phát hành: index, release manifest và JavaScript có tên theo hash.

## Kết quả đã chạy

- Kiểm thử tái hiện lỗi trước sửa:3 ca thất bại đúng chuỗi IPv4+IPv6 bị gộp/lặp.
- Sau sửa:271/271 kiểm thử tự động đạt.
- Kiểm tra cả52 biến thể bảng lịch sử (34 ngang,18 dọc): nội dung IP đúng hai dòng; chọn bản ghi, mở chi tiết và sao chép trả về từng IP riêng.
- Kiểm tra SVG nguồn thực tế của6 frame:557:49673,31:5251,714:63144,1408:84257,557:50194,98:3079. Khi đổi nội dung IP và cập nhật lại dòng nhiều lần, chữ gốc vẫn ẩn, chữ mới tồn tại đúng một lớp; khôi phục trả lại nguyên trạng; tọa độ ô không đổi.
- Có kiểm thử mở chi tiết trực tiếp từ bảng chưa lọc cho cả hai hướng Web; IP của bản ghi vừa chọn được cập nhật ngay.
- Các ca dữ liệu gồm xuống dòng LF/CRLF, khoảng trắng, IPv6 rút gọn, IPv4-mapped IPv6 và thiếu một trong hai địa chỉ.

Các kiểm tra trên là logic, dữ liệu và DOM/SVG; không suy ra từ việc build thành công và không phải ảnh chụp trình duyệt thủ công.
