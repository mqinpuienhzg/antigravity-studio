#![recursion_limit = "256"]

mod cdp_bridge;
mod commands;
mod desktop_wallpaper;
mod downloader;
mod ide_sync;
mod media_server;
mod store;

use cdp_bridge::CdpBridge;
use desktop_wallpaper::DesktopWallpaperManager;
use media_server::LocalMediaServer;
use serde_json::json;
use std::{
    fs,
    io::Write,
    path::{Path, PathBuf},
    sync::{
        atomic::{AtomicBool, AtomicU64, AtomicUsize, Ordering},
        Arc, Mutex,
    },
    time::{SystemTime, UNIX_EPOCH},
};
use store::StudioStore;
use tauri::{
    image::Image,
    menu::{Menu, MenuItem, PredefinedMenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    AppHandle, Emitter, Manager, RunEvent, WebviewUrl, WebviewWindowBuilder, WindowEvent,
};

const TRAY_ICON_PNG: &[u8] = include_bytes!("../icons/32x32.png");

pub struct AppState {
    pub store: Arc<Mutex<StudioStore>>,
    pub cdp: CdpBridge,
    pub desktop: DesktopWallpaperManager,
    pub media_server: LocalMediaServer,
    pub resource_dir: Option<PathBuf>,
    pub log_path: PathBuf,
    pub instance_path: PathBuf,
    pub is_quitting: Arc<AtomicBool>,
    pub carousel_idx: Arc<AtomicUsize>,
    pub last_os_wakeup_ms: Arc<AtomicU64>,
}

fn now_ms() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_millis() as u64)
        .unwrap_or(0)
}

pub fn append_boot_log(log_path: &Path, message: &str) {
    if let Some(parent) = log_path.parent() {
        let _ = fs::create_dir_all(parent);
    }
    if let Ok(meta) = fs::metadata(log_path) {
        if meta.len() > 40 * 1024 {
            if let Ok(raw) = fs::read_to_string(log_path) {
                let tail: String = raw.chars().rev().take(16 * 1024).collect::<String>().chars().rev().collect();
                let _ = fs::write(log_path, tail);
            }
        }
    }
    if let Ok(mut f) = fs::OpenOptions::new()
        .create(true)
        .append(true)
        .open(log_path)
    {
        let ts = chrono::Utc::now().to_rfc3339_opts(chrono::SecondsFormat::Millis, true);
        let _ = writeln!(f, "[{ts}] {message}");
    }
}

fn write_instance_file(path: &Path, port: u16, token: &str) {
    if let Some(parent) = path.parent() {
        let _ = fs::create_dir_all(parent);
    }
    let exe = std::env::current_exe()
        .map(|p| p.to_string_lossy().to_string())
        .unwrap_or_default();
    let payload = json!({
        "pid": std::process::id(),
        "port": port,
        "token": token,
        "exe": exe,
        "startedAt": now_ms()
    });
    if let Ok(txt) = serde_json::to_string(&payload) {
        let _ = fs::write(path, txt);
    }
}

fn cleanup_instance_file(path: &Path) {
    if let Ok(raw) = fs::read_to_string(path) {
        if let Ok(v) = serde_json::from_str::<serde_json::Value>(&raw) {
            if v.get("pid").and_then(|p| p.as_u64()) == Some(std::process::id() as u64) {
                let _ = fs::remove_file(path);
            }
        }
    }
}

