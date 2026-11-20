# Rà soát App theo Flow gốc — 20/11/2026

## Nguồn và nguyên nhân

Nguồn chính là `Flow.svg` người dùng cung cấp, SHA-256 `e88154fe3f592e2076fccee2387da620494de9bd14bf0a0884b7e24691a407c7`. Đã đối chiếu thứ tự 31 khung trong SVG và ảnh raster của từng khung với danh mục native. Màu, hình vẽ và nhãn của SVG xuất thực tế được ưu tiên khi metadata `.fig` cũ khác nguồn.

Trang bấm thử trước đây mở màn nhập số điện thoại cũ `734:77892`, vốn không có bộ chọn OA; các đường dẫn và màn xác nhận cũng dùng lẫn thư viện cũ với Flow. Metadata của màn Flow ghi số OA là 5, trong khi nét chữ thực tế trong SVG là 1 và thông báo giới hạn là 2. Một số liên kết prototype chỉ trỏ về bản master, và OTP chưa phân biệt mục đích xác thực. Bước sinh control còn nhận nhầm ô email/mã xác thực, để lộ input dưới màn chờ và bỏ sót nút sao chép/lịch sử.

## Thay đổi

- `figma-preview/app-standard-flow.mjs`, `app.mjs`, `native-toolbar.mjs`: mở đúng màn Flow, danh sách 31 màn theo thứ tự bảng gốc, nút bắt đầu lại Flow. Liên kết cũ tới màn gửi được chuyển sang màn có bộ chọn OA; chế độ xem nguồn vẫn giữ toàn bộ frame gốc.
- `scripts/app-interactive-source.mjs`, `figma-preview/app-interactive-controls.mjs`: chọn 1–2 OA, nhánh xác nhận riêng, các nút sao chép/lịch sử/đóng lịch, ô hồ sơ đúng nhãn, trạng thái chờ khóa nền, countdown và timer theo nguồn.
- `figma-preview/app-interactive-controller.mjs`: giữ dữ liệu qua các bước, hủy lịch không lưu nháp, đổi lịch dùng đúng modal riêng, gửi ngay/hẹn lịch tới đúng kết quả và chi tiết; OTP có mục đích; hồ sơ chỉ ghi sau màn chờ; đóng modal không để lại màn cũ trong lịch sử quay lại. Mở trực tiếp từ bộ chọn màn cũng chọn đúng bản ghi lịch mẫu theo nguồn; đổi lịch có lưu thực tế, hủy không xóa bản ghi Web và không tự tạo lại lịch đã hủy.
- `figma-preview/app-flow-submission.mjs`: yêu cầu mẫu tiếp tục hoàn tất khi bấm “Về lịch sử”, không tạo trùng hoặc kéo người dùng khỏi màn đang xem. Bắt đầu lại/khôi phục mẫu hủy callback cũ; xóa dữ liệu/tài khoản vô hiệu hóa yêu cầu đang chờ để dữ liệu không tự xuất hiện lại.
- `scripts/build-app-flow-artwork.mjs`, `figma-preview/app-flow-artwork.mjs`, `assets/interactive-app/`: radio và switch lấy từ hình vẽ App gốc, giữ màu, kích thước và bóng của nguồn.
- `source-field-appearance*.mjs`, `scripts/source-field-appearance.mjs`, `scripts/build-source-field-appearance.mjs`, `interactive-preview.mjs`, `interactive-runtime.mjs`: font/màu ô App dựa trên nét SVG thực tế và mẫu đã nhập có cùng bố cục; không áp quy tắc màu này lên Web.

## 31 màn đối chiếu

Các ID dưới đây đều có tiền tố `1635:`. Đây là thứ tự xem trên bảng, không phải một chuỗi bắt buộc đi tuần tự qua mọi màn.

