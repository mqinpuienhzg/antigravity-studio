use crate::{
    downloader::{self, DownloadRequest},
    ide_sync,
    AppState,
};
use rand::Rng;
use serde_json::{json, Value};
use std::{fs, path::PathBuf};
use tauri::{AppHandle, Emitter, Manager, State};
use tauri_plugin_dialog::DialogExt;

#[tauri::command]
pub async fn studio_get_state(state: State<'_, AppState>) -> Result<Value, String> {
    let mut ui = {
        let s = state.store.lock().map_err(|_| "store lock".to_string())?;
        s.get_full_state_for_ui()
    };
    let cdp_status = state.cdp.get_status().await;
    let bins = downloader::resolve_binaries(state.resource_dir.as_deref());
    if let Some(obj) = ui.as_object_mut() {
        obj.insert("cdpStatus".into(), cdp_status);
        obj.insert(
            "onlineBins".into(),
            serde_json::to_value(bins).unwrap_or(Value::Null),
        );
        obj.insert("desktopStatus".into(), state.desktop.get_status());
    }
    Ok(ui)
}

#[tauri::command]
pub async fn studio_update_config(
    patch: Value,
    app: AppHandle,
    state: State<'_, AppState>,
) -> Result<Value, String> {
    let (ui, runtime, desktop_state, enabled, auto_apply, desktop_on) = {
        let mut s = state.store.lock().map_err(|_| "store lock".to_string())?;
        let prev_chat = s
            .config
            .get("chatThemeId")
            .and_then(|v| v.as_str())
            .unwrap_or("")
            .to_string();
        let prev_ide = s
            .config
            .get("ideThemeId")
            .and_then(|v| v.as_str())
            .unwrap_or("")
            .to_string();
        s.save_config(&patch);
        if let Some(nc) = patch.get("chatThemeId").and_then(|v| v.as_str()) {
            if nc != prev_chat {
                s.record_theme_history(nc);
            }
        } else if let Some(ni) = patch.get("ideThemeId").and_then(|v| v.as_str()) {
            if ni != prev_ide {
                s.record_theme_history(ni);
            }
        }
        let enabled = s.config.get("enabled").and_then(|v| v.as_bool()).unwrap_or(false);
        let auto_apply = s
            .config
            .get("autoApplyOnChange")
            .and_then(|v| v.as_bool())
            .unwrap_or(true);
        let desktop_on = s
            .config
            .get("desktopWallpaperEnabled")
            .and_then(|v| v.as_bool())
            .unwrap_or(false);
        (
            s.get_full_state_for_ui(),
            s.build_runtime_payload_state(),
            s.build_desktop_wallpaper_state(),
            enabled,
            auto_apply,
            desktop_on,
        )
    };

    ide_sync::sync_ide_window_settings(&runtime, !enabled);
    if auto_apply {
        if enabled {
            let _ = state.cdp.apply_now(runtime).await;
        } else {
            let _ = state.cdp.disable_all().await;
        }
    }
    if desktop_on {
        let _ = state.desktop.apply(&app, state.media_server.port(), desktop_state);
    }
    Ok(ui)
}

#[tauri::command]
pub async fn studio_apply_now(state: State<'_, AppState>) -> Result<Value, String> {
    let (ui, runtime) = {
        let mut s = state.store.lock().map_err(|_| "store lock".to_string())?;
        s.save_config(&json!({ "enabled": true }));
        (s.get_full_state_for_ui(), s.build_runtime_payload_state())
    };
    ide_sync::sync_ide_window_settings(&runtime, false);
    let mut res = state.cdp.apply_now(runtime).await;
    if let Some(obj) = res.as_object_mut() {
        obj.insert("state".into(), ui);
    }
    Ok(res)
}

#[tauri::command]
pub async fn studio_disable_theme(state: State<'_, AppState>) -> Result<Value, String> {
    let (ui, runtime) = {
        let mut s = state.store.lock().map_err(|_| "store lock".to_string())?;
        s.save_config(&json!({ "enabled": false }));
        (s.get_full_state_for_ui(), s.build_runtime_payload_state())
    };
    ide_sync::sync_ide_window_settings(&runtime, true);
    let mut res = state.cdp.disable_all().await;
    if let Some(obj) = res.as_object_mut() {
        obj.insert("state".into(), ui);
    }
    Ok(res)
}

