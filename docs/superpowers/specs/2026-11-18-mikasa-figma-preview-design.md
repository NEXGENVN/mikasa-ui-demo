# MIKASA — bản preview Web và App từ Figma

## Mục tiêu

Dựng bộ giao diện có thể bấm thử trên GitHub Pages, theo thiết kế Mikasa tại file `2oHQaSkcqH2GoOidQMwrEs`. Người dùng đã chọn bấm thử luồng với dữ liệu mẫu. Nguồn thiết kế gồm Style guide, Web (ngang và dọc), Mobile; dùng các SVG trạng thái trong thư mục Drive người dùng cung cấp.

## Phương án

Hai phương án đã đưa ra: thư viện ảnh các màn hình, hoặc giao diện HTML/CSS/JavaScript có tương tác bằng dữ liệu mẫu. Người dùng chọn phương án có tương tác. Người dựng chọn web tĩnh không cần bước build vì phù hợp GitHub Pages và có thể mở trên máy tính, điện thoại. Bản mới nằm tại `/figma-preview/` trong repository `NEXGENVN/mikasa-ui-demo`.

## Phạm vi giao diện

- Trang duyệt chung: chuyển Web/App, sáng/tối, chọn màn hình, xem bảng màu và trạng thái.
- Web quản trị: đăng nhập, tổng quan, tài khoản và phân quyền, OA và mẫu ZNS, lịch sử/chi tiết gửi, báo cáo, bảo mật, cài đặt. Mỗi nhóm có trang chính và các hộp thoại/chế độ lọc liên quan.
- App: đăng nhập, tổng quan, nhập gửi ZNS, chọn 1–5 OA, xác nhận, xử lý, kết quả, lịch sử/lọc/chi tiết, tài khoản, hồ sơ, đổi mật khẩu mẫu, giao diện, thiết bị/phiên, trợ giúp và xác nhận đăng xuất.
- Các trạng thái: hoàn thành, đã gửi, thất bại, rỗng, đang tải, mất mạng, 403, 404, 408, 429, 500, 502, 503, 504. Dùng 7 SVG gốc từ Drive tại các màn phù hợp.
- Phân biệt các biến thể cùng màn bằng điều khiển tương tác; không tạo hàng trăm bản trùng bố cục chỉ khác một ô chọn.

## Hệ giao diện

- Font Roboto. Màu sáng lấy từ Figma: Primary `#195CFA`, Secondary/Text Secondary `#64748B`, Background `#F8FAFF`, Surface `#FFFFFF`, Border `#E2E8F0`, Primary Light `#E8F0FF`, Text `#121212`, Secondary 2 `#F5F5F5`.
- Lấy tiếp giá trị màu tối và trạng thái từ Figma trước khi triển khai.
- Bám bố cục sidebar quản trị, card, bảng dữ liệu, thanh điều hướng app và kích thước mobile 390px của mẫu; chuyển bố cục hợp lý khi màn hình hẹp.
- Tải icon/ảnh tĩnh gốc từ Figma và SVG từ Drive về source; không dùng URL tài nguyên tạm thời.

## Tương tác mẫu

- Form có kiểm tra trường nhập, chọn OA, xác nhận gửi, mô phỏng tiến trình và kết quả; lịch sử được cập nhật trong bộ nhớ trình duyệt.
- Tìm kiếm, lọc, phân trang, xem chi tiết, hộp thoại thêm/sửa, bật tắt, thông báo kết quả và tải báo cáo CSV hoạt động bằng dữ liệu mẫu.
- Thay đổi mật khẩu, tài khoản, quyền, phiên đăng nhập và OA chỉ mô phỏng cục bộ; không gọi backend hay gửi ZNS thật. Có nhãn “Dữ liệu mẫu” trong preview.
- Cho phép khôi phục dữ liệu mẫu về ban đầu.

## Giới hạn và kiểm chứng

Đây là bộ preview để duyệt giao diện, không phải bản sản phẩm vận hành. Không công khai thông tin xác thực hoặc dữ liệu khách hàng. Kiểm tra cú pháp JavaScript, đường dẫn tài nguyên, các luồng chính và bố cục desktop/mobile bằng trình duyệt. Xuất bản các file preview vào repository đã có, chờ GitHub Pages build thành công và xác minh URL trước khi gửi link.

## Quyết định do người dựng đề xuất

Chọn triển khai không framework, dùng cùng bộ dữ liệu mẫu cho Web và App, xuất bản ở đường dẫn riêng, gộp các trạng thái trùng bố cục vào biến thể tương tác. Người dùng đã duyệt phạm vi và yêu cầu triển khai ngày 18/11/2026.
