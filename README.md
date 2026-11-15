# MIKASA — Demo duyệt giao diện

Bộ thiết kế 12 màn hình mobile, có giao diện sáng và tối, cùng luồng tương tác gửi đồng thời qua 1–5 OA.

- Chọn **Màn hình** để xem từng thiết kế.
- Chọn **Giao diện** để so sánh sáng/tối hoặc xem riêng từng bộ.
- Bấm **Thử luồng gửi** để nhập số mẫu, chọn số OA và xem các trạng thái gửi/kết quả.
- Demo chỉ sử dụng dữ liệu mô phỏng. Không kết nối backend, không gửi tin ZNS và không đổi mật khẩu thật.

## Chạy local

Phục vụ thư mục này bằng một HTTP server tĩnh, ví dụ `python -m http.server 8080`.

## GitHub Pages

Publish từ nhánh `main`, thư mục `/`.

Chỉ các tệp của bản demo được đưa vào repository này. Không chứa source ứng dụng, cơ sở dữ liệu hoặc thông tin xác thực.