#[tauri::command]
pub async fn studio_reset_config(state: State<'_, AppState>) -> Result<Value, String> {
    let (ui, runtime) = {
        let mut s = state.store.lock().map_err(|_| "store lock".to_string())?;
        s.reset_config();
        (s.get_full_state_for_ui(), s.build_runtime_payload_state())
    };
    ide_sync::sync_ide_window_settings(&runtime, false);
    let _ = state.cdp.apply_now(runtime).await;
    Ok(ui)
}

#[tauri::command]
pub async fn studio_save_combo(
    name: Option<String>,
    state: State<'_, AppState>,
) -> Result<Value, String> {
    let mut s = state.store.lock().map_err(|_| "store lock".to_string())?;
    let combo = s.save_combo(name.as_deref());
    Ok(json!({ "ok": true, "combo": combo, "state": s.get_full_state_for_ui() }))
}

#[tauri::command]
pub async fn studio_apply_combo(
    combo_id: String,
    state: State<'_, AppState>,
) -> Result<Value, String> {
    let (combo_opt, ui, runtime) = {
        let mut s = state.store.lock().map_err(|_| "store lock".to_string())?;
        let c = s.apply_combo(&combo_id);
        (c, s.get_full_state_for_ui(), s.build_runtime_payload_state())
    };
    let Some(combo) = combo_opt else {
        return Ok(json!({ "ok": false, "state": ui }));
    };
    ide_sync::sync_ide_window_settings(&runtime, false);
    let _ = state.cdp.apply_now(runtime).await;
    Ok(json!({ "ok": true, "combo": combo, "state": ui }))
}

#[tauri::command]
pub async fn studio_delete_combo(
    combo_id: String,
    state: State<'_, AppState>,
) -> Result<Value, String> {
    let mut s = state.store.lock().map_err(|_| "store lock".to_string())?;
    let removed = s.delete_combo(&combo_id);
    Ok(json!({ "ok": removed, "state": s.get_full_state_for_ui() }))
}

#[tauri::command]
pub async fn studio_randomize_theme(
    opts: Option<Value>,
    state: State<'_, AppState>,
) -> Result<Value, String> {
    let opts = opts.unwrap_or_else(|| json!({}));
    let only_video = opts
        .get("onlyVideo")
        .and_then(|v| v.as_bool())
        .unwrap_or(false);
    let sync_accent = opts
        .get("syncAccent")
        .and_then(|v| v.as_bool())
        .unwrap_or(true);
    let random_mascot = opts
        .get("randomMascot")
        .and_then(|v| v.as_bool())
        .unwrap_or(false);

    let (picked, ui, runtime) = {
        let mut s = state.store.lock().map_err(|_| "store lock".to_string())?;
        let all = s.get_all_themes();
        let pool: Vec<Value> = if only_video {
            all.into_iter()
                .filter(|t| t.get("mediaType").and_then(|v| v.as_str()) == Some("video"))
                .collect()
        } else {
            all
        };
        let cur_id = s
            .config
            .get("chatThemeId")
            .and_then(|v| v.as_str())
            .unwrap_or("")
            .to_string();
        let candidates: Vec<Value> = pool
            .iter()
            .filter(|t| t.get("id").and_then(|v| v.as_str()) != Some(&cur_id))
            .cloned()
            .collect();
        let list = if candidates.is_empty() { pool } else { candidates };
        if list.is_empty() {
            return Ok(json!({ "ok": false, "state": s.get_full_state_for_ui() }));
        }
        let mut rng = rand::thread_rng();
        let chosen = list[rng.gen_range(0..list.len())].clone();
        let cid = chosen
            .get("id")
            .and_then(|v| v.as_str())
            .unwrap_or("")
            .to_string();
        let unified = s
            .config
            .get("unifiedFullWindow")
            .and_then(|v| v.as_bool())
            .unwrap_or(true);
        let ide_id = if unified {
            cid.clone()
        } else {
            s.config
                .get("ideThemeId")
                .and_then(|v| v.as_str())
                .unwrap_or(&cid)
                .to_string()
        };

        let mut patch = json!({
            "enabled": true,
            "chatThemeId": cid,
            "ideThemeId": ide_id
        });
        if sync_accent {
            if let Some(acc) = chosen.get("accent").and_then(|v| v.as_str()) {
                patch["neonColor"] = json!(acc);
            }
            if let Some(sec) = chosen.get("secondary").and_then(|v| v.as_str()) {
                patch["neonSecondary"] = json!(sec);
            }
        }
        if random_mascot {
            let mascots = s.get_all_mascots();
            if !mascots.is_empty() {
                let mp = &mascots[rng.gen_range(0..mascots.len())];
                if let Some(mid) = mp.get("id").and_then(|v| v.as_str()) {
                    patch["mascotId"] = json!(mid);
                    patch["mascotEnabled"] = json!(true);
                }
            }
        }
        s.save_config(&patch);
        s.record_theme_history(&cid);
        (
            chosen,
            s.get_full_state_for_ui(),
            s.build_runtime_payload_state(),
        )
    };

    ide_sync::sync_ide_window_settings(&runtime, false);
    let _ = state.cdp.apply_now(runtime).await;
    Ok(json!({ "ok": true, "theme": picked, "state": ui }))
}

