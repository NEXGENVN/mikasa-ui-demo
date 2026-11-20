# Màu icon vector Mẫu ZNS trên App tối

Nguyên nhân: lần sửa trước giới hạn vùng đổi màu tại `[40,349,28,44]`, chỉ bao trọn thân icon. Chân vector có điểm bắt đầu x38 và chấm trái ở x38.542 nằm ngoài vùng này, nên giữ nét xanh trong khi thân đã đổi sang sáng. Đây là lỗi giới hạn vùng xử lý trong code.

Sửa `figma-preview/source-dark-flow-reference.mjs` dùng đúng toàn bộ khung component gốc **[33,358.5,28,26]**. Đổi cả nét `stroke` và chấm tô `fill` sang **#F8FAFF** trên 9 frame gửi App tối (Single/Full và các mức OA); giữ nguyên đường vector, kích thước, vị trí và các icon khác. Không đổi tệp SVG gốc hay giao diện sáng/Web.

Kiểm tra thực tế:

- Ca hồi quy mới thất bại trước sửa ở nét chân/chấm trái, đạt sau sửa; kiểm tra cả 9 frame, giữ màu icon thông báo khác và khôi phục màu gốc.
- SVG DOM thực + Resvg: **9/9 frame**, mỗi icon **7 path**. Bản cũ có `#F8FAFF` và `#0F4D88`; bản mới chỉ còn `#F8FAFF`. Mọi path `d` và hash tệp nguồn giữ nguyên, xử lý lặp và khôi phục đạt.
- `npm test`: **420/420**, 0 lỗi, 0 bỏ qua.
- `npm run build`: release **20af77c0a686**, bundle `release/app.9ba1380f28ad.mjs`; `git diff --check` không lỗi.

Bằng chứng nằm trong `.audit/template-vector-proof/`: báo cáo trước/sau, ảnh cả 9 frame và `comparison.png`. Đây là kiểm tra SVG/Node, không phải lượt bấm thủ công trong trình duyệt. HTTP bản công khai được kiểm tra riêng sau triển khai.
