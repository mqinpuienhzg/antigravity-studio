use serde_json::{json, Map, Value};
use std::{
    fs,
    path::{Path, PathBuf},
    process::Command,
};

#[cfg(windows)]
use std::os::windows::process::CommandExt;

#[cfg(windows)]
const CREATE_NO_WINDOW: u32 = 0x0800_0000;

pub fn strip_jsonc(text: &str) -> String {
    let s = text.strip_prefix('\u{feff}').unwrap_or(text);
    let chars: Vec<char> = s.chars().collect();
    let mut out = String::with_capacity(s.len());
    let mut i = 0usize;
    let mut in_str = false;
    let mut escape = false;
    let mut in_line_comment = false;
    let mut in_block_comment = false;

    while i < chars.len() {
        let ch = chars[i];
        let next = chars.get(i + 1).copied();
        if in_line_comment {
            if ch == '\n' {
                in_line_comment = false;
                out.push(ch);
            }
            i += 1;
            continue;
        }
        if in_block_comment {
            if ch == '*' && next == Some('/') {
                in_block_comment = false;
                i += 2;
                continue;
            }
            i += 1;
            continue;
        }
        if in_str {
            out.push(ch);
            if escape {
                escape = false;
            } else if ch == '\\' {
                escape = true;
            } else if ch == '"' {
                in_str = false;
            }
            i += 1;
            continue;
        }
        if ch == '"' {
            in_str = true;
            out.push(ch);
            i += 1;
            continue;
        }
        if ch == '/' && next == Some('/') {
            in_line_comment = true;
            i += 2;
            continue;
        }
        if ch == '/' && next == Some('*') {
            in_block_comment = true;
            i += 2;
            continue;
        }
        out.push(ch);
        i += 1;
    }

    // Strip trailing commas before '}' or ']'
    let out_chars: Vec<char> = out.chars().collect();
    let mut clean = String::with_capacity(out.len());
    let mut k = 0usize;
    let mut in_s = false;
    let mut esc = false;
    while k < out_chars.len() {
        let c = out_chars[k];
        if in_s {
            clean.push(c);
            if esc {
                esc = false;
            } else if c == '\\' {
                esc = true;
            } else if c == '"' {
                in_s = false;
            }
            k += 1;
            continue;
        }
        if c == '"' {
            in_s = true;
            clean.push(c);
            k += 1;
            continue;
        }
        if c == ',' {
            let mut look = k + 1;
            while look < out_chars.len() && out_chars[look].is_whitespace() {
                look += 1;
            }
            if look < out_chars.len() && (out_chars[look] == '}' || out_chars[look] == ']') {
                k += 1;
                continue;
            }
        }
        clean.push(c);
        k += 1;
    }
    clean
}

/// Permanently registers `"remote-debugging-port": "0"` inside `~/.antigravity-ide/argv.json`
pub fn sync_ide_argv_json() -> Vec<String> {
    let Some(home) = dirs::home_dir() else {
        return Vec::new();
    };
    let mut targets = vec![home.join(".antigravity-ide").join("argv.json")];
    let legacy_dir = home.join(".antigravity");
    if legacy_dir.exists() {
        targets.push(legacy_dir.join("argv.json"));
    }

    let mut updated = Vec::new();
    for argv_path in targets {
        if let Some(parent) = argv_path.parent() {
            let _ = fs::create_dir_all(parent);
        }
        if !argv_path.exists() {
            let fresh = "{\n\t\"remote-debugging-port\": \"0\"\n}\n";
            if fs::write(&argv_path, fresh).is_ok() {
                updated.push(argv_path.to_string_lossy().to_string());
            }
            continue;
        }

        let Ok(raw) = fs::read_to_string(&argv_path) else {
            continue;
        };
        let stripped = strip_jsonc(&raw);
        let Ok(mut parsed) = serde_json::from_str::<Value>(if stripped.trim().is_empty() {
            "{}"
        } else {
            &stripped
        }) else {
            continue;
        };

        let Some(obj) = parsed.as_object_mut() else {
            continue;
        };
        if obj.get("remote-debugging-port").and_then(|v| v.as_str()) == Some("0") {
            continue;
        }

        obj.insert("remote-debugging-port".to_string(), Value::String("0".to_string()));
        if let Ok(serialized) = serde_json::to_string_pretty(&parsed) {
            let tmp_path = argv_path.with_extension("json.studio.tmp");
            if fs::write(&tmp_path, format!("{serialized}\n")).is_ok() {
                if fs::rename(&tmp_path, &argv_path).is_err() {
                    let _ = fs::write(&argv_path, format!("{serialized}\n"));
                    let _ = fs::remove_file(&tmp_path);
                }
                updated.push(argv_path.to_string_lossy().to_string());
            }
        }
    }
    updated
}

