use serde_json::{json, Value};
use std::sync::{
    atomic::{AtomicBool, Ordering},
    Arc, Mutex,
};
use tauri::{AppHandle, Emitter, Manager, PhysicalPosition, PhysicalSize, WebviewUrl, WebviewWindowBuilder};

#[cfg(windows)]
mod win32 {
    use std::ffi::OsStr;
    use std::os::windows::ffi::OsStrExt;
    use std::ptr::null;

    pub type HWND = isize;
    pub type LPARAM = isize;
    pub type WPARAM = usize;
    pub type LRESULT = isize;
    pub type BOOL = i32;

    #[repr(C)]
    #[derive(Default, Clone, Copy)]
    pub struct RECT {
        pub left: i32,
        pub top: i32,
        pub right: i32,
        pub bottom: i32,
    }

    pub const SM_CXSCREEN: i32 = 0;
    pub const SM_CYSCREEN: i32 = 1;
    pub const SM_CXVIRTUALSCREEN: i32 = 78;
    pub const SM_CYVIRTUALSCREEN: i32 = 79;

    pub const GWL_STYLE: i32 = -16;
    pub const GWL_EXSTYLE: i32 = -20;
    pub const WS_CHILD: isize = 0x4000_0000;
    pub const WS_VISIBLE: isize = 0x1000_0000;
    pub const WS_CLIPSIBLINGS: isize = 0x0400_0000;
    pub const WS_CLIPCHILDREN: isize = 0x0200_0000;
    pub const WS_EX_TOOLWINDOW: isize = 0x0000_0080;
    pub const WS_EX_NOACTIVATE: isize = 0x0800_0000;
    pub const WS_EX_TRANSPARENT: isize = 0x0000_0020;

    pub const SWP_NOZORDER: u32 = 0x0004;
    pub const SWP_NOACTIVATE: u32 = 0x0010;
    pub const SWP_FRAMECHANGED: u32 = 0x0020;
    pub const SWP_SHOWWINDOW: u32 = 0x0040;
    pub const SMTO_NORMAL: u32 = 0x0000;
    pub const WM_SIZE: u32 = 0x0005;
    pub const SPI_SETDESKWALLPAPER: u32 = 0x0014;
    pub const SPIF_SENDCHANGE: u32 = 0x0002;

    type EnumWindowsProc = unsafe extern "system" fn(HWND, LPARAM) -> BOOL;

    #[link(name = "user32")]
    extern "system" {
        pub fn FindWindowW(lpClassName: *const u16, lpWindowName: *const u16) -> HWND;
        pub fn FindWindowExW(
            hWndParent: HWND,
            hWndChildAfter: HWND,
            lpszClass: *const u16,
            lpszWindow: *const u16,
        ) -> HWND;
        pub fn SendMessageTimeoutW(
            hWnd: HWND,
            Msg: u32,
            wParam: WPARAM,
            lParam: LPARAM,
            fuFlags: u32,
            uTimeout: u32,
            lpdwResult: *mut usize,
        ) -> LRESULT;
        pub fn PostMessageW(hWnd: HWND, Msg: u32, wParam: WPARAM, lParam: LPARAM) -> BOOL;
        pub fn EnumWindows(lpEnumFunc: EnumWindowsProc, lParam: LPARAM) -> BOOL;
        pub fn EnumChildWindows(hWndParent: HWND, lpEnumFunc: EnumWindowsProc, lParam: LPARAM) -> BOOL;
        pub fn SetParent(hWndChild: HWND, hWndNewParent: HWND) -> HWND;
        pub fn SetWindowPos(
            hWnd: HWND,
            hWndInsertAfter: HWND,
            X: i32,
            Y: i32,
            cx: i32,
            cy: i32,
            uFlags: u32,
        ) -> BOOL;
        pub fn SetWindowLongPtrW(hWnd: HWND, nIndex: i32, dwNewLong: isize) -> isize;
        pub fn GetSystemMetrics(nIndex: i32) -> i32;
        pub fn GetForegroundWindow() -> HWND;
        pub fn GetWindowRect(hWnd: HWND, lpRect: *mut RECT) -> BOOL;
        pub fn GetClientRect(hWnd: HWND, lpRect: *mut RECT) -> BOOL;
        pub fn IsZoomed(hWnd: HWND) -> BOOL;
        pub fn IsWindowVisible(hWnd: HWND) -> BOOL;
        pub fn GetClassNameW(hWnd: HWND, lpClassName: *mut u16, nMaxCount: i32) -> i32;
        pub fn SystemParametersInfoW(
            uiAction: u32,
            uiParam: u32,
            pvParam: *mut std::ffi::c_void,
            fWinIni: u32,
        ) -> BOOL;
    }