#[tauri::command]
pub async fn studio_import_files(
    app: AppHandle,
    state: State<'_, AppState>,
) -> Result<Value, String> {
    let picked = tokio::task::spawn_blocking(move || {
        app.dialog()
            .file()
            .set_title("Chọn Ảnh / Video nền (MP4, WebM, GIF, PNG, WebP, JPG, SVG)")
            .add_filter(
                "Media Theme (Video & Ảnh)",
                &["mp4", "webm", "mov", "m4v", "gif", "webp", "png", "jpg", "jpeg", "svg"],
            )
            .blocking_pick_files()
    })
    .await
    .map_err(|e| e.to_string())?;

    let mut s = state.store.lock().map_err(|_| "store lock".to_string())?;
    let Some(files) = picked else {
        return Ok(json!({ "added": 0, "state": s.get_full_state_for_ui() }));
    };
    let paths: Vec<PathBuf> = files
        .into_iter()
        .filter_map(|f| f.into_path().ok())
        .collect();
    let added = s.import_theme_files(&paths, None, None, 0);
    Ok(json!({ "added": added.len(), "items": added, "state": s.get_full_state_for_ui() }))
}

#[tauri::command]
pub async fn studio_scan_folder(
    app: AppHandle,
    state: State<'_, AppState>,
) -> Result<Value, String> {
    let picked = tokio::task::spawn_blocking(move || {
        app.dialog()
            .file()
            .set_title("Chọn thư mục chứa ảnh/video (hỗ trợ cả thư mục Wallpaper Engine)")
            .blocking_pick_folder()
    })
    .await
    .map_err(|e| e.to_string())?;

    let mut s = state.store.lock().map_err(|_| "store lock".to_string())?;
    let Some(folder) = picked.and_then(|f| f.into_path().ok()) else {
        return Ok(json!({ "added": 0, "state": s.get_full_state_for_ui() }));
    };
    let added = s.scan_folder_for_themes(&folder, 3);
    Ok(json!({
        "added": added.len(),
        "folder": folder.to_string_lossy().to_string(),
        "state": s.get_full_state_for_ui()
    }))
}

#[tauri::command]
pub async fn studio_import_paths(
    paths: Vec<String>,
    state: State<'_, AppState>,
) -> Result<Value, String> {
    let mut s = state.store.lock().map_err(|_| "store lock".to_string())?;
    let pbufs: Vec<PathBuf> = paths.into_iter().map(PathBuf::from).collect();
    let added = s.import_theme_files(&pbufs, None, None, 0);
    Ok(json!({ "added": added.len(), "state": s.get_full_state_for_ui() }))
}

#[tauri::command]
pub async fn studio_delete_theme(
    theme_id: String,
    state: State<'_, AppState>,
) -> Result<Value, String> {
    let mut s = state.store.lock().map_err(|_| "store lock".to_string())?;
    let removed = s.delete_user_theme(&theme_id);
    Ok(json!({ "removed": removed, "state": s.get_full_state_for_ui() }))
}

#[tauri::command]
pub async fn studio_restore_trash_theme(
    theme_id: String,
    state: State<'_, AppState>,
) -> Result<Value, String> {
    let mut s = state.store.lock().map_err(|_| "store lock".to_string())?;
    let restored = s.restore_trash_theme(&theme_id);
    Ok(json!({ "restored": restored, "state": s.get_full_state_for_ui() }))
}

