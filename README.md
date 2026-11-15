# MIKASA — Demo duyệt giao diện

Bộ thiết kế 12 màn hình mobile, có giao diện sáng và tối, cùng luồng tương tác gửi đồng thời qua 1–5 OA.

Hai phương án duyệt độc lập:

- [MIKASA gốc](https://nexgenvn.github.io/mikasa-ui-demo/)
- [Vuexy Mobile](https://nexgenvn.github.io/mikasa-ui-demo/vuexy/) — lấy cảm hứng từ phong cách Vuexy, chuyển bố cục thành app mobile.

- Chọn **Màn hình** để xem từng thiết kế.
- Chọn **Giao diện** để so sánh sáng/tối hoặc xem riêng từng bộ.
- Bấm **Thử luồng gửi** để nhập số mẫu, chọn số OA và xem các trạng thái gửi/kết quả.
- Demo chỉ sử dụng dữ liệu mô phỏng. Không kết nối backend, không gửi tin ZNS và không đổi mật khẩu thật.
- Mỗi phương án có đủ 12 màn. Kết quả giữ số điện thoại, User ID, IPv4/IPv6, port, ISP, múi giờ, ngày giờ và mã theo dõi từng OA.
- Trạng thái gửi, xác nhận xem và mức đủ dữ liệu được thể hiện riêng. Có ít nhất một IP hợp lệ sẽ có thể hoàn thành; tiếp tục cập nhật các OA còn lại.

## Chạy local

Phục vụ thư mục này bằng một HTTP server tĩnh, ví dụ `python -m http.server 8080`.

## GitHub Pages

Publish từ nhánh `main`, thư mục `/`.

Chỉ các tệp của bản demo được đưa vào repository này. Không chứa source ứng dụng, cơ sở dữ liệu hoặc thông tin xác thực.
