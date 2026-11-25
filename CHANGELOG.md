# Changelog

## [12.1.1] — 2026-11-26
- **Fix 8px Right/Bottom White Gap on Desktop Live Wallpaper:** Tắt khung bóng DWM ẩn (`shadow(false)`), bỏ khóa `WM_GETMINMAXINFO` (`resizable(true)`), ép kiểu cửa sổ con thuần Win32 (`WS_CHILD | WS_VISIBLE | WS_CLIPSIBLINGS | WS_CLIPCHILDREN`) đồng bộ `PhysicalSize` trực tiếp cho cả cửa sổ host lẫn WebView2 con sau khi `SetParent` vào `WorkerW` và overscan CSS 2px chống hở viền.

## [12.1.0] — 2026-11-26
- **Native Rust Win32 `WorkerW` Live Desktop Wallpaper (`desktop_wallpaper.rs`):** Khôi phục hoàn chỉnh tính năng đặt video 60FPS / ảnh 2K làm hình nền động trực tiếp cho màn hình Windows Desktop (nút `Desktop` trên thanh trên cùng & từng thẻ chủ đề), hỗ trợ Windows 10 & Windows 11, tự nghỉ GPU khi mở game/ứng dụng toàn màn hình (`desktopSmartPause`) và tự khôi phục nền gốc Windows sạch sẽ khi tắt.

## [12.0.0] — 2026-11-26 (Rust + Tauri v2 Rewrite)
- **Native Rust Backend (`src-tauri/src/`):** Viết lại hoàn toàn toàn bộ backend từ Electron/Node.js sang **Rust + Tauri v2** (nhị phân native chỉ **`6.62 MB`**, bộ cài Windows NSIS đầy đủ 29 video live HD chỉ **`73.06 MB`** thay vì `186 MB`).
- **Ultra-Low-RAM System Tray Daemon (`8.10 MB` Private RAM):** Khi đóng cửa sổ về khay hệ thống hoặc khởi động cùng Windows (`--tray`), cửa sổ WebView2 tự hủy hoàn toàn để giải phóng RAM, chỉ giữ tiến trình Rust nền (`8.10 MB` Private RAM so với `812.34 MB` ở bản Electron), bấm icon khay hệ thống bật lại cửa sổ trong **`0.18 giây`**.
- **Async Axum 0.8 Media Server:** Streaming video 60FPS chuẩn **HTTP Byte-Range (`206 Partial Content`)**, phục vụ tức thì `106` tài nguyên media tích hợp trong `6ms`.
- **Async Tokio CDP Bridge (`tokio-tungstenite` + `notify`):** Theo dõi `DevToolsActivePort` thời gian thực + fallback dò cổng `500ms` (`no_proxy`), đồng bộ layout IDE ↔ Chat và tự phục hồi DOM/media sau khởi động lạnh.
- **Native Windows Integration:** Tự khởi động Windows trực tiếp qua `winreg` Registry API, đồng bộ JSONC `argv.json` & `settings.json`, giữ nguyên 100% engine tiêm Liquid Glass & tương tác linh vật từ `v11.2.3`.

## [11.2.3] — 2026-11-24 (Legacy Electron Edition)
- Sửa icon System Tray sang PNG/ICO chuẩn Windows, thêm bàn giao khác phiên `/__studio/handover`, màn hình chờ Splash Screen.

## [11.2.0] — 2026-11-24
- Chuẩn hóa dự án dưới tên tác giả **mqinpuienhzg**, tối ưu gói 29 video live HD dưới `80 MB`.

## [11.1.0] — 2026-11-24
- Tương tác linh vật theo vùng chạm + kéo thả quán tính, xóa vệt tối Titlebar/Chat/Statusbar, thêm khung xem trước chia đôi cạnh phải, tối ưu poster JPEG tĩnh.