fn parse_rgb_triple(rgb_str: &str, fallback: [f64; 3]) -> [f64; 3] {
    let parts: Vec<f64> = rgb_str
        .split(',')
        .filter_map(|s| s.trim().parse::<f64>().ok())
        .collect();
    if parts.len() == 3 {
        [
            parts[0].clamp(0.0, 255.0),
            parts[1].clamp(0.0, 255.0),
            parts[2].clamp(0.0, 255.0),
        ]
    } else {
        fallback
    }
}

fn parse_hex_triple(hex_str: &str, fallback: [f64; 3]) -> [f64; 3] {
    let clean = hex_str.trim().trim_start_matches('#');
    let full = if clean.len() == 3 {
        clean
            .chars()
            .flat_map(|c| [c, c])
            .collect::<String>()
    } else {
        clean.to_string()
    };
    if let Ok(n) = u32::from_str_radix(&full, 16) {
        [
            ((n >> 16) & 255) as f64,
            ((n >> 8) & 255) as f64,
            (n & 255) as f64,
        ]
    } else {
        fallback
    }
}

fn to_hex_color(r: f64, g: f64, b: f64) -> String {
    format!(
        "#{:02x}{:02x}{:02x}",
        r.round().clamp(0.0, 255.0) as u8,
        g.round().clamp(0.0, 255.0) as u8,
        b.round().clamp(0.0, 255.0) as u8
    )
}

fn compute_matched_titlebar_colors(cfg: &Value, active_theme: Option<&Value>) -> (String, String) {
    let is_light = cfg.get("isLightMode").and_then(|v| v.as_bool()).unwrap_or(false);
    let ov_str = if is_light {
        "240, 244, 252"
    } else {
        active_theme
            .and_then(|t| t.get("overlayRgb"))
            .and_then(|v| v.as_str())
            .unwrap_or("12, 7, 24")
    };
    let neon_str = cfg
        .get("neonColor")
        .and_then(|v| v.as_str())
        .or_else(|| active_theme.and_then(|t| t.get("accent")).and_then(|v| v.as_str()))
        .unwrap_or("#818cf8");

    let ov = parse_rgb_triple(ov_str, [10.0, 8.0, 24.0]);
    let neon = parse_hex_triple(neon_str, [129.0, 140.0, 248.0]);
    let mix = if is_light { 0.04 } else { 0.06 };
    let r = ov[0] * (1.0 - mix) + neon[0] * mix;
    let g = ov[1] * (1.0 - mix) + neon[1] * mix;
    let b = ov[2] * (1.0 - mix) + neon[2] * mix;
    (
        to_hex_color(r, g, b),
        if is_light {
            "#0f172a".to_string()
        } else {
            "#f1f5f9".to_string()
        },
    )
}

