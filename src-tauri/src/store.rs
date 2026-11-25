use crate::media_server::LocalMediaServer;
use md5::{Digest, Md5};
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use std::{
    collections::{HashMap, HashSet},
    fs,
    path::{Path, PathBuf},
    time::{SystemTime, UNIX_EPOCH},
};

const BUNDLED_CATALOG_JSON: &str = include_str!("../resources/bundled-catalog.json");
const STARTER_ASSETS_JSON: &str = include_str!("../resources/starter-assets.json");

#[derive(Deserialize)]
struct BundledCatalog {
    videos: Vec<Value>,
    wallpapers: Vec<Value>,
    mascots: Vec<Value>,
}

#[derive(Deserialize)]
struct StarterCatalog {
    scenes: Vec<Value>,
    mascots: Vec<Value>,
}

fn now_ms() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_millis() as u64)
        .unwrap_or(0)
}

fn md5_hex_10(input: &str) -> String {
    let mut hasher = Md5::new();
    hasher.update(input.as_bytes());
    let out = hex::encode(hasher.finalize());
    out.chars().take(10).collect()
}

fn is_video_ext(ext: &str) -> bool {
    matches!(ext, "mp4" | "webm" | "mov" | "m4v" | "ogg")
}

fn is_anim_img_ext(ext: &str) -> bool {
    ext == "gif"
}

fn is_static_img_ext(ext: &str) -> bool {
    matches!(ext, "png" | "jpg" | "jpeg" | "webp" | "avif" | "bmp" | "svg")
}

fn ext_lower(p: &Path) -> String {
    p.extension()
        .and_then(|e| e.to_str())
        .map(|s| s.to_ascii_lowercase())
        .unwrap_or_default()
}

fn classify_file(p: &Path) -> Option<(&'static str, &'static str)> {
    let ext = ext_lower(p);
    if is_video_ext(&ext) {
        Some(("dynamic", "video"))
    } else if is_anim_img_ext(&ext) {
        Some(("dynamic", "gif"))
    } else if is_static_img_ext(&ext) {
        Some((
            "static",
            if ext == "svg" { "svg-static" } else { "image" },
        ))
    } else {
        None
    }
}