    pub fn to_wide(s: &str) -> Vec<u16> {
        OsStr::new(s).encode_wide().chain(std::iter::once(0)).collect()
    }

    struct SearchState {
        worker_w: HWND,
    }

    unsafe extern "system" fn enum_find_workerw(top_hwnd: HWND, lparam: LPARAM) -> BOOL {
        let def_class = to_wide("SHELLDLL_DefView");
        let shell = FindWindowExW(top_hwnd, 0, def_class.as_ptr(), null());
        if shell != 0 {
            let ww_class = to_wide("WorkerW");
            let workerw = FindWindowExW(0, top_hwnd, ww_class.as_ptr(), null());
            if workerw != 0 {
                let state = &mut *(lparam as *mut SearchState);
                state.worker_w = workerw;
                return 0;
            }
        }
        1
    }

    pub fn find_or_spawn_workerw() -> Option<HWND> {
        unsafe {
            let progman_cls = to_wide("Progman");
            let progman = FindWindowW(progman_cls.as_ptr(), null());
            if progman == 0 {
                return None;
            }
            let mut result: usize = 0;
            SendMessageTimeoutW(progman, 0x052C, 0x000D, 0x0001, SMTO_NORMAL, 1000, &mut result);
            SendMessageTimeoutW(progman, 0x052C, 0, 0, SMTO_NORMAL, 1000, &mut result);

            let mut state = SearchState { worker_w: 0 };
            EnumWindows(enum_find_workerw, &mut state as *mut SearchState as LPARAM);
            if state.worker_w != 0 {
                return Some(state.worker_w);
            }

            let ww_cls = to_wide("WorkerW");
            let child_ww = FindWindowExW(progman, 0, ww_cls.as_ptr(), null());
            if child_ww != 0 {
                return Some(child_ww);
            }

            Some(progman)
        }
    }

    pub fn target_physical_size(workerw: HWND, span_all: bool) -> (i32, i32) {
        unsafe {
            if span_all {
                let mut cr = RECT::default();
                if GetClientRect(workerw, &mut cr) != 0 && (cr.right - cr.left) >= 640 && (cr.bottom - cr.top) >= 480 {
                    return (cr.right - cr.left, cr.bottom - cr.top);
                }
                let w = GetSystemMetrics(SM_CXVIRTUALSCREEN).max(640);
                let h = GetSystemMetrics(SM_CYVIRTUALSCREEN).max(480);
                (w, h)
            } else {
                let mut cr = RECT::default();
                let sw = GetSystemMetrics(SM_CXSCREEN).max(640);
                let sh = GetSystemMetrics(SM_CYSCREEN).max(480);
                if GetClientRect(workerw, &mut cr) != 0 {
                    let cw = cr.right - cr.left;
                    let ch = cr.bottom - cr.top;
                    // On single-monitor setups WorkerW client rect is the exact physical canvas
                    if cw >= sw && ch >= sh && cw <= sw + 16 && ch <= sh + 16 {
                        return (cw, ch);
                    }
                }
                (sw, sh)
            }
        }
    }

    struct ResizeTarget {
        w: i32,
        h: i32,
    }

    unsafe extern "system" fn enum_resize_children(child: HWND, lparam: LPARAM) -> BOOL {
        let tgt = &*(lparam as *const ResizeTarget);
        SetWindowPos(
            child,
            0,
            0,
            0,
            tgt.w,
            tgt.h,
            SWP_NOZORDER | SWP_NOACTIVATE | SWP_SHOWWINDOW,
        );
        1
    }