#[tauri::command]
pub async fn studio_delete_trash_forever(
    theme_id: String,
    state: State<'_, AppState>,
) -> Result<Value, String> {
    let mut s = state.store.lock().map_err(|_| "store lock".to_string())?;
    let removed = s.delete_trash_forever(&theme_id);
    Ok(json!({ "removed": removed, "state": s.get_full_state_for_ui() }))
}

#[tauri::command]
pub async fn studio_empty_trash(state: State<'_, AppState>) -> Result<Value, String> {
    let mut s = state.store.lock().map_err(|_| "store lock".to_string())?;
    s.empty_trash();
    Ok(json!({ "ok": true, "state": s.get_full_state_for_ui() }))
}

#[tauri::command]
pub async fn studio_import_mascot(
    app: AppHandle,
    state: State<'_, AppState>,
) -> Result<Value, String> {
    let picked = tokio::task::spawn_blocking(move || {
        app.dialog()
            .file()
            .set_title("Chọn Linh Thú / Sticker (GIF, WebP, PNG, SVG, WebM)")
            .add_filter("Linh Thú & Sticker", &["gif", "webp", "png", "svg", "webm", "mp4"])
            .blocking_pick_file()
    })
    .await
    .map_err(|e| e.to_string())?;

    let Some(file) = picked.and_then(|f| f.into_path().ok()) else {
        let s = state.store.lock().map_err(|_| "store lock".to_string())?;
        return Ok(json!({ "ok": false, "state": s.get_full_state_for_ui() }));
    };

    let (item_opt, ui, runtime, should_apply) = {
        let mut s = state.store.lock().map_err(|_| "store lock".to_string())?;
        let item = s.import_mascot_file(&file);
        if let Some(ref it) = item {
            if let Some(mid) = it.get("id").and_then(|v| v.as_str()) {
                s.save_config(&json!({ "mascotEnabled": true, "mascotId": mid }));
            }
        }
        let apply = item.is_some()
            && s.config.get("autoApplyOnChange").and_then(|v| v.as_bool()).unwrap_or(true)
            && s.config.get("enabled").and_then(|v| v.as_bool()).unwrap_or(false);
        (item, s.get_full_state_for_ui(), s.build_runtime_payload_state(), apply)
    };

    if should_apply {
        let _ = state.cdp.apply_now(runtime).await;
    }
    Ok(json!({ "ok": item_opt.is_some(), "item": item_opt, "state": ui }))
}

#[tauri::command]
pub async fn studio_delete_mascot(
    mascot_id: String,
    state: State<'_, AppState>,
) -> Result<Value, String> {
    let mut s = state.store.lock().map_err(|_| "store lock".to_string())?;
    let removed = s.delete_user_mascot(&mascot_id);
    Ok(json!({ "removed": removed, "state": s.get_full_state_for_ui() }))
}

#[tauri::command]
pub async fn studio_import_avatar(
    role: String,
    app: AppHandle,
    state: State<'_, AppState>,
) -> Result<Value, String> {
    let title = if role == "agent" {
        "Chọn Avatar cho AI Agent"
    } else {
        "Chọn Avatar cho Người Dùng"
    };
    let picked = tokio::task::spawn_blocking(move || {
        app.dialog()
            .file()
            .set_title(title)
            .add_filter("Hình Ảnh", &["png", "jpg", "jpeg", "webp", "gif", "svg"])
            .blocking_pick_file()
    })
    .await
    .map_err(|e| e.to_string())?;

    let Some(file) = picked.and_then(|f| f.into_path().ok()) else {
        let s = state.store.lock().map_err(|_| "store lock".to_string())?;
        return Ok(json!({ "ok": false, "state": s.get_full_state_for_ui() }));
    };

    let (item_opt, ui, runtime, should_apply) = {
        let mut s = state.store.lock().map_err(|_| "store lock".to_string())?;
        let item = s.import_avatar_file(&file, &role);
        let apply = item.is_some()
            && s.config.get("autoApplyOnChange").and_then(|v| v.as_bool()).unwrap_or(true)
            && s.config.get("enabled").and_then(|v| v.as_bool()).unwrap_or(false);
        (item, s.get_full_state_for_ui(), s.build_runtime_payload_state(), apply)
    };

    if should_apply {
        let _ = state.cdp.apply_now(runtime).await;
    }
    Ok(json!({ "ok": item_opt.is_some(), "item": item_opt, "state": ui }))
}