pub fn create_default_config() -> Value {
    json!({
        "configVersion": 10,
        "enabled": true,
        "unifiedFullWindow": true,
        "chatThemeId": "vid-yt-raiden-moon",
        "ideThemeId": "vid-yt-raiden-moon",
        "uiFont": "be_vietnam",
        "textContrastMode": "crisp",
        "chatFontSize": 14,
        "syncWindowControls": true,
        "appIconStyle": "glow",
        "activityBarStyle": "colorful_glow",
        "tabsChromeStyle": "floating_pills",
        "statusBarStyle": "glass_pills",
        "ideWelcomeStyle": "luxury_bottom",
        "ideWelcomeTitle": "Antigravity IDE",
        "ideWelcomeFont": "orbitron",
        "ideWelcomeFontSize": 26,
        "wallpaperBlur": 0,
        "uiPanelBlur": 0,
        "dimming": 14,
        "sidebarOpacity": 0,
        "chatBoxOpacity": 0,
        "editorOpacity": 22,
        "terminalOpacity": 10,
        "settingsOpacity": 26,
        "borderStyle": "none",
        "textPalette": "alabaster",
        "customTextColor": "#edf2f7",
        "customCodeColor": "#bae6fd",
        "neonColor": "#818cf8",
        "neonSecondary": "#38bdf8",
        "neonIntensity": 52,
        "videoObjectFit": "cover",
        "videoVolume": 0,
        "videoSpeed": 1,
        "smartGpuPowerSaving": true,
        "playlistEnabled": false,
        "playlistIntervalSec": 120,
        "playlistTarget": "both",
        "playlistIds": [],
        "isLightMode": false,
        "applyToChat": true,
        "applyToIde": true,
        "splitBrowserSafe": true,
        "bubbleStyle": "crystal",
        "composerStyle": "glass",
        "welcomeText": "",
        "cornerRadius": 14,
        "mascotEnabled": true,
        "mascotInteractive": true,
        "mascotId": "bundled-bold-cyber-bunny",
        "mascotPosition": "bottom-right",
        "mascotSize": 124,
        "mascotOpacity": 96,
        "mascotTarget": "both",
        "mascotAnim": "float",
        "mascotGlow": true,
        "mascotFlip": false,
        "mascotQuotes": [
            "Chào Đại Đế! Hôm nay build gì nào? ✨",
            "Fix bug siêu mượt luôn 🔥",
            "Nhớ uống ngụm nước nhé sếp 💧",
            "Giao diện này trong suốt đỉnh quá 💖",
            "Để mình canh bug cho bạn 👀",
            "Đẩy tiến độ thôi nào 🚀"
        ],
        "userAvatarId": "",
        "agentAvatarId": "",
        "avatarSize": 36,
        "avatarRadius": 50,
        "minimizeToTray": true,
        "autoApplyOnChange": true,
        "autoStartWindows": true,
        "desktopWallpaperEnabled": false,
        "desktopThemeId": "vid-nikke-sakura-summer",
        "desktopSyncWithIde": false,
        "desktopDimming": 0,
        "desktopBlur": 0,
        "desktopObjectFit": "cover",
        "desktopSpeed": 1,
        "desktopVolume": 0,
        "desktopSmartPause": true,
        "desktopDisplayMode": "primary"
    })
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct StudioLibrary {
    #[serde(default)]
    pub user_themes: Vec<Value>,
    #[serde(default)]
    pub trash_themes: Vec<Value>,
    #[serde(default)]
    pub user_mascots: Vec<Value>,
    #[serde(default)]
    pub user_avatars: Vec<Value>,
    #[serde(default)]
    pub saved_combos: Vec<Value>,
    #[serde(default)]
    pub theme_history: Vec<Value>,
}

pub struct StudioStore {
    pub base_dir: PathBuf,
    pub starter_dir: PathBuf,
    pub custom_assets_dir: PathBuf,
    pub extra_themes_dir: PathBuf,
    pub config_path: PathBuf,
    pub library_path: PathBuf,
    pub bundled_assets_dir: PathBuf,
    pub brand_logo_path: PathBuf,
    pub media_server: LocalMediaServer,

    pub bundled_themes: Vec<Value>,
    pub bundled_mascots: Vec<Value>,
    pub starter_scenes: Vec<Value>,
    pub starter_mascots: Vec<Value>,
    pub skill_themes: Vec<Value>,
    pub extra_folder_themes: Vec<Value>,
    pub library: StudioLibrary,
    pub config: Value,
}

fn resolve_bundled_assets_dir(resource_dir: Option<&Path>) -> PathBuf {
    let mut candidates: Vec<PathBuf> = Vec::new();
    if let Some(r) = resource_dir {
        candidates.push(r.join("assets"));
        candidates.push(r.join("_up_").join("assets"));
    }
    if let Ok(exe) = std::env::current_exe() {
        if let Some(dir) = exe.parent() {
            candidates.push(dir.join("assets"));
            candidates.push(dir.join("resources").join("assets"));
            if let Some(p) = dir.parent() {
                candidates.push(p.join("assets"));
                if let Some(p2) = p.parent() {
                    candidates.push(p2.join("assets"));
                }
            }
        }
    }
    if let Ok(cwd) = std::env::current_dir() {
        candidates.push(cwd.join("assets"));
        candidates.push(cwd.join("..").join("assets"));
    }

    for c in &candidates {
        if c.join("videos").exists() || c.join("wallpapers").exists() {
            return c.clone();
        }
    }
    candidates.into_iter().next().unwrap_or_else(|| PathBuf::from("assets"))
}

fn read_json_safe(file_path: &Path) -> Option<Value> {
    let bak = PathBuf::from(format!("{}.bak", file_path.to_string_lossy()));
    for cand in [file_path, bak.as_path()] {
        if !cand.exists() {
            continue;
        }
        if let Ok(raw) = fs::read_to_string(cand) {
            if raw.trim().is_empty() {
                continue;
            }
            if let Ok(v) = serde_json::from_str::<Value>(&raw) {
                if v.is_object() {
                    return Some(v);
                }
            }
        }
    }
    None
}

fn write_json_atomic(file_path: &Path, val: &Value) {
    let Ok(text) = serde_json::to_string_pretty(val) else {
        return;
    };
    let tmp = PathBuf::from(format!("{}.tmp", file_path.to_string_lossy()));
    let bak = PathBuf::from(format!("{}.bak", file_path.to_string_lossy()));
    if file_path.exists() {
        if let Ok(cur) = fs::read_to_string(file_path) {
            if !cur.trim().is_empty() && serde_json::from_str::<Value>(&cur).is_ok() {
                let _ = fs::write(&bak, cur);
            }
        }
    }
    if fs::write(&tmp, &text).is_ok() && fs::rename(&tmp, file_path).is_err() {
        let _ = fs::write(file_path, &text);
        let _ = fs::remove_file(&tmp);
    }
}

impl StudioStore {
    pub fn new(
        user_data_dir: &Path,
        resource_dir: Option<&Path>,
        media_server: LocalMediaServer,
    ) -> Self {
        let base_dir = user_data_dir.join("antigravity-studio-rust-data");
        let starter_dir = base_dir.join("starter");
        let custom_assets_dir = base_dir.join("custom-assets");
        let extra_themes_dir = base_dir.join("extra-themes");
        let config_path = base_dir.join("studio_config.json");
        let library_path = base_dir.join("library.json");

        let _ = fs::create_dir_all(&base_dir);
        let _ = fs::create_dir_all(&custom_assets_dir);
        let _ = fs::create_dir_all(&extra_themes_dir);

        // One-time non-destructive migration of user's preferred config from Electron edition if fresh install
        if !config_path.exists() {
            if let Some(cfg_root) = dirs::config_dir() {
                let legacy = cfg_root
                    .join("antigravity-studio")
                    .join("antigravity-studio-data")
                    .join("studio_config.json");
                if legacy.exists() {
                    let _ = fs::copy(&legacy, &config_path);
                }
            }
        }

        let guide_file = extra_themes_dir.join("BO_VIDEO_VA_ANH_VAO_DAY.txt");
        if !guide_file.exists() {
            let _ = fs::write(
                &guide_file,
                "Thả trực tiếp bất kỳ file video (.mp4, .webm, .mov, .gif) hoặc ảnh (.webp, .png, .jpg) vào thư mục này!\nAntigravity Studio Rust sẽ tự động nhận diện và hiển thị trong mục \"Thư Mục Mở Rộng\".\n",
            );
        }

        let bundled_assets_dir = resolve_bundled_assets_dir(resource_dir);
        let brand_logo_path = bundled_assets_dir.join("brand").join("antigravity-logo.png");

        let mut store = Self {
            base_dir,
            starter_dir,
            custom_assets_dir,
            extra_themes_dir,
            config_path,
            library_path,
            bundled_assets_dir,
            brand_logo_path,
            media_server,
            bundled_themes: Vec::new(),
            bundled_mascots: Vec::new(),
            starter_scenes: Vec::new(),
            starter_mascots: Vec::new(),
            skill_themes: Vec::new(),
            extra_folder_themes: Vec::new(),
            library: StudioLibrary::default(),
            config: create_default_config(),
        };

        store.load_bundled_catalog();
        store.ensure_starter_assets();
        store.skill_themes = store.load_existing_skill_themes();
        store.library = store.load_library();
        store.extra_folder_themes = store.load_extra_folder_themes();
        store.config = store.load_config();
        store.sync_media_registrations();
        store
    }

    fn load_bundled_catalog(&mut self) {
        let Ok(cat) = serde_json::from_str::<BundledCatalog>(BUNDLED_CATALOG_JSON) else {
            return;
        };
        let vid_dir = self.bundled_assets_dir.join("videos");
        let thumb_dir = self.bundled_assets_dir.join("thumbs");
        for meta in cat.videos {
            let Some(file) = meta.get("file").and_then(|v| v.as_str()) else {
                continue;
            };
            let fp = vid_dir.join(file);
            if !fp.exists() {
                continue;
            }
            let stem = Path::new(file)
                .file_stem()
                .and_then(|s| s.to_str())
                .unwrap_or("");
            let tp = thumb_dir.join(format!("{stem}.jpg"));
            let file_size = fs::metadata(&fp).map(|m| m.len()).unwrap_or(0);
            let mut item = meta.clone();
            if let Some(obj) = item.as_object_mut() {
                obj.insert("category".into(), json!("dynamic"));
                obj.insert("mediaType".into(), json!("video"));
                obj.insert("filePath".into(), json!(fp.to_string_lossy().to_string()));
                obj.insert(
                    "posterPath".into(),
                    json!(if tp.exists() {
                        tp.to_string_lossy().to_string()
                    } else {
                        String::new()
                    }),
                );
                obj.insert("fileSize".into(), json!(file_size));
                obj.entry("collection".to_string()).or_insert_with(|| json!("anime"));
                obj.entry("resBadge".to_string()).or_insert_with(|| json!("FHD"));
                obj.entry("fpsBadge".to_string()).or_insert_with(|| json!("60 FPS"));
                obj.insert("source".into(), json!("bundled"));
            }
            self.bundled_themes.push(item);
        }

        let wp_dir = self.bundled_assets_dir.join("wallpapers");
        for meta in cat.wallpapers {
            let Some(file) = meta.get("file").and_then(|v| v.as_str()) else {
                continue;
            };
            let fp = wp_dir.join(file);
            if !fp.exists() {
                continue;
            }
            let file_size = fs::metadata(&fp).map(|m| m.len()).unwrap_or(0);
            let mut item = meta.clone();
            if let Some(obj) = item.as_object_mut() {
                obj.insert("category".into(), json!("static"));
                obj.insert("mediaType".into(), json!("image"));
                obj.insert("filePath".into(), json!(fp.to_string_lossy().to_string()));
                obj.insert("fileSize".into(), json!(file_size));
                obj.entry("collection".to_string()).or_insert_with(|| json!("fantasy"));
                obj.insert("source".into(), json!("bundled"));
            }
            self.bundled_themes.push(item);
        }

        let m_dir = self.bundled_assets_dir.join("mascots");
        for meta in cat.mascots {
            let Some(file) = meta.get("file").and_then(|v| v.as_str()) else {
                continue;
            };
            let fp = m_dir.join(file);
            if !fp.exists() {
                continue;
            }
            let mut item = meta.clone();
            if let Some(obj) = item.as_object_mut() {
                obj.insert("filePath".into(), json!(fp.to_string_lossy().to_string()));
                obj.insert("source".into(), json!("bundled"));
            }
            self.bundled_mascots.push(item);
        }
    }

    fn ensure_starter_assets(&mut self) {
        let Ok(cat) = serde_json::from_str::<StarterCatalog>(STARTER_ASSETS_JSON) else {
            return;
        };
        let scenes_dir = self.starter_dir.join("scenes");
        let mascots_dir = self.starter_dir.join("mascots");
        let _ = fs::create_dir_all(&scenes_dir);
        let _ = fs::create_dir_all(&mascots_dir);

        for sc in cat.scenes {
            let Some(file_name) = sc.get("fileName").and_then(|v| v.as_str()) else {
                continue;
            };
            let Some(svg) = sc.get("svg").and_then(|v| v.as_str()) else {
                continue;
            };
            let fp = scenes_dir.join(file_name);
            if !fp.exists() {
                let _ = fs::write(&fp, svg);
            }
            let size = fs::metadata(&fp).map(|m| m.len()).unwrap_or(0);
            self.starter_scenes.push(json!({
                "id": sc.get("id").cloned().unwrap_or_default(),
                "name": sc.get("name").cloned().unwrap_or_default(),
                "category": sc.get("category").cloned().unwrap_or_else(|| json!("dynamic")),
                "mediaType": sc.get("mediaType").cloned().unwrap_or_else(|| json!("svg-anim")),
                "filePath": fp.to_string_lossy().to_string(),
                "fileSize": size,
                "concept": sc.get("concept").cloned().unwrap_or_default(),
                "accent": sc.get("accent").cloned().unwrap_or_else(|| json!("#8b5cf6")),
                "secondary": sc.get("secondary").cloned().unwrap_or_else(|| json!("#38bdf8")),
                "overlayRgb": sc.get("overlayRgb").cloned().unwrap_or_else(|| json!("6, 10, 22")),
                "source": "starter"
            }));
        }

        for mc in cat.mascots {
            let Some(file_name) = mc.get("fileName").and_then(|v| v.as_str()) else {
                continue;
            };
            let Some(svg) = mc.get("svg").and_then(|v| v.as_str()) else {
                continue;
            };
            let fp = mascots_dir.join(file_name);
            if !fp.exists() {
                let _ = fs::write(&fp, svg);
            }
            self.starter_mascots.push(json!({
                "id": mc.get("id").cloned().unwrap_or_default(),
                "name": mc.get("name").cloned().unwrap_or_default(),
                "filePath": fp.to_string_lossy().to_string(),
                "source": "starter"
            }));
        }
    }

    fn load_existing_skill_themes(&self) -> Vec<Value> {
        let Some(home) = dirs::home_dir() else {
            return Vec::new();
        };
        let skill_root = home
            .join(".gemini")
            .join("config")
            .join("skills")
            .join("antigravity-custom-theme");
        let themes_json = skill_root.join("themes").join("themes.json");
        if !themes_json.exists() {
            return Vec::new();
        }
        let Ok(raw_text) = fs::read_to_string(&themes_json) else {
            return Vec::new();
        };
        let Ok(Value::Object(map)) = serde_json::from_str::<Value>(&raw_text) else {
            return Vec::new();
        };

        let mut list = Vec::new();
        for (name, th) in map {
            let Some(obj) = th.as_object() else { continue };
            let wp_rel = obj.get("wallpaper").and_then(|v| v.as_str()).unwrap_or("");
            let wp_abs = if wp_rel.is_empty() {
                PathBuf::new()
            } else {
                skill_root.join("themes").join(wp_rel)
            };
            let has_file = !wp_rel.is_empty() && wp_abs.exists();
            let ext = if has_file { ext_lower(&wp_abs) } else { String::new() };
            let is_anim = has_file && (is_video_ext(&ext) || ext == "gif" || wp_rel.contains("_anim"));
            let slug: String = name
                .to_ascii_lowercase()
                .chars()
                .map(|c| if c.is_ascii_alphanumeric() { c } else { '-' })
                .collect();
            let id = format!("skill-{slug}");

            let uav_rel = obj.get("userAvatar").and_then(|v| v.as_str()).unwrap_or("");
            let aav_rel = obj.get("agentAvatar").and_then(|v| v.as_str()).unwrap_or("");
            let uav_abs = if uav_rel.is_empty() { PathBuf::new() } else { skill_root.join("themes").join(uav_rel) };
            let aav_abs = if aav_rel.is_empty() { PathBuf::new() } else { skill_root.join("themes").join(aav_rel) };

            let media_type = if has_file {
                if is_video_ext(&ext) {
                    "video"
                } else if ext == "svg" {
                    if is_anim { "svg-anim" } else { "svg-static" }
                } else {
                    "image"
                }
            } else {
                "css"
            };

            list.push(json!({
                "id": id,
                "name": name,
                "category": if is_anim { "dynamic" } else { "static" },
                "mediaType": media_type,
                "filePath": if has_file { wp_abs.to_string_lossy().to_string() } else { String::new() },
                "fileSize": if has_file { fs::metadata(&wp_abs).map(|m| m.len()).unwrap_or(0) } else { 0 },
                "concept": obj.get("concept").and_then(|v| v.as_str()).unwrap_or("Preset từ antigravity-custom-theme"),
                "accent": obj.get("primary").and_then(|v| v.as_str()).unwrap_or("#fbbf24"),
                "secondary": obj.get("secondary").and_then(|v| v.as_str()).unwrap_or("#38bdf8"),
                "overlayRgb": obj.get("overlayRgb").and_then(|v| v.as_str()).unwrap_or("5, 9, 22"),
                "pureBg": obj.get("pureBg").and_then(|v| v.as_str()).unwrap_or(""),
                "userAvatarPath": if !uav_rel.is_empty() && uav_abs.exists() { uav_abs.to_string_lossy().to_string() } else { String::new() },
                "agentAvatarPath": if !aav_rel.is_empty() && aav_abs.exists() { aav_abs.to_string_lossy().to_string() } else { String::new() },
                "welcomeText": obj.get("welcomeText").and_then(|v| v.as_str()).unwrap_or(""),
                "source": "skill"
            }));
        }
        list
    }

    fn get_extra_search_dirs(&self) -> Vec<PathBuf> {
        let mut dirs_vec = vec![self.extra_themes_dir.clone()];
        if let Ok(exe) = std::env::current_exe() {
            if let Some(exe_dir) = exe.parent() {
                for name in ["Themes", "ExtraThemes", "VideoThemes"] {
                    let cand = exe_dir.join(name);
                    if cand.exists() {
                        dirs_vec.push(cand);
                    }
                }
            }
        }
        dirs_vec
    }

    pub fn load_extra_folder_themes(&self) -> Vec<Value> {
        let mut out = Vec::new();
        let mut seen = HashSet::new();

        fn walk(dir: &Path, depth: usize, seen: &mut HashSet<String>, out: &mut Vec<Value>) {
            if depth > 2 || !dir.exists() {
                return;
            }
            let Ok(entries) = fs::read_dir(dir) else { return };
            for ent in entries.flatten() {
                let p = ent.path();
                if p.is_dir() {
                    if ent.file_name().to_string_lossy().starts_with('.') {
                        continue;
                    }
                    walk(&p, depth + 1, seen, out);
                } else if p.is_file() {
                    let Some((cat, mtype)) = classify_file(&p) else {
                        continue;
                    };
                    let norm = fs::canonicalize(&p)
                        .unwrap_or_else(|_| p.clone())
                        .to_string_lossy()
                        .to_ascii_lowercase();
                    if !seen.insert(norm.clone()) {
                        continue;
                    }
                    let size = fs::metadata(&p).map(|m| m.len()).unwrap_or(0);
                    let id = format!("extra-{}", md5_hex_10(&norm));
                    let clean_name = p
                        .file_stem()
                        .and_then(|s| s.to_str())
                        .unwrap_or("Theme Mở Rộng")
                        .replace(['_', '-'], " ")
                        .trim()
                        .to_string();
                    out.push(json!({
                        "id": id,
                        "name": if clean_name.is_empty() { "Theme Mở Rộng".to_string() } else { clean_name },
                        "category": cat,
                        "mediaType": mtype,
                        "filePath": p.to_string_lossy().to_string(),
                        "fileSize": size,
                        "concept": if mtype == "video" { "Video Mở Rộng (Tự Nạp)" } else { "Hình Nền Mở Rộng (Tự Nạp)" },
                        "collection": "extra",
                        "accent": "#a855f7",
                        "secondary": "#38bdf8",
                        "overlayRgb": "8, 10, 22",
                        "source": "extra"
                    }));
                }
            }
        }

        for d in self.get_extra_search_dirs() {
            walk(&d, 0, &mut seen, &mut out);
        }
        out
    }

    pub fn rescan_extra_folder_themes(&mut self) -> usize {
        self.extra_folder_themes = self.load_extra_folder_themes();
        self.sync_media_registrations();
        self.extra_folder_themes.len()
    }

    fn load_library(&self) -> StudioLibrary {
        if let Some(v) = read_json_safe(&self.library_path) {
            if let Ok(lib) = serde_json::from_value::<StudioLibrary>(v) {
                return lib;
            }
        }
        StudioLibrary::default()
    }

    pub fn save_library(&mut self) {
        if let Ok(v) = serde_json::to_value(&self.library) {
            write_json_atomic(&self.library_path, &v);
        }
        self.sync_media_registrations();
    }

    fn load_config(&self) -> Value {
        let mut def = create_default_config();
        if let Some(Value::Object(saved)) = read_json_safe(&self.config_path) {
            if let Some(def_obj) = def.as_object_mut() {
                for (k, v) in saved {
                    def_obj.insert(k, v);
                }
            }
        }
        def
    }

    pub fn save_config(&mut self, patch: &Value) -> Value {
        if let (Some(dst), Some(src)) = (self.config.as_object_mut(), patch.as_object()) {
            for (k, v) in src {
                dst.insert(k.clone(), v.clone());
            }
        }
        write_json_atomic(&self.config_path, &self.config);
        self.config.clone()
    }

    pub fn reset_config(&mut self) -> Value {
        self.config = create_default_config();
        write_json_atomic(&self.config_path, &self.config);
        self.config.clone()
    }

    pub fn record_theme_history(&mut self, theme_id: &str) {
        if theme_id.is_empty() {
            return;
        }
        self.library
            .theme_history
            .retain(|h| h.get("themeId").and_then(|v| v.as_str()) != Some(theme_id));
        self.library.theme_history.insert(
            0,
            json!({ "themeId": theme_id, "usedAt": now_ms() }),
        );
        self.library.theme_history.truncate(24);
        self.save_library();
    }

    pub fn save_combo(&mut self, name: Option<&str>) -> Value {
        let clean = name
            .map(str::trim)
            .filter(|s| !s.is_empty())
            .map(|s| s.to_string())
            .unwrap_or_else(|| format!("Combo {}", chrono::Local::now().format("%H:%M")));
        let themes = self.get_all_themes();
        let chat_id = self
            .config
            .get("chatThemeId")
            .and_then(|v| v.as_str())
            .unwrap_or("");
        let active = themes
            .iter()
            .find(|t| t.get("id").and_then(|v| v.as_str()) == Some(chat_id))
            .or_else(|| themes.first());
        let rand_b: [u8; 4] = rand::random();
        let combo = json!({
            "id": format!("combo-{}", hex::encode(rand_b)),
            "name": clean,
            "savedAt": now_ms(),
            "themeId": active.and_then(|t| t.get("id")).and_then(|v| v.as_str()).unwrap_or(chat_id),
            "themeName": active.and_then(|t| t.get("name")).and_then(|v| v.as_str()).unwrap_or("Custom"),
            "snapshot": self.config.clone()
        });
        self.library.saved_combos.insert(0, combo.clone());
        self.library.saved_combos.truncate(30);
        self.save_library();
        combo
    }

    pub fn apply_combo(&mut self, combo_id: &str) -> Option<Value> {
        let combo = self
            .library
            .saved_combos
            .iter()
            .find(|c| c.get("id").and_then(|v| v.as_str()) == Some(combo_id))?
            .clone();
        let mut snap = combo.get("snapshot")?.clone();
        if let Some(obj) = snap.as_object_mut() {
            obj.insert("enabled".into(), json!(true));
        }
        self.save_config(&snap);
        Some(combo)
    }

    pub fn delete_combo(&mut self, combo_id: &str) -> bool {
        let prev = self.library.saved_combos.len();
        self.library
            .saved_combos
            .retain(|c| c.get("id").and_then(|v| v.as_str()) != Some(combo_id));
        if self.library.saved_combos.len() != prev {
            self.save_library();
            true
        } else {
            false
        }
    }

    pub fn get_all_themes(&self) -> Vec<Value> {
        let mut merged: Vec<Value> = Vec::new();
        for list in [
            &self.extra_folder_themes,
            &self.library.user_themes,
            &self.bundled_themes,
            &self.skill_themes,
            &self.starter_scenes,
        ] {
            for t in list {
                let fp = t.get("filePath").and_then(|v| v.as_str()).unwrap_or("");
                if !fp.is_empty() && !Path::new(fp).exists() {
                    continue;
                }
                let mut item = t.clone();
                let id = t.get("id").and_then(|v| v.as_str()).unwrap_or("");
                let poster = t.get("posterPath").and_then(|v| v.as_str()).unwrap_or("");
                let uav = t.get("userAvatarPath").and_then(|v| v.as_str()).unwrap_or("");
                let aav = t.get("agentAvatarPath").and_then(|v| v.as_str()).unwrap_or("");
                if let Some(obj) = item.as_object_mut() {
                    obj.insert(
                        "mediaUrl".into(),
                        json!(if fp.is_empty() {
                            String::new()
                        } else {
                            self.media_server.get_url(&format!("theme:{id}"))
                        }),
                    );
                    obj.insert(
                        "posterUrl".into(),
                        json!(if poster.is_empty() {
                            String::new()
                        } else {
                            self.media_server.get_url(&format!("thumb:{id}"))
                        }),
                    );
                    obj.insert(
                        "userAvatarUrl".into(),
                        json!(if uav.is_empty() {
                            String::new()
                        } else {
                            self.media_server.get_url(&format!("uav:{id}"))
                        }),
                    );
                    obj.insert(
                        "agentAvatarUrl".into(),
                        json!(if aav.is_empty() {
                            String::new()
                        } else {
                            self.media_server.get_url(&format!("aav:{id}"))
                        }),
                    );
                }
                merged.push(item);
            }
        }
        merged
    }

    pub fn get_all_mascots(&self) -> Vec<Value> {
        let mut merged = Vec::new();
        for list in [
            &self.library.user_mascots,
            &self.bundled_mascots,
            &self.starter_mascots,
        ] {
            for m in list {
                let fp = m.get("filePath").and_then(|v| v.as_str()).unwrap_or("");
                if fp.is_empty() || !Path::new(fp).exists() {
                    continue;
                }
                let id = m.get("id").and_then(|v| v.as_str()).unwrap_or("");
                let mut item = m.clone();
                if let Some(obj) = item.as_object_mut() {
                    obj.insert(
                        "mediaUrl".into(),
                        json!(self.media_server.get_url(&format!("mascot:{id}"))),
                    );
                }
                merged.push(item);
            }
        }
        merged
    }

    pub fn get_all_avatars(&self) -> Vec<Value> {
        let mut merged = Vec::new();
        for a in &self.library.user_avatars {
            let fp = a.get("filePath").and_then(|v| v.as_str()).unwrap_or("");
            if !fp.is_empty() && Path::new(fp).exists() {
                merged.push(a.clone());
            }
        }
        for t in &self.skill_themes {
            let tid = t.get("id").and_then(|v| v.as_str()).unwrap_or("");
            let tname = t.get("name").and_then(|v| v.as_str()).unwrap_or("");
            let uav = t.get("userAvatarPath").and_then(|v| v.as_str()).unwrap_or("");
            if !uav.is_empty() && Path::new(uav).exists() {
                merged.push(json!({
                    "id": format!("skill-uav-{tid}"),
                    "name": format!("{tname} (User)"),
                    "filePath": uav,
                    "source": "skill"
                }));
            }
            let aav = t.get("agentAvatarPath").and_then(|v| v.as_str()).unwrap_or("");
            if !aav.is_empty() && Path::new(aav).exists() {
                merged.push(json!({
                    "id": format!("skill-aav-{tid}"),
                    "name": format!("{tname} (AI)"),
                    "filePath": aav,
                    "source": "skill"
                }));
            }
        }
        merged
            .into_iter()
            .map(|mut a| {
                let id = a.get("id").and_then(|v| v.as_str()).unwrap_or("").to_string();
                let fp = a.get("filePath").and_then(|v| v.as_str()).unwrap_or("").to_string();
                if let Some(obj) = a.as_object_mut() {
                    obj.insert(
                        "mediaUrl".into(),
                        json!(if fp.is_empty() {
                            String::new()
                        } else {
                            self.media_server.get_url(&format!("avatar:{id}"))
                        }),
                    );
                }
                a
            })
            .collect()
    }

    pub fn sync_media_registrations(&self) {
        for list in [
            &self.extra_folder_themes,
            &self.library.user_themes,
            &self.bundled_themes,
            &self.skill_themes,
            &self.starter_scenes,
        ] {
            for t in list {
                let id = t.get("id").and_then(|v| v.as_str()).unwrap_or("");
                for (field, prefix) in [
                    ("filePath", "theme"),
                    ("posterPath", "thumb"),
                    ("userAvatarPath", "uav"),
                    ("agentAvatarPath", "aav"),
                ] {
                    if let Some(fp) = t.get(field).and_then(|v| v.as_str()) {
                        let p = Path::new(fp);
                        if !fp.is_empty() && p.exists() {
                            self.media_server.register(&format!("{prefix}:{id}"), p);
                        }
                    }
                }
            }
        }
        for list in [
            &self.library.user_mascots,
            &self.bundled_mascots,
            &self.starter_mascots,
        ] {
            for m in list {
                let id = m.get("id").and_then(|v| v.as_str()).unwrap_or("");
                if let Some(fp) = m.get("filePath").and_then(|v| v.as_str()) {
                    let p = Path::new(fp);
                    if !fp.is_empty() && p.exists() {
                        self.media_server.register(&format!("mascot:{id}"), p);
                    }
                }
            }
        }
        for a in self.get_all_avatars() {
            let id = a.get("id").and_then(|v| v.as_str()).unwrap_or("");
            if let Some(fp) = a.get("filePath").and_then(|v| v.as_str()) {
                let p = Path::new(fp);
                if !fp.is_empty() && p.exists() {
                    self.media_server.register(&format!("avatar:{id}"), p);
                }
            }
        }
        if self.brand_logo_path.exists() {
            self.media_server
                .register("brand:appicon", &self.brand_logo_path);
        }
    }

    pub fn import_theme_files(
        &mut self,
        file_paths: &[PathBuf],
        custom_title: Option<&str>,
        custom_concept: Option<&str>,
        min_bytes: u64,
    ) -> Vec<Value> {
        let mut added = Vec::new();
        let mut existing: HashSet<String> = self
            .library
            .user_themes
            .iter()
            .filter_map(|t| t.get("filePath").and_then(|v| v.as_str()))
            .map(|s| {
                fs::canonicalize(s)
                    .unwrap_or_else(|_| PathBuf::from(s))
                    .to_string_lossy()
                    .to_ascii_lowercase()
            })
            .collect();

        let neon = self
            .config
            .get("neonColor")
            .and_then(|v| v.as_str())
            .unwrap_or("#a855f7")
            .to_string();
        let sec = self
            .config
            .get("neonSecondary")
            .and_then(|v| v.as_str())
            .unwrap_or("#06b6d4")
            .to_string();

        for raw in file_paths {
            if !raw.exists() || !raw.is_file() {
                continue;
            }
            let Some((cat, mtype)) = classify_file(raw) else {
                continue;
            };
            let abs = fs::canonicalize(raw).unwrap_or_else(|_| raw.clone());
            let norm = abs.to_string_lossy().to_ascii_lowercase();
            if existing.contains(&norm) {
                continue;
            }
            let size = fs::metadata(&abs).map(|m| m.len()).unwrap_or(0);
            if min_bytes > 0 && size < min_bytes && ext_lower(&abs) != "svg" {
                continue;
            }
            let id = format!(
                "user-{}",
                md5_hex_10(&format!("{}{}{}", abs.to_string_lossy(), size, now_ms()))
            );
            let name = custom_title
                .filter(|s| !s.trim().is_empty())
                .map(|s| s.to_string())
                .unwrap_or_else(|| {
                    let s = abs
                        .file_stem()
                        .and_then(|x| x.to_str())
                        .unwrap_or("Custom Theme")
                        .replace(['_', '-'], " ")
                        .trim()
                        .to_string();
                    if s.is_empty() {
                        "Custom Theme".to_string()
                    } else {
                        s
                    }
                });
            let entry = json!({
                "id": id,
                "name": name,
                "category": cat,
                "mediaType": mtype,
                "filePath": abs.to_string_lossy().to_string(),
                "fileSize": size,
                "concept": custom_concept.unwrap_or(if mtype == "video" { "Video Wallpaper (Local)" } else { "Hình nền từ máy" }),
                "accent": neon,
                "secondary": sec,
                "overlayRgb": "6, 9, 20",
                "source": "user",
                "addedAt": now_ms()
            });
            self.library.user_themes.insert(0, entry.clone());
            existing.insert(norm);
            added.push(entry);
        }

        if !added.is_empty() {
            self.save_library();
        }
        added
    }

    pub fn scan_folder_for_themes(&mut self, folder: &Path, max_depth: usize) -> Vec<Value> {
        let mut found = Vec::new();
        fn walk(dir: &Path, depth: usize, max_depth: usize, found: &mut Vec<PathBuf>) {
            if depth > max_depth || !dir.exists() {
                return;
            }
            let Ok(entries) = fs::read_dir(dir) else { return };
            for ent in entries.flatten() {
                let p = ent.path();
                if p.is_dir() {
                    let nm = ent.file_name().to_string_lossy().to_string();
                    if nm.starts_with('.') || nm == "node_modules" {
                        continue;
                    }
                    walk(&p, depth + 1, max_depth, found);
                } else if p.is_file() {
                    let low = ent.file_name().to_string_lossy().to_ascii_lowercase();
                    if matches!(low.as_str(), "preview.jpg" | "preview.gif" | "preview.png") {
                        continue;
                    }
                    if classify_file(&p).is_some() {
                        found.push(p);
                    }
                }
            }
        }
        walk(folder, 0, max_depth, &mut found);
        self.import_theme_files(&found, None, None, 25 * 1024)
    }

    pub fn delete_user_theme(&mut self, theme_id: &str) -> bool {
        let Some(idx) = self
            .library
            .user_themes
            .iter()
            .position(|t| t.get("id").and_then(|v| v.as_str()) == Some(theme_id))
        else {
            return false;
        };
        let mut removed = self.library.user_themes.remove(idx);
        if let Some(obj) = removed.as_object_mut() {
            obj.insert("deletedAt".into(), json!(now_ms()));
        }
        self.library.trash_themes.insert(0, removed);
        self.library.trash_themes.truncate(50);

        let next_pl: Vec<Value> = self
            .config
            .get("playlistIds")
            .and_then(|v| v.as_array())
            .cloned()
            .unwrap_or_default()
            .into_iter()
            .filter(|id| id.as_str() != Some(theme_id))
            .collect();
        self.save_library();
        self.save_config(&json!({ "playlistIds": next_pl }));
        true
    }

    pub fn restore_trash_theme(&mut self, theme_id: &str) -> bool {
        let Some(idx) = self
            .library
            .trash_themes
            .iter()
            .position(|t| t.get("id").and_then(|v| v.as_str()) == Some(theme_id))
        else {
            return false;
        };
        let mut item = self.library.trash_themes.remove(idx);
        if let Some(obj) = item.as_object_mut() {
            obj.remove("deletedAt");
        }
        self.library.user_themes.insert(0, item);
        self.save_library();
        true
    }

    pub fn delete_trash_forever(&mut self, theme_id: &str) -> bool {
        let prev = self.library.trash_themes.len();
        self.library
            .trash_themes
            .retain(|t| t.get("id").and_then(|v| v.as_str()) != Some(theme_id));
        if self.library.trash_themes.len() != prev {
            self.save_library();
            true
        } else {
            false
        }
    }

    pub fn empty_trash(&mut self) {
        self.library.trash_themes.clear();
        self.save_library();
    }

    pub fn import_mascot_file(&mut self, file_path: &Path) -> Option<Value> {
        if !file_path.exists() {
            return None;
        }
        let ext = ext_lower(file_path);
        if !is_static_img_ext(&ext) && !is_anim_img_ext(&ext) && !is_video_ext(&ext) {
            return None;
        }
        let rand_b: [u8; 5] = rand::random();
        let id = format!("umascot-{}", hex::encode(rand_b));
        let dest = self.custom_assets_dir.join(format!("{id}.{ext}"));
        fs::copy(file_path, &dest).ok()?;
        let name = file_path
            .file_stem()
            .and_then(|s| s.to_str())
            .unwrap_or("Sticker")
            .replace(['_', '-'], " ")
            .trim()
            .to_string();
        let entry = json!({
            "id": id,
            "name": if name.is_empty() { "Sticker".to_string() } else { name },
            "filePath": dest.to_string_lossy().to_string(),
            "source": "user"
        });
        self.library.user_mascots.insert(0, entry.clone());
        self.save_library();
        let mut out = entry;
        if let Some(obj) = out.as_object_mut() {
            obj.insert(
                "mediaUrl".into(),
                json!(self.media_server.get_url(&format!("mascot:{id}"))),
            );
        }
        Some(out)
    }

    pub fn delete_user_mascot(&mut self, mascot_id: &str) -> bool {
        let prev = self.library.user_mascots.len();
        self.library
            .user_mascots
            .retain(|m| m.get("id").and_then(|v| v.as_str()) != Some(mascot_id));
        if self.library.user_mascots.len() != prev {
            self.save_library();
            true
        } else {
            false
        }
    }

    pub fn import_avatar_file(&mut self, file_path: &Path, role: &str) -> Option<Value> {
        if !file_path.exists() {
            return None;
        }
        let ext = ext_lower(file_path);
        if !is_static_img_ext(&ext) && !is_anim_img_ext(&ext) {
            return None;
        }
        let rand_b: [u8; 4] = rand::random();
        let id = format!("uav-{role}-{}", hex::encode(rand_b));
        let dest = self.custom_assets_dir.join(format!("{id}.{ext}"));
        fs::copy(file_path, &dest).ok()?;
        let name = file_path
            .file_stem()
            .and_then(|s| s.to_str())
            .unwrap_or("Avatar")
            .replace(['_', '-'], " ")
            .trim()
            .to_string();
        let entry = json!({
            "id": id,
            "name": if name.is_empty() { "Avatar".to_string() } else { name },
            "filePath": dest.to_string_lossy().to_string(),
            "role": role,
            "source": "user"
        });
        self.library.user_avatars.insert(0, entry.clone());
        self.save_library();
        if role == "user" {
            self.save_config(&json!({ "userAvatarId": id }));
        } else if role == "agent" {
            self.save_config(&json!({ "agentAvatarId": id }));
        }
        let mut out = entry;
        if let Some(obj) = out.as_object_mut() {
            obj.insert(
                "mediaUrl".into(),
                json!(self.media_server.get_url(&format!("avatar:{id}"))),
            );
        }
        Some(out)
    }

    pub fn build_runtime_payload_state(&self) -> Value {
        let themes = self.get_all_themes();
        let mascots = self.get_all_mascots();
        let avatars = self.get_all_avatars();

        let find_theme = |id: &str| -> Value {
            themes
                .iter()
                .find(|t| t.get("id").and_then(|v| v.as_str()) == Some(id))
                .or_else(|| themes.first())
                .cloned()
                .unwrap_or(Value::Null)
        };
        let chat_id = self.config.get("chatThemeId").and_then(|v| v.as_str()).unwrap_or("");
        let ide_id = self.config.get("ideThemeId").and_then(|v| v.as_str()).unwrap_or("");
        let mascot_id = self.config.get("mascotId").and_then(|v| v.as_str()).unwrap_or("");
        let uav_id = self.config.get("userAvatarId").and_then(|v| v.as_str()).unwrap_or("");
        let aav_id = self.config.get("agentAvatarId").and_then(|v| v.as_str()).unwrap_or("");

        let chat_theme = find_theme(chat_id);
        let ide_theme = find_theme(ide_id);
        let mascot = mascots
            .iter()
            .find(|m| m.get("id").and_then(|v| v.as_str()) == Some(mascot_id))
            .or_else(|| mascots.first())
            .cloned()
            .unwrap_or(Value::Null);

        let user_av = avatars
            .iter()
            .find(|a| a.get("id").and_then(|v| v.as_str()) == Some(uav_id))
            .and_then(|a| a.get("mediaUrl"))
            .and_then(|v| v.as_str())
            .map(|s| s.to_string())
            .unwrap_or_else(|| {
                chat_theme
                    .get("userAvatarUrl")
                    .and_then(|v| v.as_str())
                    .unwrap_or("")
                    .to_string()
            });

        let agent_av = avatars
            .iter()
            .find(|a| a.get("id").and_then(|v| v.as_str()) == Some(aav_id))
            .and_then(|a| a.get("mediaUrl"))
            .and_then(|v| v.as_str())
            .map(|s| s.to_string())
            .unwrap_or_else(|| {
                chat_theme
                    .get("agentAvatarUrl")
                    .and_then(|v| v.as_str())
                    .unwrap_or("")
                    .to_string()
            });

        let logo_url = if self.brand_logo_path.exists() {
            self.media_server.get_url("brand:appicon")
        } else {
            String::new()
        };

        json!({
            "config": self.config,
            "chatTheme": chat_theme,
            "ideTheme": ide_theme,
            "mascot": mascot,
            "appLogoUrl": logo_url,
            "userAvatarUrl": user_av,
            "agentAvatarUrl": agent_av,
            "mediaServerPort": self.media_server.port(),
            "ts": now_ms()
        })
    }

    pub fn get_full_state_for_ui(&self) -> Value {
        let themes = self.get_all_themes();
        let theme_map: HashMap<String, &Value> = themes
            .iter()
            .filter_map(|t| {
                t.get("id")
                    .and_then(|v| v.as_str())
                    .map(|id| (id.to_string(), t))
            })
            .collect();

        let saved_combos: Vec<Value> = self
            .library
            .saved_combos
            .iter()
            .map(|c| {
                let mut item = c.clone();
                let tid = c
                    .get("themeId")
                    .and_then(|v| v.as_str())
                    .or_else(|| {
                        c.get("snapshot")
                            .and_then(|s| s.get("chatThemeId"))
                            .and_then(|v| v.as_str())
                    })
                    .unwrap_or("");
                let th = theme_map.get(tid).copied();
                if let Some(obj) = item.as_object_mut() {
                    obj.insert(
                        "mediaUrl".into(),
                        json!(th.and_then(|t| t.get("mediaUrl")).and_then(|v| v.as_str()).unwrap_or("")),
                    );
                    obj.insert(
                        "posterUrl".into(),
                        json!(th.and_then(|t| t.get("posterUrl")).and_then(|v| v.as_str()).unwrap_or("")),
                    );
                    obj.insert(
                        "mediaType".into(),
                        json!(th.and_then(|t| t.get("mediaType")).and_then(|v| v.as_str()).unwrap_or("image")),
                    );
                }
                item
            })
            .collect();

        let theme_history: Vec<Value> = self
            .library
            .theme_history
            .iter()
            .filter_map(|h| {
                let tid = h.get("themeId").and_then(|v| v.as_str())?;
                let th = theme_map.get(tid)?;
                let mut obj = h.as_object()?.clone();
                obj.insert("theme".into(), (*th).clone());
                Some(Value::Object(obj))
            })
            .collect();

        let trash_themes: Vec<Value> = self
            .library
            .trash_themes
            .iter()
            .map(|t| {
                let mut item = t.clone();
                let id = t.get("id").and_then(|v| v.as_str()).unwrap_or("");
                let fp = t.get("filePath").and_then(|v| v.as_str()).unwrap_or("");
                if let Some(obj) = item.as_object_mut() {
                    obj.insert(
                        "mediaUrl".into(),
                        json!(if !fp.is_empty() && Path::new(fp).exists() {
                            self.media_server.get_url(&format!("theme:{id}"))
                        } else {
                            String::new()
                        }),
                    );
                }
                item
            })
            .collect();

        let logo_url = if self.brand_logo_path.exists() {
            self.media_server.get_url("brand:appicon")
        } else {
            String::new()
        };

        json!({
            "config": self.config,
            "themes": themes,
            "trashThemes": trash_themes,
            "mascots": self.get_all_mascots(),
            "avatars": self.get_all_avatars(),
            "savedCombos": saved_combos,
            "themeHistory": theme_history,
            "appLogoUrl": logo_url,
            "extraThemesDir": self.extra_themes_dir.to_string_lossy().to_string(),
            "mediaServerPort": self.media_server.port()
        })
    }

    pub fn export_backup_json(&self) -> String {
        serde_json::to_string_pretty(&json!({
            "version": "12.0.0-rust",
            "exportedAt": chrono::Utc::now().to_rfc3339(),
            "config": self.config,
            "userThemes": self.library.user_themes
        }))
        .unwrap_or_else(|_| "{}".to_string())
    }

    pub fn import_backup_json(&mut self, raw_text: &str) -> Result<Value, String> {
        let parsed: Value = serde_json::from_str(raw_text).map_err(|e| e.to_string())?;
        if !parsed.is_object() {
            return Err("JSON không hợp lệ".to_string());
        }
        if let Some(cfg) = parsed.get("config") {
            if cfg.is_object() {
                self.save_config(cfg);
            }
        }
        if let Some(arr) = parsed.get("userThemes").and_then(|v| v.as_array()) {
            let paths: Vec<PathBuf> = arr
                .iter()
                .filter_map(|t| t.get("filePath").and_then(|v| v.as_str()))
                .map(PathBuf::from)
                .collect();
            if !paths.is_empty() {
                self.import_theme_files(&paths, None, None, 0);
            }
        }
        Ok(self.get_full_state_for_ui())
    }
}
