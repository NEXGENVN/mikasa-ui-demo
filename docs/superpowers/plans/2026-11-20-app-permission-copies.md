# App Permission Copies Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Tạo hai bản App độc lập và chỉnh các màn theo 14 ảnh tham chiếu.

**Architecture:** Giữ ba nền tảng nguồn Web/Web dọc/App và 791 frame. Hai bản App mới dùng query `app=full`/`app=single` cùng bộ frame gốc, nhưng session/data riêng. Policy chọn frame và giới hạn OA được tách khỏi lớp hiển thị.

**Tech Stack:** JavaScript ESM, native SVG, Node test, esbuild, GitHub Pages.

**Spec:** `docs/superpowers/specs/2026-11-20-app-permission-copies.md`

## Global Constraints

- Giữ SVG gốc, không đổi Web.
- Full1–5 OA, Single1 OA, Standard theo Flow gốc.
- Giữ đủ quy tắc lịch và giao diện sáng/tối.
- Dữ liệu và tác vụ nền của từng bản độc lập; không ghi đè bản khác khi chuyển tab/reset.

## Review Focus

- Đổi bản trong khi yêu cầu đang chạy không chuyển nhầm màn hoặc ghi vào dữ liệu bản khác.
- Mở link trực tiếp, đổi chế độ xem, theme và quay lại giữ đúng bản App.
- Single chặn số OA giả mạo ở UI/controller/commit.
- Chi tiết/bộ lọc/copy phản ánh đúng bản ghi và số OA.
- Source overlays không che icon, mất viền hoặc gây chồng chữ.

### Task1: Session, tab và hash

**Files:** `figma-preview/app-variants.mjs`, `app-variants.test.mjs`, `app.mjs`, `native-toolbar.mjs`, `app-flow-submission.mjs`, tests.

- [x] Viết kiểm thử tách bản nháp/dữ liệu/reset/tác vụ gửi và query.
- [x] Thêm tab, link sâu, chọn session và reset đúng bản.
- [x] Kiểm tra chuyển bản khi tác vụ đang chờ.

### Task2: Policy và luồng/dữ liệu

**Files:** `figma-preview/app-permission-policy.mjs`, `app-interactive-controller.mjs`, `scripts/app-interactive-source.mjs`, tests và metadata sinh lại.

- [x] Kiểm thử giới hạn OA, frame nguồn, xác nhận và chi tiết đơn/nhiều OA.
- [x] Sửa field số OA, tổng hợp, thời gian, IP và copy theo nguồn.
- [x] Chạy luồng gửi/lịch sử/đổi lịch cho cả hai bản và hai theme.

### Task3: Fidelity14 ảnh

**Files:** helper SVG mới, tests, `figma-preview/native-preview.mjs`.

- [x] Lập bản đồ ảnh tham chiếu với frame nguồn và render trước sửa.
- [x] Sửa các lỗi có bằng chứng ở phần clip/bo góc/nền; xác nhận avatar tròn đã đúng nguồn.
- [x] Render sau sửa, kiểm tra tính lặp an toàn và phạm vi App; bổ sung đồng bộ Thời gian gửi theo ảnh mới.

### Task4: Review và xuất bản

- [x] Review độc lập, sửa lỗi quan trọng.
- [x] Chạy test/source/interactive verification, build và diff check.
- [ ] Commit/push khi kiểm tra đạt; chờ Pages nhận bản mới.
- [ ] Kiểm tra tệp công khai và gửi link Full/Single cùng kết quả thật.