| STT | ID | Vai trò theo hình xuất |
|---|---|---|
| 01 | 105270 | Đăng nhập |
| 02 | 105349 | Tổng quan |
| 03 | 105527 | Nhập người nhận, chọn 1–2 OA |
| 04 | 105774 | Xác nhận nhiều OA |
| 05 | 105895 | Chọn lịch gửi mới |
| 06 | 106187 | Kết quả hẹn lịch |
| 07 | 109001 | Xác nhận một OA |
| 08 | 109115 | Đang xử lý gửi |
| 09 | 109243 | Gửi thành công |
| 10 | 109272 | Chi tiết tin hẹn giờ |
| 11 | 109376 | Đổi lịch gửi |
| 12 | 109948 | Bản lặp màn gửi thành công |
| 13 | 109806 | Chi tiết tin đã gửi |
| 14 | 110138 | Tài khoản |
| 15 | 110281 | Xác nhận xóa dữ liệu |
| 16 | 110341 | Xác nhận xóa tài khoản |
| 17 | 110403 | OTP cho thiết lập vân tay |
| 18 | 108310 | Đang cập nhật hồ sơ email |
| 19 | 110452 | Xác thực vân tay mẫu |
| 20 | 110629 | Kết quả thiết lập vân tay |
| 21 | 110779 | Giao diện |
| 22 | 110831 | Ngôn ngữ |
| 23 | 110900 | Chỉnh hồ sơ qua số điện thoại |
| 24 | 111726 | Chỉnh hồ sơ qua email |
| 25 | 112035 | Đang cập nhật hồ sơ điện thoại |
| 26 | 111940 | Bản lặp trạng thái cập nhật hồ sơ email |
| 27 | 112161 | OTP cho đổi mật khẩu |
| 28 | 112210 | Đổi mật khẩu |
| 29 | 112281 | Bản lặp màn gửi thành công |
| 30 | 112310 | Thiết bị |
| 31 | 112462 | Bảo mật phiên |

Màn 09/12/29 có cùng hình và chữ “Gửi tin thành công”; không dùng chúng làm màn thành công đổi mật khẩu/cập nhật hồ sơ chỉ vì vị trí trên bảng. Mục đích OTP 17/27 được xác định theo nút gọi, vì nguồn không cung cấp đủ liên kết. Các màn bổ sung cần cho luồng đều có bản gốc trong cùng bộ thiết kế: lịch sử `784:48201`, xem hồ sơ `843:50360`, kết quả hồ sơ `843:50893`, đã gửi mã email `891:1762`, quản lý dữ liệu `1112:76654`, kết quả xóa `1112:77043`/`1112:77107`, quên mật khẩu `658:*`. Không vẽ thêm màn thay thế.

## Kiểm tra thực tế trước xuất bản

- `npm test`: 319/319 kiểm thử tự động đạt; bao gồm 16 ca hành trình/trạng thái nhiều bước theo control nguồn và 3 ca vòng đời yêu cầu nền.
- `npm run verify:source`: 791/791 frame giữ đúng SVG gốc; 347 Web ngang, 221 Web dọc, 223 App; 260 hotspot nguồn hợp lệ.
- `npm run verify:interactive`: 791 frame dựng được, 10.747 action/timer được kiểm tra, không có action không xử lý hoặc đích không tồn tại. Đây là kiểm tra độc lập từng action, bổ sung cho các hành trình nhiều bước.
- Rà text slot của 223 frame App: 1.594 slot, 1.466 khớp nét nguồn và 128 rỗng; không có nét không hỗ trợ hoặc slot tranh quyền cùng một nét. 320 màu chữ được xác định từ nét thực tế; ô chưa có bằng chứng không bị ép sang màu metadata cũ.
- Các kiểm thử Calendar về timezone Việt Nam, giới hạn 14 ngày, 07–23 giờ, phút 00/30; App lịch sử và Web IPv4/IPv6 vẫn nằm trong bộ hồi quy.

Đây là kết quả kiểm tra logic, DOM và SVG. Công cụ điều khiển trình duyệt đã dừng vì không xác định được URL cửa sổ theo chính sách; chưa chạy được một lượt bấm tay đầy đủ trên trình duyệt trong vòng này. Không coi kiểm tra tự động là bằng chứng đã bấm tay toàn bộ giao diện.
