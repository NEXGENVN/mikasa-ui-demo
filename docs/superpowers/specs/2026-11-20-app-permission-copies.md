# App Full quyền và App 1 quyền

Người dùng yêu cầu chỉnh tổng quan, lịch sử và chi tiết theo 14 ảnh mới, tạo thêm hai bản App: Full quyền gửi nhiều OA và 1 quyền gửi đúng một OA. Việc triển khai và cập nhật GitHub Pages đã được người dùng yêu cầu trong cùng chuỗi công việc.

Giữ tab App hiện tại làm bản Flow gốc. Thêm hai tab App Full quyền và App 1 quyền, mỗi bản có dữ liệu, bản nháp, lịch sử điều hướng và tác vụ gửi mẫu riêng. Giới hạn Full là 5 OA theo nguồn có OA1–OA5; Single luôn là1. Dùng lại các frame gốc: Full có bộ chọn 1–5; Single dùng form gốc không có bộ chọn OA. Cả hai có sáng/tối và gửi ngay/hẹn lịch.

Ảnh mới là chuẩn đối chiếu về bố cục: tổng quan với avatar tròn; lịch sử có nền chuyển màu, thẻ bo góc, bộ lọc và thanh điều hướng; chi tiết đơn OA có tiến trình/thông tin ghi nhận; chi tiết nhiều OA có tổng hợp, thanh tỷ lệ và hàng OA; lịch đã đặt có đổi/hủy lịch. Giá trị dữ liệu mẫu khi thao tác phải nhất quán với bản ghi, không cố giữ số đếm minh họa nếu người dùng đã lọc hoặc gửi tin mới.

Giữ file SVG gốc, không tạo lại màn bằng bố cục tự nghĩ. Không đổi Web. Giữ quy tắc hẹn lịch timezone Việt Nam, hôm nay đến hôm nay+14 ngày, giờ07–23, phút00/30 và kiểm tra lại lúc lưu. Không sửa màu tối theo phỏng đoán khi nguồn thực tế dùng phần sáng.

Kiểm tra bằng unit/journey, DOM và SVG/raster; báo đúng giới hạn của kiểm tra trình duyệt. Đối chiếu kết quả xuất bản công khai với tệp đã build trước khi gửi link.
