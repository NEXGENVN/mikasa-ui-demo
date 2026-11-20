# Calendar/Time Picker và lịch sử App — 20/11/2026

## Phạm vi bản cập nhật

Theo đặc tả mới nhất: chỉ Calendar/Time Picker và lỗi chồng chữ lịch sử App được yêu cầu tiếp theo. Các thay đổi đang rà soát ở OA, hồ sơ, Web và bảng màu chung được giữ riêng, không đưa vào bản này.

## Nguyên nhân và thay đổi

- Calendar trước đây chưa thống nhất giới hạn ngày/giờ, cho nhập phút lẻ, chưa kiểm tra thay đổi so với lịch gốc. `app-calendar.mjs` dùng thời gian hệ thống với timezone `Asia/Ho_Chi_Minh`, lấy hôm nay đến hôm nay +14 ngày lịch (bao gồm hai đầu); chỉ nhận giờ 07–23 và phút 00/30, thời gian phải ở tương lai. Không dùng giới hạn 14×24 giờ.
- `source-calendar.mjs` giữ vị trí ô, font và bước hàng/cột của metadata Figma. Past/Expired #9CAAC1; Today #14538E và viền1.5px; Available #172033; Selected #FFFFFF trên #14538E; Hover #EDF4FB với chữ #14538E. Selected ưu tiên hơn Today; Disabled không hover/chọn. Ngày ngoài tháng có gạch chấm nhỏ và nhãn trợ năng, không giảm opacity làm sai màu trạng thái.
- `app-interactive-controller.mjs`, `core.mjs`: kiểm tra lại khi lưu/xác nhận/hoàn tất. Lưu chỉ bật cho thời gian hợp lệ khác lịch gốc (so sánh instant ISO). Modal mở lâu không tự đổi lựa chọn đã hết hạn; nút lưu khóa lại khi thời gian trôi qua. Chuyển ngày tự điều chỉnh giờ hết hạn trong cùng ngày hoặc báo không còn khung giờ. Sau23:30, lịch mặc định là07:00 hôm sau.
- Lịch sử App: sau khi lớp chữ mới được vẽ, lớp hiển thị dòng đã khôi phục opacity của chữ SVG gốc, gây hai lớp chữ chồng nhau. `source-text-slots.mjs` ghi nhận chữ gốc đang được thay thế; `source-drawing-slots.mjs` tôn trọng quyền ẩn này khi hiện lại dòng. Bố cục, icon, nền và font gốc không thay đổi.
- `scripts/app-calendar-source.mjs` và metadata `app-interactive-controls.mjs`: đồng bộ8 frame lịch hiện có, gồm sáng/tối/Flow, về timezone và danh sách giờ/phút nêu trên.

## Kiểm thử thực tế

- Mốc giả lập13/11/2026:12/11 khóa,13/11 Today,14/11 và27/11 khả dụng,28/11 và01/12 khóa;27/11 23:30 hợp lệ.
- Bao gồm giáp tháng/năm, năm nhuận, mốc06:59/07:00/23:29/23:30/23:59, hết hạn sau khi mở modal, đổi rồi quay lại lịch gốc, disabled hover, Selected+Today, chuyển nửa đêm vẫn có ô ngày dùng bàn phím.
- Cùng6 kiểm thử hợp đồng ngày/lưu chạy độc lập với timezone máy UTC, America/New_York, Asia/Tokyo: cả3 tiến trình kết thúc0.
- Kiểm tra source SVG thực tế của lịch sử Light784:48201, Dark1430:85846 và Flow1635:105349: điện thoại/mô tả/trạng thái giữ chữ gốc opacity0 qua3 lần hiện dòng; khôi phục trả lại trạng thái gốc.
- Toàn bộ suite:261/261 bài kiểm thử đạt. Kiểm tra791 bản SVG nguồn và7 ảnh gốc:0 lỗi. Kiểm tra10772 hành động/timer và560 tài nguyên thành phần:0 lỗi. Build thành công, mã phát hànhffdfe800d3fe. Đây là kiểm tra logic/DOM/SVG và HTTP, không phải kiểm thử bằng trình duyệt thủ công cho từng frame.