#[tauri::command]
pub async fn studio_online_search(
    query: String,
    state: State<'_, AppState>,
) -> Result<Value, String> {
    let bins = downloader::resolve_binaries(state.resource_dir.as_deref());
    match downloader::search_youtube(&query, 8, &bins).await {
        Ok(items) => Ok(json!({ "ok": true, "items": items })),
        Err(e) => Ok(json!({ "ok": false, "error": e, "items": [] })),
    }
}

#[tauri::command]
pub async fn studio_online_inspect(
    url: String,
    state: State<'_, AppState>,
) -> Result<Value, String> {
    let bins = downloader::resolve_binaries(state.resource_dir.as_deref());
    match downloader::inspect_url(&url, &bins).await {
        Ok(info) => Ok(json!({ "ok": true, "info": info })),
        Err(e) => Ok(json!({ "ok": false, "error": e })),
    }
}

#[tauri::command]
pub async fn studio_online_download(
    opts: DownloadRequest,
    app: AppHandle,
    state: State<'_, AppState>,
) -> Result<Value, String> {
    let dl_dir = {
        let s = state.store.lock().map_err(|_| "store lock".to_string())?;
        s.custom_assets_dir.join("online-downloads")
    };
    let bins = downloader::resolve_binaries(state.resource_dir.as_deref());
    let app_for_prog = app.clone();
    let res = downloader::download_online_media(&opts, &dl_dir, &bins, move |percent, stage| {
        let _ = app_for_prog.emit(
            "studio:download-progress",
            json!({ "percent": percent, "stage": stage }),
        );
    })
    .await;

    match res {
        Ok((file_path, title)) => {
            let (created, ui, runtime, should_apply) = {
                let mut s = state.store.lock().map_err(|_| "store lock".to_string())?;
                let added = s.import_theme_files(
                    &[file_path],
                    Some(&title),
                    Some("Video YouTube / Internet HD"),
                    0,
                );
                let created = added.into_iter().next();
                let mut apply = false;
                if let (Some(ref c), Some(ref target)) = (&created, &opts.apply_target) {
                    if !target.is_empty() {
                        if let Some(cid) = c.get("id").and_then(|v| v.as_str()) {
                            let mut patch = json!({ "enabled": true });
                            if target == "chat" || target == "both" {
                                patch["chatThemeId"] = json!(cid);
                            }
                            if target == "ide" || target == "both" {
                                patch["ideThemeId"] = json!(cid);
                            }
                            s.save_config(&patch);
                            apply = true;
                        }
                    }
                }
                (
                    created,
                    s.get_full_state_for_ui(),
                    s.build_runtime_payload_state(),
                    apply,
                )
            };
            if should_apply {
                ide_sync::sync_ide_window_settings(&runtime, false);
                let _ = state.cdp.apply_now(runtime).await;
            }
            Ok(json!({ "ok": true, "theme": created, "state": ui }))
        }
        Err(e) => {
            let _ = app.emit(
                "studio:download-progress",
                json!({ "percent": 0, "stage": "", "error": e }),
            );
            Ok(json!({ "ok": false, "error": e }))
        }
    }
}

#[tauri::command]
pub async fn studio_cdp_status(state: State<'_, AppState>) -> Result<Value, String> {
    Ok(state.cdp.get_status().await)
}

#[tauri::command]
pub async fn studio_cdp_inspect(state: State<'_, AppState>) -> Result<Value, String> {
    Ok(Value::Array(state.cdp.inspect_targets().await))
}

