# Rà soát 26 màn App tối theo New folder.zip

## Phạm vi và nguyên nhân

Đối chiếu toàn bộ 26 PNG trong ZIP người dùng gửi với frame nguồn, hình học SVG, palette thực tế và lớp điều khiển bấm thử. Một số frame nguồn cũ có icon xanh khó thấy trên nền tối, thiếu nền icon, màu bước gửi khác ảnh mới, nội dung tài khoản ở vị trí cũ và các màn chi tiết được xuất thành tài liệu dài.

- Tài khoản: chỉnh vị trí tiêu đề/card/hàng cài đặt, avatar theo ảnh, nét icon sáng và chevron phụ màu xám. Bỏ dòng đăng xuất không có trong ảnh mới cùng vùng bấm cũ. Giữ một tiêu đề tài khoản trong hộp thoại vân tay, không thêm tiêu đề trùng nhìn thấy trong ảnh chụp.
- Quản lý dữ liệu/vân tay/giao diện: sửa màu icon, nét quét thừa, vị trí nội dung xác thực thành công và viền khối chọn giao diện. Giữ hộp thoại và trạng thái loading bản nguồn.
- Gửi tin: màu bước đang chạy `#F34B26`; icon chọn mẫu sáng. Dấu trừ OA dùng nét sáng trước và sau khi đổi số OA. Tài nguyên bộ đếm sinh lại có hash mới, giữ nguyên đường nét/hình học và toàn bộ tệp cũ.
- Xác nhận/chi tiết: dùng đúng nền icon xanh nhạt, nét icon, đường phân cách và các biến thể màu đồng hồ. Chữ phụ tiến trình đơn có màu trung tính; nút quay lại và home indicator của chi tiết Full sáng trên nền tối.
- Chi tiết dài: Full hiển thị khối kết quả OA và nút quay lại trong khung 844px; Single đã gửi hiển thị tiến trình. Các phần ngoài phạm vi ảnh không tràn vào khung. Vùng bấm nguồn và vùng bấm dữ liệu mẫu được dời cùng hình; các điều khiển của khung không cuộn nằm theo điện thoại, không cố định vào cửa sổ trình duyệt.
- Đổi lịch: sửa đúng “Đổi lịch gửi”, “Ngày gửi mới”, “Giờ gửi mới” và màu cảnh báo. Phút là cặp hữu hạn: chọn 00 có 30 bên dưới; chọn 30 có 00 bên trên. Dữ liệu mẫu của frame minh họa không ép giá trị thời gian thực của phiên bấm thử.

Số bản ghi/người nhận/ngày giờ và kết quả OA trong chế độ bấm thử theo dữ liệu của phiên, không ép trùng các hàng minh họa trong ảnh. Full vẫn 1–5 OA, Single 1 OA; giữ quy tắc lịch Asia/Ho_Chi_Minh, hôm nay đến +14 ngày, giờ 07–23, phút 00/30 và kiểm tra lại khi lưu.

## Đối chiếu từng ảnh

Tên rút gọn bên dưới là phần giờ của `Screenshot 2026-11-20 HHMMSS.png`.

| Ảnh | Frame | Màn/nhóm kiểm tra |
|---|---|---|
| 151053 | 1430:85737 | Tổng quan, avatar, card, menu dưới |
| 152534 | 1432:10566 | Form gửi, bước, mẫu ZNS, bộ đếm OA |
| 152605 | 1430:88099 | Xác nhận nhiều OA, icon, phân cách |
| 152611 | 1430:87964 | Lịch gửi, bước và Time Picker |
| 153058 | 1430:85846 | Lịch sử tất cả |
| 153158 | 1444:91774 | Lịch sử đã gửi |
| 153203 | 1444:92022 | Lịch sử hoàn thành |
| 153208 | 1444:92328 | Lịch sử thất bại |
| 153211 | 1444:92629 | Lịch sử hẹn giờ |
| 153219 | 1444:93591 | Chi tiết hẹn giờ, tiến trình, đổi/hủy lịch |
| 153310 | 1442:91277 | Kết quả đặt lịch |
| 153844 | 1444:94627 | Đổi lịch, cảnh báo, phút 30 |
| 154014 | 1430:86619 | Single đã gửi, tiến trình |
| 154043 | 1450:8895 | Full đã gửi, kết quả OA |
| 154102 | 1450:9014 | Full thất bại |
| 154106 | 1450:9130 | Full hoàn thành, đồng hồ xanh đậm |
| 154110 | 1450:9522 | Biến thể Full hoàn thành, đồng hồ xanh sáng |
| 154328 | 1450:9744 | Tài khoản |
| 154338 | 1450:9816 | Quản lý dữ liệu |
| 154437 | 1450:9840 | Xác nhận xóa dữ liệu mẫu |
| 154441 | 1450:9918 | Xác nhận xóa tài khoản mẫu |
| 154520 | 1450:9878 | Loading xóa dữ liệu mẫu |
| 154524 | 1450:9956 | Loading xóa tài khoản mẫu |
| 154631 | 1450:9996 | Xác thực vân tay mẫu |
| 154714 | 1456:11813 | Xác thực thành công |
| 154730 | 1450:10174 | Chọn giao diện |