pub fn reveal_or_create_main_window(app: &AppHandle) {
    if let Some(win) = app.get_webview_window("main") {
        let _ = win.unminimize();
        let _ = win.show();
        let _ = win.set_always_on_top(true);
        let _ = win.set_focus();
        let w_clone = win.clone();
        tauri::async_runtime::spawn(async move {
            tokio::time::sleep(std::time::Duration::from_millis(200)).await;
            let _ = w_clone.set_always_on_top(false);
            let _ = w_clone.set_focus();
        });
        return;
    }

    // Recreate main WebView2 window on demand after ultra-low-RAM tray destruction!
    let builder = WebviewWindowBuilder::new(app, "main", WebviewUrl::App("index.html".into()))
        .title("Antigravity Studio Rust — by mqinpuienhzg")
        .inner_size(1480.0, 900.0)
        .min_inner_size(1120.0, 700.0)
        .center()
        .decorations(false)
        .background_color(tauri::window::Color(9, 11, 20, 255))
        .visible(true);

    if let Ok(win) = builder.build() {
        attach_window_listeners(&win, app.clone());
        let _ = win.set_always_on_top(true);
        let _ = win.set_focus();
        let w_clone = win.clone();
        tauri::async_runtime::spawn(async move {
            tokio::time::sleep(std::time::Duration::from_millis(200)).await;
            let _ = w_clone.set_always_on_top(false);
            let _ = w_clone.set_focus();
        });
    }
}

fn attach_window_listeners(win: &tauri::WebviewWindow, app: AppHandle) {
    win.on_window_event(move |event| {
        if let WindowEvent::CloseRequested { .. } = event {
            if let Some(state) = app.try_state::<AppState>() {
                let min_to_tray = state
                    .store
                    .lock()
                    .ok()
                    .and_then(|s| s.config.get("minimizeToTray").and_then(|v| v.as_bool()))
                    .unwrap_or(true);
                if min_to_tray {
                    append_boot_log(
                        &state.log_path,
                        "MainWindow closed -> ultra-low-RAM tray daemon mode",
                    );
                } else {
                    state.is_quitting.store(true, Ordering::SeqCst);
                }
            }
        } else if let WindowEvent::DragDrop(tauri::DragDropEvent::Drop { paths, .. }) = event {
            if let Some(state) = app.try_state::<AppState>() {
                let (added_len, ui) = {
                    if let Ok(mut s) = state.store.lock() {
                        let added = s.import_theme_files(&paths, None, None, 0);
                        (added.len(), s.get_full_state_for_ui())
                    } else {
                        (0, serde_json::Value::Null)
                    }
                };
                if added_len > 0 {
                    let _ = app.emit("studio:state-updated", ui);
                }
            }
        }
    });
}

