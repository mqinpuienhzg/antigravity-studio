# Changelog

## [11.2.3] — 2026-11-24
- **Real Windows System Tray Icon (PNG/ICO):** Thay icon khay hệ thống từ SVG data URL sang PNG/ICO thật (`build/icon.png` & `build/icon.ico`), sửa triệt để lỗi Windows `notify_icon.cc` khiến icon bị ẩn khi thu xuống khay.
- **Cross-Desktop Handover & Loopback Wakeup (`/__studio/handover`):** Chống kẹt khóa đơn tiến trình `Error code: 32` / khác phiên desktop — khi bấm mở lại app trên màn hình chính, tiến trình mới tự bàn giao quyền hiển thị hoặc đánh thức cửa sổ tức thì (<0.9s).
- **Branded Portable Splash Screen & Smart Launcher:** Thêm màn hình chờ `build/splash.bmp` hiện ngay lập tức khi mở bản Portable (`186 MB`, nén `normal`) và cập nhật `start-studio.bat` tự ưu tiên bản chạy nhanh `win-unpacked`.

## [11.2.0] — 2026-11-24
- **Author & GitHub Release Ready:** Chuẩn hóa toàn bộ dự án dưới tên tác giả **mqinpuienhzg** (`https://github.com/mqinpuienhzg/antigravity-studio`).
- **Window Launch & Tray Fix:** Sửa triệt để lỗi mở lại `.exe` khi app đang ẩn dưới khay hệ thống không hiện cửa sổ (`revealMainWindow()` vượt Windows Foreground Lock + click đơn vào icon khay hệ thống).
- **Ultra-Compact Video Pack (< 80 MB Repo):** Tối ưu nén lại các video nền HD giữ độ sắc nét 1080p nhưng cắt gọn toàn bộ mã nguồn + 29 video live dưới **80 MB**.

## [11.1.0] — 2026-11-24
- **Lifelike Mascot Physics:** Sửa lỗi trùng lặp DOM khiến không bấm/kéo được linh vật; bổ sung tương tác theo vùng chạm (xoa đầu, thân, trêu ghẹo), dõi theo con trỏ chuột, kéo thả quán tính và tự lưu vị trí.
- **Zero-Seam Titlebar / Chat / Statusbar:** Xóa hoàn toàn vệt bóng dọc mép trái Chat và thanh gradient tối trên Titlebar / Statusbar khi độ mờ Sidebar bằng `0%`.
- **Right Side-by-Side Live Preview:** Thêm khung xem trước trực tiếp chia đôi IDE + Chat bên phải.
- **Major RAM Optimization:** Chuyển Gallery sang 29 ảnh poster JPEG siêu nhẹ (giảm >800 MB Private RAM trong Studio), thêm Auto Blob GC và Eco Single-Deck Video Loop cho IDE.

## [11.0.0] — 2026-11-24
- Clear Optical Liquid Glass, Pure 1-Video Pass-Through (0px zoom/resize drift), 3-Layer Transparency (IDE, Chat, Antigravity Settings, Terminal, Toasts) và trình duyệt tải hình nền tích hợp.