## File thay đổi

- `source-dark-account-reference.mjs`, `source-dark-message-reference.mjs`, `source-dark-flow-reference.mjs`: hiệu chỉnh SVG theo frame, có khôi phục và kiểm tra lặp.
- `dark-reference-layout.mjs`: đồng bộ hình học điều khiển/chữ với vị trí nguồn đã chỉnh.
- `native-preview.mjs`, `app.mjs`: áp dụng cùng bộ hiệu chỉnh cho xem mẫu và bấm thử, đồng bộ prototype hotspot.
- `app-phone-viewport.mjs`, `interactive-preview.mjs`, `source-scroll-canvas.mjs`: khung chi tiết 844px, vùng nội dung, footer và vùng bấm.
- `source-hour-wheel.mjs`, `source-calendar.mjs`, `interactive-runtime.mjs`: một lớp vẽ cho giờ/phút và giới hạn lựa chọn hiện có.
- `scripts/build-dark-app-artwork.mjs`, `dark-app-artwork.mjs`, `app-interactive-controls.mjs`, 10 SVG có hash mới: tương phản dấu trừ OA.
- Các kiểm thử hồi quy đi kèm cùng bundle/entry sinh khi build. Giữ nguyên toàn bộ 791 frame gốc và các release/tài nguyên cũ; không đổi giao diện Web.

## Bằng chứng kiểm tra

- `npm test`: **419/419**, không lỗi/không bỏ qua. Các ca mới đã có bước thất bại trước sửa rồi đạt sau sửa.
- `npm run verify:source`: **791** frame nguồn, 0 lỗi.
- `npm run verify:interactive`: **10.755** action/timer probes, 0 lỗi.
- **26/26** ảnh được ánh xạ và render bằng `fitNativeFrames` thật: thử gọi lặp không nhân đôi thay đổi; tệp nguồn giữ nguyên hash.
- **26/26** frame chạy `mountInteractiveFrame`/controller thật với HTML DOM và SVG DOM: khớp glyph, không slot không xác định, không lỗi khởi tạo; kiểm tra vị trí điều khiển tài khoản, footer và giờ/phút.
- **8/8** frame lịch kiểm tra riêng giờ/phút: phút 00/30 ở đúng vị trí, không vẽ trùng, không chọn dòng trống; frame mẫu 30 vẫn cho phiên bấm thử chọn 00.
- **11** hành trình qua entry `app.mjs` thật: Full 5/2 OA, Single, tác vụ nền, reset độc lập, gửi/hẹn/đổi/hủy lịch.
- Review độc lập đã phát hiện hai lỗi vùng bấm do đổi bố cục (hotspot nguồn và footer của form không cuộn). Cả hai được sửa, có hồi quy RED→GREEN; reviewer kiểm tra lại và không còn phát hiện quan trọng. Lượt review bổ sung giờ/phút/bộ đếm: **27/27** ca tập trung đạt.
- `npm run build`: release **0805df9d9ea6**, bundle `release/app.eae02f605fd4.mjs`; `git diff --check` không có lỗi.

Báo cáo máy/ảnh đối chiếu trong workspace: `.audit/zip-dark-reference-render/report.json`, `.audit/zip-dark-runtime-report.json`, `.audit/hour-wheel-live-runtime/report.json`, `.audit/dark-account-reference/report.json`, `.audit/dark-message-reference/proof.json` và log kiểm thử. Kết quả HTTP công khai được ghi sau triển khai trong `.audit/app-permission-public-verification.json`.

Các phép kiểm tra dùng Node DOM, SVG DOM với hình học thực và render Resvg; không phải một lượt thao tác thủ công đầy đủ trong trình duyệt. Ảnh chụp có tỷ lệ/nén khác nhau, vì vậy không tuyên bố mọi pixel ở mọi trình duyệt giống tuyệt đối.
