# MIKASA — Demo duyệt giao diện

Bộ thiết kế 12 màn hình mobile, có giao diện sáng và tối, cùng luồng tương tác gửi đồng thời qua 1–5 OA.

Hai phương án duyệt độc lập:

- [MIKASA gốc](https://nexgenvn.github.io/mikasa-ui-demo/)
- [Vuexy Mobile](https://nexgenvn.github.io/mikasa-ui-demo/vuexy/) — lấy cảm hứng từ phong cách Vuexy, chuyển bố cục thành app mobile.

- Chọn **Màn hình** để xem từng thiết kế.
- Chọn **Giao diện** để so sánh sáng/tối hoặc xem riêng từng bộ.
- Bấm **Thử luồng gửi** để nhập số mẫu, chọn số OA và xem các trạng thái gửi/kết quả.
- Demo chỉ sử dụng dữ liệu mô phỏng. Không kết nối backend, không gửi tin ZNS và không đổi mật khẩu thật.
- Mỗi phương án có đủ 12 màn. Bản Vuexy giữ đúng nội dung màn gốc trong `result_screen.dart`: màn đã gửi có Số điện thoại, Mẫu ZNS, Thời gian gửi, Mã tin; màn kết quả có Số điện thoại, Mẫu ZNS, Thời gian gửi, Lần cuối hoạt động, Ngày hoạt động; phần Thông tin ghi nhận có IPv4, IPv6, Port, Nhà mạng, Thời gian đối tượng mở tin.
- Trường thiếu hiển thị “Chưa có dữ liệu”. Thời điểm mở tin chỉ lấy từ `opened_at`, hoạt động gần nhất chỉ lấy từ `last_online`, ngày hoạt động chỉ lấy từ `offline_days`; không suy ra từ `time` hoặc thời gian xử lý request. Giá trị demo dùng fixture đã có ở app gốc, không phải dữ liệu gửi tin thật.
- Trạng thái gửi, xác nhận xem và mức đủ dữ liệu được thể hiện riêng. Có ít nhất một IP hợp lệ sẽ có thể hoàn thành; tiếp tục cập nhật các OA còn lại.

## Chạy local

Phục vụ thư mục này bằng một HTTP server tĩnh, ví dụ `python -m http.server 8080`.

## GitHub Pages

Publish từ nhánh `main`, thư mục `/`.

Chỉ các tệp của bản demo được đưa vào repository này. Không chứa source ứng dụng, cơ sở dữ liệu hoặc thông tin xác thực.
