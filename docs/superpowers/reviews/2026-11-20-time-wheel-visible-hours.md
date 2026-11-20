# Sửa các giờ bị mất phía dưới Time Picker

## Nguyên nhân

Một số frame SVG đang lưu danh sách giờ ở vị trí cuộn gần cuối 23, nên chỉ còn 3 dòng số trong viewport 126 × 200. Runtime trước đây đổi chữ trên đúng các dòng tĩnh này; đổi về 14 không tạo lại các dòng còn thiếu phía dưới. Metadata màu còn đánh dấu 22 là dòng chọn trong một số frame, trong khi nét SVG nhấn thực tế nằm ở giữa viewport tại dòng 23. Vì vậy chữ, vị trí và màu nhấn có thể lệch nhau.

## File sửa

- `figma-preview/source-hour-wheel.mjs`: dựng 5 dòng giờ động trong viewport nguồn, lấy font và nét màu từ các path SVG thực tế; giờ chọn luôn ở dòng giữa. Chọn 14 hiển thị 12–13–14–15–16. Chỉ vẽ giờ 07–23; ở biên 07/23 để trống phần vượt giới hạn. Giữ clipping và lớp blend nguồn.
- `figma-preview/source-calendar.mjs`: Time Picker dùng 5 vùng bấm tương ứng các dòng động; giữ kiểm tra thời gian hợp lệ và danh sách phút 00/30.
- `figma-preview/interactive-runtime.mjs`: giao quyền vẽ số giờ cho Time Picker để lớp cập nhật chữ chung không vẽ thêm một giờ chọn ở vị trí mẫu cũ.
- `figma-preview/source-calendar.test.mjs`: thêm ca lỗi với SVG chỉ có 21/22/23, chọn 14, bấm dòng 16, kiểm tra biên 07/23 và khôi phục nét nguồn khi đóng.
- `figma-preview/index.html`, `release.json`, bundle `release/app.cf9dd1fbf7bb.mjs`: release **131a3e722b9c**.

Không sửa SVG gốc, Web ngang/Web dọc hoặc các luồng App ngoài Time Picker. Áp dụng chung cho App gốc, Full quyền và 1 quyền.

## Kiểm tra thực tế

- Ca hồi quy chạy trước sửa đã thất bại vì không có đủ 5 dòng. Sau sửa ca này đạt.
- `npm test`: **391/391**, 0 lỗi, 0 bỏ qua.
- `npm run verify:source`: **791** frame nguồn giữ nguyên, 0 lỗi.
- `npm run verify:interactive`: **10.755** action/timer probes, 0 lỗi.
- `.audit/verify-hour-wheel-runtime.mjs`: chạy **mountInteractiveFrame thật trên cả 8 frame lịch**, dùng SVG DOM với hình học thật và sự kiện HTML DOM. Xác nhận 12–16 khi chọn 14; ArrowDown chọn 15; Home chọn 07; End chọn 23; phút chỉ 00/30; không vẽ trùng giờ; cleanup gỡ đủ lớp động. **8 frame, 0 lỗi**.
- Mutation check bỏ chặn lớp vẽ chữ chung: phép kiểm tra phát hiện thêm một giờ chọn và thất bại như dự kiến; khôi phục bản sửa rồi chạy lại 8 frame đạt.
- Đã render và xem ảnh SVG trước/sau sửa cho frame sáng, tối và Flow. Đây là Node DOM/SVG DOM và Resvg, không phải lượt bấm thủ công trong trình duyệt.
- `npm run build`, `git diff --check`: hoàn thành, không có lỗi.

Kết quả kiểm tra HTTP bản công khai sau triển khai được ghi tại `.audit/app-permission-public-verification.json` của workspace.