pub fn sync_ide_window_settings(payload_state: &Value, force_restore: bool) {
    let Some(app_data) = dirs::config_dir() else {
        return;
    };
    let candidates = [
        app_data.join("Antigravity IDE").join("User").join("settings.json"),
        app_data.join("Antigravity").join("User").join("settings.json"),
    ];

    let cfg = payload_state.get("config").unwrap_or(&Value::Null);
    let enabled = cfg.get("enabled").and_then(|v| v.as_bool()).unwrap_or(false);
    let apply_ide = cfg.get("applyToIde").and_then(|v| v.as_bool()).unwrap_or(true);
    let sync_wc = cfg
        .get("syncWindowControls")
        .and_then(|v| v.as_bool())
        .unwrap_or(true);
    let active = !force_restore && enabled && apply_ide && sync_wc;

    let unified = cfg
        .get("unifiedFullWindow")
        .and_then(|v| v.as_bool())
        .unwrap_or(true);
    let active_theme = if unified {
        payload_state.get("chatTheme").or_else(|| payload_state.get("ideTheme"))
    } else {
        payload_state.get("ideTheme").or_else(|| payload_state.get("chatTheme"))
    };
    let (bg_hex, fg_hex) = compute_matched_titlebar_colors(cfg, active_theme);

    let managed_keys = [
        "titleBar.activeBackground",
        "titleBar.inactiveBackground",
        "titleBar.activeForeground",
        "titleBar.inactiveForeground",
        "editor.background",
        "sideBar.background",
        "activityBar.background",
        "statusBar.background",
        "panel.background",
        "terminal.background",
    ];

    for settings_path in candidates {
        if !settings_path.exists() {
            continue;
        }
        let Ok(raw_text) = fs::read_to_string(&settings_path) else {
            continue;
        };
        let cleaned = strip_jsonc(&raw_text);
        let Ok(mut parsed) = serde_json::from_str::<Value>(if cleaned.trim().is_empty() {
            "{}"
        } else {
            &cleaned
        }) else {
            continue;
        };
        let Some(root) = parsed.as_object_mut() else {
            continue;
        };

        let mut changed = false;
        let mut cc = root
            .get("workbench.colorCustomizations")
            .and_then(|v| v.as_object())
            .cloned()
            .unwrap_or_else(Map::new);

        if active {
            if root.get("window.controlsStyle").and_then(|v| v.as_str()) != Some("custom") {
                root.insert("window.controlsStyle".into(), Value::String("custom".into()));
                changed = true;
            }
            if root
                .get("terminal.integrated.gpuAcceleration")
                .and_then(|v| v.as_str())
                != Some("off")
            {
                root.insert(
                    "terminal.integrated.gpuAcceleration".into(),
                    Value::String("off".into()),
                );
                changed = true;
            }
            let desired = [
                ("titleBar.activeBackground", bg_hex.as_str()),
                ("titleBar.inactiveBackground", bg_hex.as_str()),
                ("titleBar.activeForeground", fg_hex.as_str()),
                ("titleBar.inactiveForeground", fg_hex.as_str()),
                ("editor.background", bg_hex.as_str()),
                ("sideBar.background", bg_hex.as_str()),
                ("activityBar.background", bg_hex.as_str()),
                ("statusBar.background", bg_hex.as_str()),
                ("panel.background", "#00000000"),
                ("terminal.background", "#00000000"),
            ];
            for (k, v) in desired {
                if cc.get(k).and_then(|x| x.as_str()) != Some(v) {
                    cc.insert(k.to_string(), Value::String(v.to_string()));
                    changed = true;
                }
            }
            if changed {
                root.insert("workbench.colorCustomizations".into(), Value::Object(cc));
            }
        } else {
            if root
                .get("terminal.integrated.gpuAcceleration")
                .and_then(|v| v.as_str())
                == Some("off")
            {
                root.remove("terminal.integrated.gpuAcceleration");
                changed = true;
            }
            for k in managed_keys {
                if cc.remove(k).is_some() {
                    changed = true;
                }
            }
            if cc.is_empty() {
                if root.remove("workbench.colorCustomizations").is_some() {
                    changed = true;
                }
            } else if changed {
                root.insert("workbench.colorCustomizations".into(), Value::Object(cc));
            }
            if root.get("window.controlsStyle").and_then(|v| v.as_str()) == Some("custom") {
                root.remove("window.controlsStyle");
                changed = true;
            }
        }

        if changed {
            if let Ok(out) = serde_json::to_string_pretty(&parsed) {
                let _ = fs::write(&settings_path, out);
            }
        }
    }
}

#[cfg(windows)]
pub fn sync_windows_auto_start(enable: bool) -> Result<(), String> {
    use winreg::enums::*;
    use winreg::RegKey;

    let hkcu = RegKey::predef(HKEY_CURRENT_USER);
    let (run_key, _) = hkcu
        .create_subkey("Software\\Microsoft\\Windows\\CurrentVersion\\Run")
        .map_err(|e| e.to_string())?;
    const VAL_NAME: &str = "AntigravityStudioRust";

    if enable {
        let exe = std::env::current_exe().map_err(|e| e.to_string())?;
        let quoted = format!("\"{}\" --tray", exe.to_string_lossy());
        run_key
            .set_value(VAL_NAME, &quoted)
            .map_err(|e| e.to_string())?;
    } else {
        let _ = run_key.delete_value(VAL_NAME);
    }
    Ok(())
}

#[cfg(not(windows))]
pub fn sync_windows_auto_start(_enable: bool) -> Result<(), String> {
    Ok(())
}