#[tauri::command]
pub async fn studio_patch_shortcuts() -> Result<Value, String> {
    tokio::task::spawn_blocking(ide_sync::patch_windows_shortcuts_for_cdp)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn studio_restart_antigravity(state: State<'_, AppState>) -> Result<Value, String> {
    let runtime = {
        let s = state.store.lock().map_err(|_| "store lock".to_string())?;
        s.build_runtime_payload_state()
    };
    Ok(ide_sync::restart_antigravity_with_cdp(&runtime).await)
}

#[tauri::command]
pub async fn studio_next_playlist(state: State<'_, AppState>) -> Result<Value, String> {
    let (ui, runtime, enabled) = {
        let mut s = state.store.lock().map_err(|_| "store lock".to_string())?;
        let themes = s.get_all_themes();
        let mut pool: Vec<String> = s
            .config
            .get("playlistIds")
            .and_then(|v| v.as_array())
            .map(|a| {
                a.iter()
                    .filter_map(|x| x.as_str().map(|s| s.to_string()))
                    .collect()
            })
            .unwrap_or_default();
        if pool.is_empty() {
            pool = themes
                .iter()
                .filter_map(|t| t.get("id").and_then(|v| v.as_str()).map(|x| x.to_string()))
                .collect();
        }
        if !pool.is_empty() {
            let idx = state
                .carousel_idx
                .fetch_add(1, std::sync::atomic::Ordering::Relaxed)
                % pool.len();
            let next_id = &pool[idx];
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
        }
        let en = s.config.get("enabled").and_then(|v| v.as_bool()).unwrap_or(false);
        (s.get_full_state_for_ui(), s.build_runtime_payload_state(), en)
    };
    if enabled {
        ide_sync::sync_ide_window_settings(&runtime, false);
        let _ = state.cdp.apply_now(runtime).await;
    }
    Ok(ui)
}

#[tauri::command]
pub async fn studio_export_backup(
    app: AppHandle,
    state: State<'_, AppState>,
) -> Result<Value, String> {
    let default_name = format!(
        "antigravity-studio-rust-backup-{}.json",
        chrono::Local::now().format("%Y-%m-%d")
    );
    let picked = tokio::task::spawn_blocking(move || {
        app.dialog()
            .file()
            .set_title("Lưu bản sao lưu Antigravity Studio Rust")
            .set_file_name(&default_name)
            .add_filter("JSON Backup", &["json"])
            .blocking_save_file()
    })
    .await
    .map_err(|e| e.to_string())?;

    let Some(path) = picked.and_then(|f| f.into_path().ok()) else {
        return Ok(json!({ "ok": false }));
    };
    let content = {
        let s = state.store.lock().map_err(|_| "store lock".to_string())?;
        s.export_backup_json()
    };
    fs::write(&path, content).map_err(|e| e.to_string())?;
    Ok(json!({ "ok": true, "filePath": path.to_string_lossy().to_string() }))
}

#[tauri::command]
pub async fn studio_import_backup(
    app: AppHandle,
    state: State<'_, AppState>,
) -> Result<Value, String> {
    let picked = tokio::task::spawn_blocking(move || {
        app.dialog()
            .file()
            .set_title("Khôi phục bản sao lưu JSON")
            .add_filter("JSON Backup", &["json"])
            .blocking_pick_file()
    })
    .await
    .map_err(|e| e.to_string())?;

    let Some(path) = picked.and_then(|f| f.into_path().ok()) else {
        return Ok(json!({ "ok": false }));
    };
    let raw = fs::read_to_string(&path).map_err(|e| e.to_string())?;
    let (res, runtime, enabled) = {
        let mut s = state.store.lock().map_err(|_| "store lock".to_string())?;
        let r = s.import_backup_json(&raw);
        let en = s.config.get("enabled").and_then(|v| v.as_bool()).unwrap_or(false);
        (r, s.build_runtime_payload_state(), en)
    };
    match res {
        Ok(ui) => {
            if enabled {
                let _ = state.cdp.apply_now(runtime).await;
            }
            Ok(json!({ "ok": true, "state": ui }))
        }
        Err(e) => Ok(json!({ "ok": false, "error": e })),
    }
}

#[tauri::command]
pub async fn studio_open_data_folder(state: State<'_, AppState>) -> Result<Value, String> {
    let dir = {
        let s = state.store.lock().map_err(|_| "store lock".to_string())?;
        s.base_dir.clone()
    };
    let _ = fs::create_dir_all(&dir);
    ide_sync::open_folder_in_shell(&dir)?;
    Ok(json!({ "ok": true }))
}

#[tauri::command]
pub async fn studio_open_extra_themes_folder(state: State<'_, AppState>) -> Result<Value, String> {
    let dir = {
        let s = state.store.lock().map_err(|_| "store lock".to_string())?;
        s.extra_themes_dir.clone()
    };
    let _ = fs::create_dir_all(&dir);
    ide_sync::open_folder_in_shell(&dir)?;
    Ok(json!({ "ok": true, "dir": dir.to_string_lossy().to_string() }))
}

#[tauri::command]
pub async fn studio_rescan_extra_themes(state: State<'_, AppState>) -> Result<Value, String> {
    let mut s = state.store.lock().map_err(|_| "store lock".to_string())?;
    let count = s.rescan_extra_folder_themes();
    Ok(json!({ "ok": true, "count": count, "state": s.get_full_state_for_ui() }))
}

#[tauri::command]
pub async fn studio_toggle_startup(
    enable: bool,
    state: State<'_, AppState>,
) -> Result<Value, String> {
    match ide_sync::sync_windows_auto_start(enable) {
        Ok(()) => {
            let mut s = state.store.lock().map_err(|_| "store lock".to_string())?;
            s.save_config(&json!({ "autoStartWindows": enable }));
            Ok(json!({ "ok": true, "enabled": enable }))
        }
        Err(e) => Ok(json!({ "ok": false, "error": e })),
    }
}

#[tauri::command]
pub async fn studio_open_external_url(url: String, app: AppHandle) -> Result<Value, String> {
    use tauri_plugin_opener::OpenerExt;
    app.opener()
        .open_url(&url, None::<&str>)
        .map_err(|e| e.to_string())?;
    Ok(json!({ "ok": true }))
}

#[tauri::command]
pub async fn studio_desktop_status(state: State<'_, AppState>) -> Result<Value, String> {
    Ok(state.desktop.get_status())
}

#[tauri::command]
pub async fn studio_set_desktop_wallpaper(
    theme_id: String,
    app: AppHandle,
    state: State<'_, AppState>,
) -> Result<Value, String> {
    let (ui, desktop_state) = {
        let mut s = state.store.lock().map_err(|_| "store lock".to_string())?;
        s.save_config(&json!({
            "desktopThemeId": theme_id,
            "desktopWallpaperEnabled": true,
            "desktopSyncWithIde": false
        }));
        (s.get_full_state_for_ui(), s.build_desktop_wallpaper_state())
    };
    match state
        .desktop
        .apply(&app, state.media_server.port(), desktop_state)
    {
        Ok(status) => Ok(json!({ "ok": true, "status": status, "state": ui })),
        Err(e) => Ok(json!({ "ok": false, "error": e, "status": state.desktop.get_status(), "state": ui })),
    }
}

#[tauri::command]
pub async fn studio_toggle_desktop_wallpaper(
    enable: bool,
    app: AppHandle,
    state: State<'_, AppState>,
) -> Result<Value, String> {
    let (ui, desktop_state) = {
        let mut s = state.store.lock().map_err(|_| "store lock".to_string())?;
        s.save_config(&json!({ "desktopWallpaperEnabled": enable }));
        (s.get_full_state_for_ui(), s.build_desktop_wallpaper_state())
    };
    if enable {
        match state
            .desktop
            .apply(&app, state.media_server.port(), desktop_state)
        {
            Ok(status) => Ok(json!({ "ok": true, "status": status, "state": ui })),
            Err(e) => Ok(json!({ "ok": false, "error": e, "status": state.desktop.get_status(), "state": ui })),
        }
    } else {
        let status = state.desktop.stop(&app);
        Ok(json!({ "ok": true, "status": status, "state": ui }))
    }
}

#[tauri::command]
pub async fn studio_toggle_desktop_pause(
    app: AppHandle,
    state: State<'_, AppState>,
) -> Result<Value, String> {
    let status = state.desktop.toggle_pause(&app);
    Ok(json!({ "ok": true, "status": status }))
}

#[tauri::command]
pub async fn window_minimize(app: AppHandle) -> Result<(), String> {
    if let Some(w) = app.get_webview_window("main") {
        let _ = w.minimize();
    }
    Ok(())
}

#[tauri::command]
pub async fn window_maximize(app: AppHandle) -> Result<(), String> {
    if let Some(w) = app.get_webview_window("main") {
        if w.is_maximized().unwrap_or(false) {
            let _ = w.unmaximize();
        } else {
            let _ = w.maximize();
        }
    }
    Ok(())
}

#[tauri::command]
pub async fn window_close(app: AppHandle, state: State<'_, AppState>) -> Result<(), String> {
    let min_to_tray = state
        .store
        .lock()
        .ok()
        .and_then(|s| s.config.get("minimizeToTray").and_then(|v| v.as_bool()))
        .unwrap_or(true);
    if !min_to_tray {
        state
            .is_quitting
            .store(true, std::sync::atomic::Ordering::SeqCst);
    }
    if let Some(w) = app.get_webview_window("main") {
        let _ = w.close();
    }
    Ok(())
}
