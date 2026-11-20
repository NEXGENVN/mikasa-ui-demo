# Thẻ tài khoản và toàn bộ App tối — 20/11/2026

## Nguồn và phạm vi

Đối chiếu toàn bộ 81 frame App có theme tối với SVG xuất gốc trong bộ người dùng cung cấp. Cả 81 SVG đã được render bằng Resvg với đúng MIME của ảnh và xem trong 9 bảng, mỗi bảng 9 màn. Màu được xác định từ nét SVG thực tế; không lấy màu mặc định từ master `.fig` khi chúng khác hình xuất.

Ảnh tham chiếu mới người dùng gửi trong lượt này bổ sung yêu cầu avatar bo tròn và thanh điều hướng có viền bo tròn. Áp dụng vào bản xem mẫu và bản bấm thử; giữ ảnh, phép cắt ảnh, tọa độ, kích thước và chữ theo nguồn. Các file SVG/HTML gốc không bị ghi lại.

## Nguyên nhân và sửa đổi

1. **Avatar chữ nhật:** ảnh xuất gốc được vẽ bằng một `rect` nằm trên nền avatar bo tròn, chưa có clip riêng. `source-account-avatar.mjs` dùng chính hình nền 59×63, bán kính 29,5 của nguồn làm clip cho ảnh trong 9 biến thể tài khoản/xác thực sáng và tối. 30 biến thể hồ sơ đã có clip được giữ nguyên.
2. **Mất viền thanh điều hướng:** một số SVG làm phẳng clip của thanh điều hướng; nền chữ nhật của bốn nút được vẽ sau và che viền. `source-bottom-navigation.mjs` nhóm đúng phần hình vẽ liên tiếp của thanh, khôi phục clip 358×60 bán kính 20, rồi đặt lại nét viền gốc 357×59 bán kính 19,5 phía trên. Không dịch icon/nhãn; không đưa thanh home indicator vào nhóm. Kiểm tra tài liệu SVG thực tế xác định 22 frame cần sửa; các frame đã vẽ viền sau các nút không cần sửa.
3. **Công tắc đổi màu khi bấm:** master chung dùng màu khác hình xuất. Bộ sinh control nay dùng hình công tắc App đã đối chiếu: viền `#E8F0FF`, nút tắt `#64748B`, nút bật `#0F4D88`, cùng bóng và kích thước của nguồn tối.
4. **Số OA bị tối màu khi đổi số:** chữ số trong asset trạng thái được sinh từ metadata đen; hình xuất dùng `#F8FAFF`. Builder mới sửa đúng nét số đã đối chiếu, giữ dấu trừ màu `#121212`. Các mức quyền 2/3/4/5 dùng đúng hình ở mức tối đa, chỉ có nút trừ như hình xuất; các trạng thái trung gian giữ hình master được cung cấp. Giới hạn 2/3/4 được xác nhận cả bằng nét số và thông báo quyền trong SVG.
5. **Menu giới tính đổi thành nền sáng:** 10 header popup trước đây lấy từ master trắng. Builder thay header bằng đúng vùng SVG tối của từng field, giữ các hàng menu native đã có. Lịch, OTP, sắp xếp lịch sử và khóa ứng dụng có phần trắng ngay trong nguồn; không đổi màu những phần này theo phỏng đoán.
6. **Đi sai màn sáng/thiếu bước:** sửa định tuyến OTP theo mục đích, vân tay tối, cập nhật hồ sơ điện thoại/email qua màn chờ, gửi nhiều OA, đổi lịch và liên kết quay lại. Giữ frame chọn OA theo mức quyền khi quay lại sửa. Đổi sáng/tối giữ ngữ cảnh Flow và lịch sử quay lại phù hợp.
7. **Danh sách màn tối bị thiếu:** khi đang xem App tối, bộ chọn hiển thị đủ 81 màn tối; bắt đầu lại mở bản đăng nhập tối. Flow sáng vẫn dùng thứ tự 31 màn gốc.

## File chính

- Hiển thị nguồn: `figma-preview/native-preview.mjs`, `source-account-avatar.mjs`, `source-bottom-navigation.mjs`.
- Luồng và bộ chọn: `figma-preview/app-interactive-controller.mjs`, `app-standard-flow.mjs`, `app.mjs`.
- Control và artwork: `scripts/app-interactive-source.mjs`, `scripts/build-dark-app-artwork.mjs`, `figma-preview/app-interactive-controls.mjs`, `dark-app-artwork.mjs`, 24 SVG có hash trong `assets/interactive-app/`.
- Màu field: sinh lại `figma-preview/source-field-appearance-catalog.mjs` từ kiểm tra nét nguồn hiện tại.
- Kiểm thử: `app-dark-flow-controller.test.mjs`, `app-standard-flow.test.mjs`, `source-account-avatar.test.mjs`, `source-bottom-navigation.test.mjs`, `scripts/app-dark-source.test.mjs`, `scripts/build-dark-app-artwork.test.mjs`; sửa một kỳ vọng cũ trỏ nhầm bản hồ sơ điện thoại thay vì email.

## Kết quả thực tế

- `npm test`: **343/343 đạt**, không bỏ qua ca nào. Có 9 hành trình Dark dùng control nguồn, các ca hình học/clip, màu số OA, popup và bộ chọn màn tối.
- Các lỗi mới đều có bằng chứng tái hiện trước sửa: loại màn vân tay nhận nhầm `account`, asset công tắc sai màu, số OA sai mực chữ, popup header trắng, thiếu bộ chọn 81 màn, avatar không clip và viền thanh bị che. Ca kiểm tra trên tài liệu SVG thực tế đã giúp phát hiện và sửa thêm trường hợp thanh điều hướng được xuất phẳng.
- `npm run verify:source`: 791/791 frame khớp file SVG gốc; 347 Web ngang, 221 Web dọc và 223 App; không thay nguồn.
- `npm run verify:interactive`: 791 frame, 10.752 action/timer đã được kiểm tra, không có lỗi.
- Rà nét chữ 223 frame App sau sinh lại: 1.589 slot; 1.461 khớp nguồn, 128 rỗng; không có nét không hỗ trợ hay tranh quyền cùng một nét. Kiểm tra artwork mới và nguồn không sửa SVG Web.
- Render bản sau sửa trên tài liệu SVG thực tế: 9 avatar tài khoản bo tròn, các clip hồ sơ hiện hữu giữ nguyên; thanh điều hướng được kiểm tra riêng cho các bản xuất phẳng.
- Review độc lập đã xem ảnh tham chiếu, ảnh render sáng/tối và mã thay đổi; không còn lỗi quan trọng được xác định trong phạm vi đã kiểm tra.

Các kết quả trên là kiểm thử logic, DOM và SVG/raster. Chưa hoàn tất một lượt bấm tay đầy đủ trên trình duyệt: công cụ Windows trả thông tin cửa sổ Brave nhưng ảnh chụp lại là ứng dụng Codex, nên đã dừng thao tác UI. Không báo kiểm thử bấm tay đã đạt.

Bộ nguồn không có các màn quên mật khẩu tối tương ứng. Hai nút quên mật khẩu vẫn mở các màn khôi phục sáng gốc đã cung cấp; không tự tạo thêm màn tối.