pub fn patch_windows_shortcuts_for_cdp() -> Value {
    let argv_updated = sync_ide_argv_json();
    #[cfg(not(windows))]
    {
        return json!({
            "ok": true,
            "argvUpdated": argv_updated,
            "message": "Đã bật CDP vĩnh viễn trong ~/.antigravity-ide/argv.json."
        });
    }

    #[cfg(windows)]
    {
        let ps = r#"
$Wsh = New-Object -ComObject WScript.Shell
$Dirs = @(
  [Environment]::GetFolderPath('DesktopDirectory'),
  [Environment]::GetFolderPath('Programs'),
  [Environment]::GetFolderPath('Startup'),
  (Join-Path $env:APPDATA 'Microsoft\Internet Explorer\Quick Launch\User Pinned\TaskBar')
) | Where-Object { $_ -and (Test-Path $_) }
$Patched = @()
foreach ($d in $Dirs) {
  Get-ChildItem -Path $d -Recurse -Filter '*.lnk' -ErrorAction SilentlyContinue | ForEach-Object {
    try {
      $sc = $Wsh.CreateShortcut($_.FullName)
      if ($sc.TargetPath -and ($sc.TargetPath -imatch '\\Antigravity(?: IDE)?\.exe$')) {
        if ($sc.Arguments -notmatch '--remote-debugging-port') {
          $sc.Arguments = ("$($sc.Arguments) --remote-debugging-port=0").Trim()
          $sc.Save()
          $Patched += $_.FullName
        }
      }
    } catch {}
  }
}
Write-Output ($Patched -join '|')
"#;
        let output = Command::new("powershell.exe")
            .args(["-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", ps])
            .creation_flags(CREATE_NO_WINDOW)
            .output();

        match output {
            Ok(o) => {
                let stdout = String::from_utf8_lossy(&o.stdout);
                let patched: Vec<String> = stdout
                    .trim()
                    .split('|')
                    .filter(|s| !s.is_empty())
                    .map(|s| s.to_string())
                    .collect();
                let msg = if !patched.is_empty() || !argv_updated.is_empty() {
                    format!(
                        "Đã khóa CDP vĩnh viễn trong argv.json{}!",
                        if !patched.is_empty() {
                            format!(" và {} shortcut", patched.len())
                        } else {
                            String::new()
                        }
                    )
                } else {
                    "argv.json & các shortcut Antigravity đã sẵn sàng cờ CDP vĩnh viễn.".to_string()
                };
                json!({
                    "ok": true,
                    "patched": patched,
                    "argvUpdated": argv_updated,
                    "message": msg
                })
            }
            Err(e) => json!({
                "ok": !argv_updated.is_empty(),
                "argvUpdated": argv_updated,
                "message": if !argv_updated.is_empty() {
                    "Đã bật CDP vĩnh viễn trong argv.json.".to_string()
                } else {
                    e.to_string()
                }
            }),
        }
    }
}

pub fn find_antigravity_exe() -> Option<PathBuf> {
    let local_app = dirs::data_local_dir()?;
    let candidates = [
        local_app
            .join("Programs")
            .join("Antigravity IDE")
            .join("Antigravity IDE.exe"),
        local_app
            .join("Programs")
            .join("Antigravity")
            .join("Antigravity.exe"),
    ];
    candidates.into_iter().find(|p| p.exists())
}

pub async fn restart_antigravity_with_cdp(payload_state: &Value) -> Value {
    sync_ide_argv_json();
    let enabled = payload_state
        .get("config")
        .and_then(|c| c.get("enabled"))
        .and_then(|v| v.as_bool())
        .unwrap_or(false);
    if enabled {
        sync_ide_window_settings(payload_state, false);
    }

    let Some(exe) = find_antigravity_exe() else {
        return json!({ "ok": false, "message": "Không tìm thấy file cài đặt Antigravity IDE.exe." });
    };
    let exe_name = exe
        .file_name()
        .and_then(|s| s.to_str())
        .unwrap_or("Antigravity IDE.exe")
        .to_string();

    #[cfg(windows)]
    {
        let _ = Command::new("taskkill")
            .args(["/IM", &exe_name, "/F"])
            .creation_flags(CREATE_NO_WINDOW)
            .output();
    }

    tokio::time::sleep(std::time::Duration::from_millis(900)).await;

    let mut cmd = Command::new(&exe);
    cmd.arg("--remote-debugging-port=0");
    match cmd.spawn() {
        Ok(_) => json!({ "ok": true, "message": format!("Đã khởi động lại {exe_name} với CDP.") }),
        Err(e) => json!({ "ok": false, "message": e.to_string() }),
    }
}

pub fn open_folder_in_shell(dir: &Path) -> Result<(), String> {
    #[cfg(windows)]
    {
        Command::new("explorer.exe")
            .arg(dir)
            .spawn()
            .map_err(|e| e.to_string())?;
        Ok(())
    }
    #[cfg(not(windows))]
    {
        let _ = dir;
        Ok(())
    }
}
