use serde_json::{json, Value};
use std::sync::{
    atomic::{AtomicBool, Ordering},
    Arc, Mutex,
};
use tauri::{AppHandle, Emitter, Manager, WebviewUrl, WebviewWindowBuilder};

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
    pub const SM_XVIRTUALSCREEN: i32 = 76;
    pub const SM_YVIRTUALSCREEN: i32 = 77;
    pub const SM_CXVIRTUALSCREEN: i32 = 78;
    pub const SM_CYVIRTUALSCREEN: i32 = 79;

    pub const GWL_STYLE: i32 = -16;
    pub const GWL_EXSTYLE: i32 = -20;
    pub const WS_CHILD: isize = 0x4000_0000;
    pub const WS_VISIBLE: isize = 0x1000_0000;
    pub const WS_POPUP: isize = 0x8000_0000u32 as isize;
    pub const WS_CAPTION: isize = 0x00C0_0000;
    pub const WS_THICKFRAME: isize = 0x0004_0000;
    pub const WS_EX_TOOLWINDOW: isize = 0x0000_0080;
    pub const WS_EX_NOACTIVATE: isize = 0x0800_0000;
    pub const WS_EX_TRANSPARENT: isize = 0x0000_0020;

    pub const SWP_NOZORDER: u32 = 0x0004;
    pub const SWP_NOACTIVATE: u32 = 0x0010;
    pub const SWP_FRAMECHANGED: u32 = 0x0020;
    pub const SWP_SHOWWINDOW: u32 = 0x0040;
    pub const SMTO_NORMAL: u32 = 0x0000;
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
        pub fn EnumWindows(lpEnumFunc: EnumWindowsProc, lParam: LPARAM) -> BOOL;
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
        pub fn GetWindowLongPtrW(hWnd: HWND, nIndex: i32) -> isize;
        pub fn SetWindowLongPtrW(hWnd: HWND, nIndex: i32, dwNewLong: isize) -> isize;
        pub fn GetSystemMetrics(nIndex: i32) -> i32;
        pub fn GetForegroundWindow() -> HWND;
        pub fn GetWindowRect(hWnd: HWND, lpRect: *mut RECT) -> BOOL;
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
                return 0; // stop enumeration
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
            // Standard undocumented Progman split message (Win10 + Win11)
            SendMessageTimeoutW(progman, 0x052C, 0x000D, 0x0001, SMTO_NORMAL, 1000, &mut result);
            SendMessageTimeoutW(progman, 0x052C, 0, 0, SMTO_NORMAL, 1000, &mut result);

            // 1. Standard Win10 / Win11 <=23H2: sibling WorkerW right after the window owning SHELLDLL_DefView
            let mut state = SearchState { worker_w: 0 };
            EnumWindows(enum_find_workerw, &mut state as *mut SearchState as LPARAM);
            if state.worker_w != 0 {
                return Some(state.worker_w);
            }

            // 2. Windows 11 24H2 (26100+): WorkerW is a direct child of Progman
            let ww_cls = to_wide("WorkerW");
            let child_ww = FindWindowExW(progman, 0, ww_cls.as_ptr(), null());
            if child_ww != 0 {
                return Some(child_ww);
            }

            // 3. Fallback directly to Progman
            Some(progman)
        }
    }

    pub fn desktop_bounds(span_all: bool) -> (i32, i32, i32, i32) {
        unsafe {
            if span_all {
                let x = GetSystemMetrics(SM_XVIRTUALSCREEN);
                let y = GetSystemMetrics(SM_YVIRTUALSCREEN);
                let w = GetSystemMetrics(SM_CXVIRTUALSCREEN).max(640);
                let h = GetSystemMetrics(SM_CYVIRTUALSCREEN).max(480);
                (x, y, w, h)
            } else {
                let w = GetSystemMetrics(SM_CXSCREEN).max(640);
                let h = GetSystemMetrics(SM_CYSCREEN).max(480);
                (0, 0, w, h)
            }
        }
    }

    pub fn attach_to_workerw(child_hwnd: HWND, workerw: HWND, w: i32, h: i32) -> bool {
        unsafe {
            let style = GetWindowLongPtrW(child_hwnd, GWL_STYLE);
            let new_style = (style & !(WS_POPUP | WS_CAPTION | WS_THICKFRAME)) | WS_CHILD | WS_VISIBLE;
            SetWindowLongPtrW(child_hwnd, GWL_STYLE, new_style);

            let ex = GetWindowLongPtrW(child_hwnd, GWL_EXSTYLE);
            let new_ex = ex | WS_EX_TOOLWINDOW | WS_EX_NOACTIVATE | WS_EX_TRANSPARENT;
            SetWindowLongPtrW(child_hwnd, GWL_EXSTYLE, new_ex);

            if SetParent(child_hwnd, workerw) == 0 {
                return false;
            }
            SetWindowPos(
                child_hwnd,
                0,
                0,
                0,
                w,
                h,
                SWP_NOZORDER | SWP_NOACTIVATE | SWP_FRAMECHANGED | SWP_SHOWWINDOW,
            );
            true
        }
    }

    pub fn refresh_native_desktop_wallpaper() {
        unsafe {
            // Re-read current Windows wallpaper path from registry and ask Explorer to repaint cleanly
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
                    "Progman" | "WorkerW" | "Shell_TrayWnd" | "Shell_SecondaryTrayWnd" | "NotifyIconOverflowWindow"
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

            if let Some(existing) = app.get_webview_window(DESKTOP_WINDOW_LABEL) {
                let state_str = serde_json::to_string(&desktop_state).unwrap_or_else(|_| "{}".into());
                let js = format!("if (window.__AGY_DESKTOP_APPLY__) window.__AGY_DESKTOP_APPLY__({state_str});");
                let _ = existing.eval(&js);
                self.active.store(true, Ordering::Relaxed);
                self.emit_status(app);
                return Ok(self.get_status());
            }

            let workerw = win32::find_or_spawn_workerw()
                .ok_or_else(|| "Không tìm thấy lớp WorkerW của Windows Desktop.".to_string())?;
            let (_x, _y, w, h) = win32::desktop_bounds(span_all);
            let url_str = format!("http://127.0.0.1:{media_port}/__studio/desktop-wallpaper.html");
            let parsed_url = url::Url::parse(&url_str).map_err(|e| e.to_string())?;

            let win = WebviewWindowBuilder::new(app, DESKTOP_WINDOW_LABEL, WebviewUrl::External(parsed_url))
                .title("Antigravity Desktop Live")
                .inner_size(w as f64, h as f64)
                .position(0.0, 0.0)
                .decorations(false)
                .resizable(false)
                .skip_taskbar(true)
                .focusable(false)
                .visible(false)
                .background_color(tauri::window::Color(6, 8, 18, 255))
                .build()
                .map_err(|e| format!("Không thể tạo cửa sổ nền Desktop: {e}"))?;

            let hwnd = win.hwnd().map_err(|e| format!("Lỗi lấy HWND: {e}"))?;
            if !win32::attach_to_workerw(hwnd.0 as isize, workerw, w, h) {
                let _ = win.destroy();
                return Err("SetParent vào WorkerW thất bại.".to_string());
            }
            let _ = win.show();
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
