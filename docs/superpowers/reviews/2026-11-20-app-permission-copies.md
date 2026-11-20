# Rà soát App theo ảnh và tách quyền gửi OA

## Thay đổi và nguyên nhân

- Phần Thời gian gửi: radio đổi giá trị nhưng màu chữ/icon SVG vẫn theo trạng thái xuất ban đầu. `source-send-mode.mjs` đồng bộ các nét SVG của dòng được chọn, lấy màu từ bản nguồn sáng/tối. Hai dòng chữ/icon đều bấm được; không chỉ vùng radio.
- Hai bản App có tab và dữ liệu riêng: Full quyền chọn 1–5 OA, mặc định 5; bản 1 quyền cố định 1 OA, dùng form nguồn không có bộ đếm. App gốc giữ Flow ban đầu. `app-variants.mjs`, `app-permission-policy.mjs`, `app.mjs`, `native-toolbar.mjs` quản lý session, đường dẫn và frame đúng quyền/theme.
- Tác vụ gửi chạy nền từng bản độc lập. Reset hoặc chuyển tab không hủy/ghi đè bản khác; quay lại tác vụ đã xong mở kết quả. `app-flow-submission.mjs` và controller kiểm soát việc này.
- Lịch sử/chi tiết từng bản lấy đúng người nhận, ngày giờ, trạng thái, IPv4/IPv6, số OA và kết quả từ bản ghi được chọn. Trước đây một số chữ/icon/trạng thái vẫn thuộc mẫu tĩnh. `app-interactive-controller.mjs`, `scripts/app-interactive-source.mjs`, `app-message-drawing.mjs` cập nhật đúng nhóm SVG; `app-message-artwork.mjs` chứa 32 mảnh đồ họa trích nguồn sáng/tối.
- Xác nhận Full cập nhật cả số OA và tổng tin: 5 OA / 10 tin; 2 OA / 4 tin. Giữ bố cục hai dòng của nguồn, dòng phụ tổng hợp số OA còn lại và phân bổ V4/V6. Single chặn vượt quyền cả trước xác nhận và trước ghi kết quả.
- 12 màn chi tiết dài từng bị co toàn bộ theo chiều cao tài liệu. `app-phone-viewport.mjs` giữ khung điện thoại 844px, cuộn nội dung đúng kích thước nguồn, cố định header/footer và vùng bấm tương ứng; bo góc lấy từ SVG. Không sửa SVG gốc hay chiều cao chế độ xem mẫu.
- Đối chiếu đủ 14 ảnh người dùng và ảnh bổ sung Thời gian gửi. Avatar tổng quan đã tròn đúng nguồn nên không thêm xử lý trùng. Giữ gradient, typography, icon, nét và khoảng cách từ nguồn; không đổi màu theo phỏng đoán từ ảnh nén.

## Kiểm tra thực tế trước xuất bản

- `npm test`: **390/390**, 0 lỗi, 0 bỏ qua.
- `npm run verify:source`: **791/791** kiểm tra nguồn; 0 lỗi.
- `npm run verify:interactive`: **10.709 controls + 46 timers = 10.755 actions**, 0 lỗi; giữ 791 frame và 568 tài nguyên thành phần.
- Kiểm tra chữ SVG: 223 frame App, 1.765 slot, gồm 1.637 khớp và 128 rỗng; không có slot không hỗ trợ, copy trùng hoặc xung đột chủ sở hữu path.
- Entry `app.mjs` thật chạy với Node VM/DOM: **11 hành trình** kiểm tra Full 5/2 OA, Single, theme tối, tác vụ nền, reset độc lập, lịch tạo/sửa/hủy và khung chi tiết 844px.
- SVG DOM và Resvg: 6 ca dữ liệu lịch sử/chi tiết, 3 frame xác nhận số OA, 23 ca render đối chiếu 14 ảnh và frame liên quan, 8 frame Thời gian gửi, 12 frame chi tiết dài. Trạng thái chưa tương tác giữ pixel nguồn; kiểm tra lặp mount/cleanup, bounds và palette nguồn.
- Review độc lập không phát hiện vấn đề quan trọng. Bộ kiểm thử tập trung của reviewer 29/29; bộ kiểm thử toàn bộ chốt lại sau các bổ sung cuối là 390/390.
- `npm run build`: release **a242fd364cff**. `git diff --check`: không có lỗi khoảng trắng.

Đây là kiểm thử tự động bằng Node DOM, SVG DOM và render Resvg; không phải một lượt thao tác thủ công đầy đủ trong trình duyệt. Các báo cáo máy và ảnh đối chiếu nằm trong `.audit/` của workspace. Không kết luận mọi pixel ở mọi trình duyệt đều giống tuyệt đối.

## Phạm vi giữ nguyên

Giữ 791 frame gốc, App gốc, Web ngang/Web dọc và quy tắc lịch Asia/Ho_Chi_Minh: hôm nay đến +14 ngày, giờ 07–23, phút 00/30, chặn giờ đã qua và kiểm tra lại khi lưu. Không xóa các release cũ.

## Xuất bản

Release dự kiến: `a242fd364cff`. Kết quả kiểm tra bản công khai được ghi thêm sau khi GitHub Pages cập nhật.