fn setup_tray(app: &AppHandle) -> Result<(), Box<dyn std::error::Error>> {
    let open_item = MenuItem::with_id(app, "open", "Mở Antigravity Studio Rust", true, None::<&str>)?;
    let sep1 = PredefinedMenuItem::separator(app)?;
    let apply_item = MenuItem::with_id(app, "apply", "Áp Dụng Theme Tức Thì", true, None::<&str>)?;
    let disable_item = MenuItem::with_id(app, "disable", "Tắt 1 Chạm (Về Giao Diện Gốc)", true, None::<&str>)?;
    let sep2 = PredefinedMenuItem::separator(app)?;
    let quit_item = MenuItem::with_id(app, "quit", "Thoát Hoàn Toàn", true, None::<&str>)?;

    let menu = Menu::with_items(
        app,
        &[&open_item, &sep1, &apply_item, &disable_item, &sep2, &quit_item],
    )?;

    let icon = Image::from_bytes(TRAY_ICON_PNG)?;
    let _tray = TrayIconBuilder::with_id("studio-tray")
        .icon(icon)
        .tooltip("Antigravity Studio Rust (by mqinpuienhzg) — Bấm để mở")
        .menu(&menu)
        .show_menu_on_left_click(false)
        .on_menu_event(|app, event| match event.id.as_ref() {
            "open" => reveal_or_create_main_window(app),
            "apply" => {
                let app_h = app.clone();
                tauri::async_runtime::spawn(async move {
                    if let Some(st) = app_h.try_state::<AppState>() {
                        let (ui, runtime) = {
                            if let Ok(mut s) = st.store.lock() {
                                s.save_config(&json!({ "enabled": true }));
                                (s.get_full_state_for_ui(), s.build_runtime_payload_state())
                            } else {
                                return;
                            }
                        };
                        ide_sync::sync_ide_window_settings(&runtime, false);
                        let _ = st.cdp.apply_now(runtime).await;
                        let _ = app_h.emit("studio:state-updated", ui);
                    }
                });
            }
            "disable" => {
                let app_h = app.clone();
                tauri::async_runtime::spawn(async move {
                    if let Some(st) = app_h.try_state::<AppState>() {
                        let (ui, runtime) = {
                            if let Ok(mut s) = st.store.lock() {
                                s.save_config(&json!({ "enabled": false }));
                                (s.get_full_state_for_ui(), s.build_runtime_payload_state())
                            } else {
                                return;
                            }
                        };
                        ide_sync::sync_ide_window_settings(&runtime, true);
                        let _ = st.cdp.disable_all().await;
                        let _ = app_h.emit("studio:state-updated", ui);
                    }
                });
            }
            "quit" => {
                if let Some(st) = app.try_state::<AppState>() {
                    st.is_quitting.store(true, Ordering::SeqCst);
                    st.desktop.stop(app);
                    cleanup_instance_file(&st.instance_path);
                }
                app.exit(0);
            }
            _ => {}
        })
        .on_tray_icon_event(|tray, event| {
            if let TrayIconEvent::Click {
                button: MouseButton::Left,
                button_state: MouseButtonState::Up,
                ..
            }
            | TrayIconEvent::DoubleClick {
                button: MouseButton::Left,
                ..
            } = event
            {
                reveal_or_create_main_window(tray.app_handle());
            }
        })
        .build(app)?;

    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let start_hidden = std::env::args().any(|a| a == "--tray");

    let app = tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_single_instance::init(|app, args, _cwd| {
            let silent_tray = args.iter().any(|a| a == "--tray");
            if let Some(st) = app.try_state::<AppState>() {
                st.last_os_wakeup_ms.store(now_ms(), Ordering::Relaxed);
                append_boot_log(
                    &st.log_path,
                    &format!("single-instance triggered (silentTray={silent_tray})"),
                );
            }
            if !silent_tray {
                reveal_or_create_main_window(app);
            }
        }))
        .setup(move |app| {
            let app_handle = app.handle().clone();
            let user_data_dir = app
                .path()
                .app_data_dir()
                .unwrap_or_else(|_| dirs::config_dir().unwrap_or_else(|| PathBuf::from(".")).join("antigravity-studio-rust"));
            let resource_dir = app.path().resource_dir().ok();

            let data_dir = user_data_dir.join("antigravity-studio-rust-data");
            let log_path = data_dir.join("boot.log");
            let instance_path = data_dir.join("instance.json");

            append_boot_log(
                &log_path,
                &format!(
                    "App ready (Antigravity Studio Rust v{}, hidden={start_hidden})",
                    env!("CARGO_PKG_VERSION")
                ),
            );

            ide_sync::sync_ide_argv_json();

            let media_server = tauri::async_runtime::block_on(LocalMediaServer::start())
                .map_err(|e| std::io::Error::new(std::io::ErrorKind::Other, e))?;
            append_boot_log(
                &log_path,
                &format!("Rust Axum media server listening on 127.0.0.1:{}", media_server.port()),
            );

            let token_bytes: [u8; 16] = rand::random();
            let control_token = hex::encode(token_bytes);
            write_instance_file(&instance_path, media_server.port(), &control_token);

            let is_quitting = Arc::new(AtomicBool::new(false));
            let last_os_wakeup_ms = Arc::new(AtomicU64::new(0));

            let ctrl_app = app_handle.clone();
            let ctrl_log = log_path.clone();
            let ctrl_inst = instance_path.clone();
            let ctrl_quitting = is_quitting.clone();
            let ctrl_wakeup = last_os_wakeup_ms.clone();
            media_server.set_control(
                control_token,
                Arc::new(move |action| match action {
                    "reveal" => {
                        append_boot_log(&ctrl_log, "HTTP /__studio/reveal -> showing window");
                        let a = ctrl_app.clone();
                        let _ = ctrl_app.run_on_main_thread(move || {
                            reveal_or_create_main_window(&a);
                        });
                        json!({})
                    }
                    "status" => {
                        let last = ctrl_wakeup.load(Ordering::Relaxed);
                        json!({
                            "recentlyWokenByOs": now_ms().saturating_sub(last) < 2500,
                            "lastSecondInstanceAt": last
                        })
                    }
                    "handover" => {
                        append_boot_log(&ctrl_log, "HTTP /__studio/handover -> yielding lock");
                        ctrl_quitting.store(true, Ordering::SeqCst);
                        cleanup_instance_file(&ctrl_inst);
                        let a = ctrl_app.clone();
                        tauri::async_runtime::spawn(async move {
                            tokio::time::sleep(std::time::Duration::from_millis(40)).await;
                            a.exit(0);
                        });
                        json!({ "handingOver": true })
                    }
                    _ => json!({}),
                }),
            );

            let store = Arc::new(Mutex::new(StudioStore::new(
                &user_data_dir,
                resource_dir.as_deref(),
                media_server.clone(),
            )));

            {
                if let Ok(s) = store.lock() {
                    let rt = s.build_runtime_payload_state();
                    let en = s.config.get("enabled").and_then(|v| v.as_bool()).unwrap_or(false);
                    ide_sync::sync_ide_window_settings(&rt, !en);
                    let auto_start = s
                        .config
                        .get("autoStartWindows")
                        .and_then(|v| v.as_bool())
                        .unwrap_or(true);
                    let _ = ide_sync::sync_windows_auto_start(auto_start);
                }
            }

            let store_for_cdp = store.clone();
            let log_for_cdp = log_path.clone();
            let app_for_status = app_handle.clone();
            let cdp = CdpBridge::new(
                Arc::new(move || {
                    store_for_cdp
                        .lock()
                        .map(|s| s.build_runtime_payload_state())
                        .unwrap_or_else(|_| json!({}))
                }),
                Arc::new(move |msg| append_boot_log(&log_for_cdp, &msg)),
                Arc::new(move |status| {
                    let _ = app_for_status.emit("studio:cdp-status", status);
                }),
            );
            cdp.start();

            let carousel_idx = Arc::new(AtomicUsize::new(0));
            // Background playlist auto-rotation loop
            let pl_store = store.clone();
            let pl_cdp = cdp.clone();
            let pl_app = app_handle.clone();
            let pl_idx = carousel_idx.clone();
            tauri::async_runtime::spawn(async move {
                let mut elapsed_sec = 0u64;
                loop {
                    tokio::time::sleep(std::time::Duration::from_secs(5)).await;
                    elapsed_sec += 5;
                    let maybe_step = {
                        let Ok(mut s) = pl_store.lock() else { continue };
                        let enabled = s.config.get("enabled").and_then(|v| v.as_bool()).unwrap_or(false);
                        let pl_on = s.config.get("playlistEnabled").and_then(|v| v.as_bool()).unwrap_or(false);
                        let interval = s
                            .config
                            .get("playlistIntervalSec")
                            .and_then(|v| v.as_u64())
                            .unwrap_or(120)
                            .max(10);
                        if !enabled || !pl_on || elapsed_sec < interval {
                            None
                        } else {
                            elapsed_sec = 0;
                            let mut pool: Vec<String> = s
                                .config
                                .get("playlistIds")
                                .and_then(|v| v.as_array())
                                .map(|a| {
                                    a.iter()
                                        .filter_map(|x| x.as_str().map(|z| z.to_string()))
                                        .collect()
                                })
                                .unwrap_or_default();
                            if pool.is_empty() {
                                pool = s
                                    .get_all_themes()
                                    .iter()
                                    .filter_map(|t| t.get("id").and_then(|v| v.as_str()).map(|z| z.to_string()))
                                    .collect();
                            }
                            if pool.len() < 2 {
                                None
                            } else {
                                let i = pl_idx.fetch_add(1, Ordering::Relaxed) % pool.len();
                                let next_id = &pool[i];
                                let target = s
                                    .config
                                    .get("playlistTarget")
                                    .and_then(|v| v.as_str())
                                    .unwrap_or("both")
                                    .to_string();
                                let mut patch = json!({});
                                if target == "chat" || target == "both" {
                                    patch["chatThemeId"] = json!(next_id);
                                }
                                if target == "ide" || target == "both" {
                                    patch["ideThemeId"] = json!(next_id);
                                }
                                s.save_config(&patch);
                                Some((s.get_full_state_for_ui(), s.build_runtime_payload_state()))
                            }
                        }
                    };
                    if let Some((ui, runtime)) = maybe_step {
                        ide_sync::sync_ide_window_settings(&runtime, false);
                        let _ = pl_cdp.apply_now(runtime).await;
                        let _ = pl_app.emit("studio:state-updated", ui);
                    }
                }
            });

            let desktop = DesktopWallpaperManager::new();
            let desktop_for_srv = desktop.clone();
            let store_for_srv = store.clone();
            media_server.set_desktop_state_provider(Arc::new(move || {
                let latest = desktop_for_srv.latest_state_json();
                if latest.get("theme").is_some() {
                    latest
                } else {
                    store_for_srv
                        .lock()
                        .map(|s| s.build_desktop_wallpaper_state())
                        .unwrap_or_else(|_| json!({}))
                }
            }));
            desktop.start_smart_pause_watcher(app_handle.clone());

            let auto_desktop = store
                .lock()
                .ok()
                .and_then(|s| {
                    let on = s
                        .config
                        .get("desktopWallpaperEnabled")
                        .and_then(|v| v.as_bool())
                        .unwrap_or(false);
                    if on {
                        Some(s.build_desktop_wallpaper_state())
                    } else {
                        None
                    }
                });

            app.manage(AppState {
                store,
                cdp,
                desktop: desktop.clone(),
                media_server: media_server.clone(),
                resource_dir,
                log_path,
                instance_path,
                is_quitting,
                carousel_idx,
                last_os_wakeup_ms,
            });

            setup_tray(&app_handle)?;

            if let Some(d_state) = auto_desktop {
                let _ = desktop.apply(&app_handle, media_server.port(), d_state);
            }

            if !start_hidden {
                reveal_or_create_main_window(&app_handle);
            }

            // Patch shortcuts asynchronously in background on boot
            tauri::async_runtime::spawn_blocking(ide_sync::patch_windows_shortcuts_for_cdp);

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::studio_get_state,
            commands::studio_update_config,
            commands::studio_apply_now,
            commands::studio_disable_theme,
            commands::studio_reset_config,
            commands::studio_save_combo,
            commands::studio_apply_combo,
            commands::studio_delete_combo,
            commands::studio_randomize_theme,
            commands::studio_import_files,
            commands::studio_scan_folder,
            commands::studio_import_paths,
            commands::studio_delete_theme,
            commands::studio_restore_trash_theme,
            commands::studio_delete_trash_forever,
            commands::studio_empty_trash,
            commands::studio_import_mascot,
            commands::studio_delete_mascot,
            commands::studio_import_avatar,
            commands::studio_online_search,
            commands::studio_online_inspect,
            commands::studio_online_download,
            commands::studio_cdp_status,
            commands::studio_cdp_inspect,
            commands::studio_patch_shortcuts,
            commands::studio_restart_antigravity,
            commands::studio_next_playlist,
            commands::studio_export_backup,
            commands::studio_import_backup,
            commands::studio_open_data_folder,
            commands::studio_open_extra_themes_folder,
            commands::studio_rescan_extra_themes,
            commands::studio_toggle_startup,
            commands::studio_open_external_url,
            commands::studio_desktop_status,
            commands::studio_set_desktop_wallpaper,
            commands::studio_toggle_desktop_wallpaper,
            commands::studio_toggle_desktop_pause,
            commands::window_minimize,
            commands::window_maximize,
            commands::window_close,
        ])
        .build(tauri::generate_context!())
        .expect("error while building Antigravity Studio Rust");

    app.run(|app_handle, event| {
        if let RunEvent::ExitRequested { api, .. } = event {
            if let Some(st) = app_handle.try_state::<AppState>() {
                if !st.is_quitting.load(Ordering::SeqCst) {
                    // Keep lightweight Rust backend + Axum media server + CDP bridge + Tray alive when WebView2 window closes!
                    api.prevent_exit();
                } else {
                    cleanup_instance_file(&st.instance_path);
                }
            }
        }
    });
}