    /// Forces zero-border pure child style + full physical coverage on both the Tauri host HWND and its WebView2 child HWNDs.
    pub fn force_full_bleed_size(child_hwnd: HWND, w: i32, h: i32) {
        unsafe {
            // Pure borderless child style — removes EVERY non-client DWM/frame border pixel!
            let pure_style = WS_CHILD | WS_VISIBLE | WS_CLIPSIBLINGS | WS_CLIPCHILDREN;
            SetWindowLongPtrW(child_hwnd, GWL_STYLE, pure_style);

            let pure_ex = WS_EX_TOOLWINDOW | WS_EX_NOACTIVATE | WS_EX_TRANSPARENT;
            SetWindowLongPtrW(child_hwnd, GWL_EXSTYLE, pure_ex);

            SetWindowPos(
                child_hwnd,
                0,
                0,
                0,
                w,
                h,
                SWP_NOZORDER | SWP_NOACTIVATE | SWP_FRAMECHANGED | SWP_SHOWWINDOW,
            );

            // Resize inner WebView2 host window(s) directly and notify WM_SIZE so ICoreWebView2Controller bounds match 100%
            let tgt = ResizeTarget { w, h };
            EnumChildWindows(
                child_hwnd,
                enum_resize_children,
                &tgt as *const ResizeTarget as LPARAM,
            );
            let lparam = ((h as usize & 0xFFFF) << 16) | (w as usize & 0xFFFF);
            PostMessageW(child_hwnd, WM_SIZE, 0, lparam as LPARAM);
        }
    }

    pub fn attach_to_workerw(child_hwnd: HWND, workerw: HWND, w: i32, h: i32) -> bool {
        unsafe {
            let pure_style = WS_CHILD | WS_VISIBLE | WS_CLIPSIBLINGS | WS_CLIPCHILDREN;
            SetWindowLongPtrW(child_hwnd, GWL_STYLE, pure_style);
            let pure_ex = WS_EX_TOOLWINDOW | WS_EX_NOACTIVATE | WS_EX_TRANSPARENT;
            SetWindowLongPtrW(child_hwnd, GWL_EXSTYLE, pure_ex);

            if SetParent(child_hwnd, workerw) == 0 {
                return false;
            }
            force_full_bleed_size(child_hwnd, w, h);
            true
        }
    }

    pub fn refresh_native_desktop_wallpaper() {
        unsafe {
            use winreg::enums::HKEY_CURRENT_USER;
            use winreg::RegKey;
            if let Ok(key) = RegKey::predef(HKEY_CURRENT_USER).open_subkey("Control Panel\\Desktop") {
                if let Ok(wp) = key.get_value::<String, _>("WallPaper") {
                    if !wp.is_empty() {
                        let mut wide = to_wide(&wp);
                        SystemParametersInfoW(
                            SPI_SETDESKWALLPAPER,
                            0,
                            wide.as_mut_ptr() as *mut std::ffi::c_void,
                            SPIF_SENDCHANGE,
                        );
                    }
                }
            }
        }
    }

    pub fn is_foreground_occluding_desktop() -> bool {
        unsafe {
            let fg = GetForegroundWindow();
            if fg == 0 || IsWindowVisible(fg) == 0 {
                return false;
            }
            let mut cls_buf = [0u16; 128];
            let len = GetClassNameW(fg, cls_buf.as_mut_ptr(), cls_buf.len() as i32);
            if len > 0 {
                let cls = String::from_utf16_lossy(&cls_buf[..len as usize]);
                if matches!(
                    cls.as_str(),
                    "Progman"
                        | "WorkerW"
                        | "Shell_TrayWnd"
                        | "Shell_SecondaryTrayWnd"
                        | "NotifyIconOverflowWindow"
                ) {
                    return false;
                }
            }
            if IsZoomed(fg) != 0 {
                return true;
            }
            let mut r = RECT::default();
            if GetWindowRect(fg, &mut r) != 0 {
                let sw = GetSystemMetrics(SM_CXSCREEN).max(1);
                let sh = GetSystemMetrics(SM_CYSCREEN).max(1);
                let rw = (r.right - r.left).max(0);
                let rh = (r.bottom - r.top).max(0);
                if rw >= sw - 8 && rh >= sh - 48 {
                    return true;
                }
            }
            false
        }
    }
}

pub const DESKTOP_WINDOW_LABEL: &str = "desktop-wallpaper";

#[derive(Clone)]
pub struct DesktopWallpaperManager {
    active: Arc<AtomicBool>,
    manual_paused: Arc<AtomicBool>,
    auto_paused: Arc<AtomicBool>,
    smart_pause: Arc<AtomicBool>,
    theme_name: Arc<Mutex<String>>,
    latest_state: Arc<Mutex<Value>>,
}

impl DesktopWallpaperManager {
    pub fn new() -> Self {
        Self {
            active: Arc::new(AtomicBool::new(false)),
            manual_paused: Arc::new(AtomicBool::new(false)),
            auto_paused: Arc::new(AtomicBool::new(false)),
            smart_pause: Arc::new(AtomicBool::new(true)),
            theme_name: Arc::new(Mutex::new(String::new())),
            latest_state: Arc::new(Mutex::new(json!({}))),
        }
    }

    pub fn latest_state_json(&self) -> Value {
        self.latest_state
            .lock()
            .map(|g| g.clone())
            .unwrap_or_else(|_| json!({}))
    }

    pub fn get_status(&self) -> Value {
        let active = self.active.load(Ordering::Relaxed);
        let manual_paused = self.manual_paused.load(Ordering::Relaxed);
        let auto_paused = self.auto_paused.load(Ordering::Relaxed);
        let theme_name = self
            .theme_name
            .lock()
            .map(|g| g.clone())
            .unwrap_or_default();
        json!({
            "supported": cfg!(windows),
            "active": active,
            "paused": manual_paused || auto_paused,
            "manualPaused": manual_paused,
            "autoPaused": auto_paused,
            "themeName": theme_name
        })
    }

    fn emit_status(&self, app: &AppHandle) {
        let _ = app.emit("studio:desktop-status", self.get_status());
    }

    pub fn start_smart_pause_watcher(&self, app: AppHandle) {
        #[cfg(windows)]
        {
            let mgr = self.clone();
            tauri::async_runtime::spawn(async move {
                loop {
                    tokio::time::sleep(std::time::Duration::from_millis(1200)).await;
                    if !mgr.active.load(Ordering::Relaxed) {
                        continue;
                    }
                    let smart = mgr.smart_pause.load(Ordering::Relaxed);
                    let next_auto = if smart {
                        win32::is_foreground_occluding_desktop()
                    } else {
                        false
                    };
                    let prev_auto = mgr.auto_paused.swap(next_auto, Ordering::Relaxed);
                    if prev_auto != next_auto {
                        let paused = next_auto || mgr.manual_paused.load(Ordering::Relaxed);
                        mgr.eval_pause(&app, paused);
                        mgr.emit_status(&app);
                    }
                }
            });
        }
    }

    fn eval_pause(&self, app: &AppHandle, paused: bool) {
        if let Some(w) = app.get_webview_window(DESKTOP_WINDOW_LABEL) {
            let js = format!(
                "if (window.__AGY_DESKTOP_PAUSE__) window.__AGY_DESKTOP_PAUSE__({});",
                if paused { "true" } else { "false" }
            );
            let _ = w.eval(&js);
        }
    }

    pub fn apply(&self, app: &AppHandle, media_port: u16, desktop_state: Value) -> Result<Value, String> {
        #[cfg(not(windows))]
        {
            let _ = (app, media_port, desktop_state);
            return Err("Hình nền động Desktop chỉ hỗ trợ Windows.".to_string());
        }

        #[cfg(windows)]
        {
            let cfg = desktop_state.get("config").cloned().unwrap_or(Value::Null);
            let smart = cfg
                .get("desktopSmartPause")
                .and_then(|v| v.as_bool())
                .unwrap_or(true);
            let span_all = cfg
                .get("desktopDisplayMode")
                .and_then(|v| v.as_str())
                == Some("span");
            self.smart_pause.store(smart, Ordering::Relaxed);

            let tname = desktop_state
                .get("theme")
                .and_then(|t| t.get("name"))
                .and_then(|v| v.as_str())
                .unwrap_or("Live Wallpaper")
                .to_string();
            if let Ok(mut g) = self.theme_name.lock() {
                *g = tname;
            }
            if let Ok(mut g) = self.latest_state.lock() {
                *g = desktop_state.clone();
            }

            let workerw = win32::find_or_spawn_workerw()
                .ok_or_else(|| "Không tìm thấy lớp WorkerW của Windows Desktop.".to_string())?;
            let (w, h) = win32::target_physical_size(workerw, span_all);

            if let Some(existing) = app.get_webview_window(DESKTOP_WINDOW_LABEL) {
                let _ = existing.set_position(PhysicalPosition::new(0, 0));
                let _ = existing.set_size(PhysicalSize::new(w as u32, h as u32));
                if let Ok(hwnd) = existing.hwnd() {
                    win32::force_full_bleed_size(hwnd.0 as isize, w, h);
                }
                let state_str = serde_json::to_string(&desktop_state).unwrap_or_else(|_| "{}".into());
                let js = format!("if (window.__AGY_DESKTOP_APPLY__) window.__AGY_DESKTOP_APPLY__({state_str});");
                let _ = existing.eval(&js);
                self.active.store(true, Ordering::Relaxed);
                self.emit_status(app);
                return Ok(self.get_status());
            }

            let url_str = format!("http://127.0.0.1:{media_port}/__studio/desktop-wallpaper.html");
            let parsed_url = url::Url::parse(&url_str).map_err(|e| e.to_string())?;

            // shadow(false) + resizable(true) eliminates Windows 10 8px DWM frame inset & WM_GETMINMAXINFO clamping!
            let win = WebviewWindowBuilder::new(app, DESKTOP_WINDOW_LABEL, WebviewUrl::External(parsed_url))
                .title("Antigravity Desktop Live")
                .inner_size(w as f64, h as f64)
                .position(0.0, 0.0)
                .decorations(false)
                .shadow(false)
                .resizable(true)
                .skip_taskbar(true)
                .focusable(false)
                .visible(false)
                .background_color(tauri::window::Color(6, 8, 18, 255))
                .build()
                .map_err(|e| format!("Không thể tạo cửa sổ nền Desktop: {e}"))?;

            let hwnd_raw = win.hwnd().map_err(|e| format!("Lỗi lấy HWND: {e}"))?.0 as isize;
            if !win32::attach_to_workerw(hwnd_raw, workerw, w, h) {
                let _ = win.destroy();
                return Err("SetParent vào WorkerW thất bại.".to_string());
            }
            let _ = win.set_position(PhysicalPosition::new(0, 0));
            let _ = win.set_size(PhysicalSize::new(w as u32, h as u32));
            win32::force_full_bleed_size(hwnd_raw, w, h);
            let _ = win.show();

            // Re-enforce exact physical full-bleed size after async WebView2 controller settles (kills any 8px right/bottom gap!)
            for delay_ms in [180u64, 650] {
                let app_c = app.clone();
                tauri::async_runtime::spawn(async move {
                    tokio::time::sleep(std::time::Duration::from_millis(delay_ms)).await;
                    let app_m = app_c.clone();
                    let _ = app_c.run_on_main_thread(move || {
                        if let Some(dw) = app_m.get_webview_window(DESKTOP_WINDOW_LABEL) {
                            let _ = dw.set_position(PhysicalPosition::new(0, 0));
                            let _ = dw.set_size(PhysicalSize::new(w as u32, h as u32));
                            if let Ok(hh) = dw.hwnd() {
                                win32::force_full_bleed_size(hh.0 as isize, w, h);
                            }
                        }
                    });
                });
            }

            self.active.store(true, Ordering::Relaxed);
            self.manual_paused.store(false, Ordering::Relaxed);
            self.auto_paused.store(false, Ordering::Relaxed);
            self.emit_status(app);
            Ok(self.get_status())
        }
    }

    pub fn stop(&self, app: &AppHandle) -> Value {
        self.active.store(false, Ordering::Relaxed);
        self.manual_paused.store(false, Ordering::Relaxed);
        self.auto_paused.store(false, Ordering::Relaxed);
        if let Some(w) = app.get_webview_window(DESKTOP_WINDOW_LABEL) {
            let _ = w.destroy();
        }
        #[cfg(windows)]
        win32::refresh_native_desktop_wallpaper();
        self.emit_status(app);
        self.get_status()
    }

    pub fn toggle_pause(&self, app: &AppHandle) -> Value {
        let prev = self.manual_paused.load(Ordering::Relaxed);
        let next = !prev;
        self.manual_paused.store(next, Ordering::Relaxed);
        let paused = next || self.auto_paused.load(Ordering::Relaxed);
        self.eval_pause(app, paused);
        self.emit_status(app);
        self.get_status()
    }
}
