use futures_util::StreamExt;
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use std::{
    fs,
    path::{Path, PathBuf},
    process::Stdio,
};
use tokio::{
    io::{AsyncBufReadExt, AsyncWriteExt, BufReader},
    process::Command,
};
use url::Url;

#[cfg(windows)]
const CREATE_NO_WINDOW: u32 = 0x0800_0000;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct OnlineBinaries {
    pub ytdlp: String,
    pub has_ytdlp: bool,
    pub ffmpeg: String,
    pub has_ffmpeg: bool,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DownloadRequest {
    pub url: String,
    #[serde(default)]
    pub title: Option<String>,
    #[serde(default)]
    pub quality: Option<String>,
    #[serde(default)]
    pub duration_sec: Option<u64>,
    #[serde(default)]
    pub start_sec: Option<u64>,
    #[serde(default)]
    pub keep_audio: Option<bool>,
    #[serde(default)]
    pub apply_target: Option<String>,
}

pub fn resolve_binaries(resource_dir: Option<&Path>) -> OnlineBinaries {
    let mut ytdlp_candidates: Vec<PathBuf> = Vec::new();
    let mut ffmpeg_candidates: Vec<PathBuf> = Vec::new();

    if let Ok(exe) = std::env::current_exe() {
        if let Some(dir) = exe.parent() {
            ytdlp_candidates.push(dir.join("bin").join("yt-dlp.exe"));
            ffmpeg_candidates.push(dir.join("bin").join("ffmpeg.exe"));
            if let Some(parent) = dir.parent() {
                ytdlp_candidates.push(parent.join("bin").join("yt-dlp.exe"));
                ffmpeg_candidates.push(parent.join("bin").join("ffmpeg.exe"));
            }
        }
    }
    if let Ok(cwd) = std::env::current_dir() {
        ytdlp_candidates.push(cwd.join("bin").join("yt-dlp.exe"));
        ytdlp_candidates.push(cwd.join("..").join("bin").join("yt-dlp.exe"));
        ffmpeg_candidates.push(cwd.join("bin").join("ffmpeg.exe"));
        ffmpeg_candidates.push(cwd.join("..").join("bin").join("ffmpeg.exe"));
    }
    if let Some(res) = resource_dir {
        ytdlp_candidates.push(res.join("bin").join("yt-dlp.exe"));
        ffmpeg_candidates.push(res.join("bin").join("ffmpeg.exe"));
    }

    let ytdlp_found = ytdlp_candidates.into_iter().find(|p| p.exists());
    let ffmpeg_found = ffmpeg_candidates.into_iter().find(|p| p.exists());

    let has_ytdlp = ytdlp_found.is_some();
    let has_ffmpeg = ffmpeg_found.is_some();

    OnlineBinaries {
        ytdlp: ytdlp_found
            .map(|p| p.to_string_lossy().to_string())
            .unwrap_or_else(|| "yt-dlp".to_string()),
        has_ytdlp,
        ffmpeg: ffmpeg_found
            .map(|p| p.to_string_lossy().to_string())
            .unwrap_or_default(),
        has_ffmpeg,
    }
}

fn is_streaming_url(raw: &str) -> bool {
    let low = raw.to_ascii_lowercase();
    [
        "youtube.com",
        "youtu.be",
        "vimeo.com",
        "tiktok.com",
        "bilibili.com",
        "twitter.com",
        "x.com",
    ]
    .iter()
    .any(|d| low.contains(d))
}

fn format_duration(sec: f64) -> String {
    let s = sec.round() as u64;
    if s == 0 {
        return String::new();
    }
    format!("{}:{:02}", s / 60, s % 60)
}

async fn run_capture(exe: &str, args: &[String], timeout_secs: u64) -> Result<String, String> {
    let mut cmd = Command::new(exe);
    cmd.args(args)
        .stdout(Stdio::piped())
        .stderr(Stdio::piped());
    #[cfg(windows)]
    cmd.creation_flags(CREATE_NO_WINDOW);

    let fut = cmd.output();
    let output = tokio::time::timeout(std::time::Duration::from_secs(timeout_secs), fut)
        .await
        .map_err(|_| "Hết thời gian chờ khi kết nối Internet.".to_string())?
        .map_err(|e| e.to_string())?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        let stdout = String::from_utf8_lossy(&output.stdout);
        let msg = if !stderr.trim().is_empty() {
            stderr.trim().to_string()
        } else if !stdout.trim().is_empty() {
            stdout.trim().to_string()
        } else {
            format!("Exit code {:?}", output.status.code())
        };
        return Err(msg.chars().take(400).collect());
    }
    Ok(String::from_utf8_lossy(&output.stdout).to_string())
}

pub async fn search_youtube(
    query: &str,
    limit: usize,
    bins: &OnlineBinaries,
) -> Result<Vec<Value>, String> {
    let clean_q = query.trim();
    if clean_q.is_empty() {
        return Ok(Vec::new());
    }
    let lim = limit.clamp(1, 12);
    let args = vec![
        "--flat-playlist".to_string(),
        "--dump-json".to_string(),
        "--no-warnings".to_string(),
        "--skip-download".to_string(),
        format!("ytsearch{lim}:{clean_q}"),
    ];
    let out = run_capture(&bins.ytdlp, &args, 25).await?;
    let mut items = Vec::new();
    for line in out.lines().map(str::trim).filter(|l| !l.is_empty()) {
        if let Ok(obj) = serde_json::from_str::<Value>(line) {
            let id = obj
                .get("id")
                .and_then(|v| v.as_str())
                .unwrap_or_default()
                .to_string();
            let thumb = obj
                .get("thumbnails")
                .and_then(|v| v.as_array())
                .and_then(|arr| arr.last())
                .and_then(|t| t.get("url"))
                .and_then(|v| v.as_str())
                .map(|s| s.to_string())
                .filter(|s| !s.is_empty())
                .unwrap_or_else(|| {
                    if id.is_empty() {
                        String::new()
                    } else {
                        format!("https://i.ytimg.com/vi/{id}/hqdefault.jpg")
                    }
                });
            let url = obj
                .get("url")
                .and_then(|v| v.as_str())
                .filter(|u| u.starts_with("http"))
                .map(|s| s.to_string())
                .unwrap_or_else(|| format!("https://www.youtube.com/watch?v={id}"));
            let dur = obj.get("duration").and_then(|v| v.as_f64()).unwrap_or(0.0);
            let dur_str = obj
                .get("duration_string")
                .and_then(|v| v.as_str())
                .map(|s| s.to_string())
                .unwrap_or_else(|| format_duration(dur));
            let channel = obj
                .get("channel")
                .or_else(|| obj.get("uploader"))
                .and_then(|v| v.as_str())
                .unwrap_or("YouTube");
            items.push(json!({
                "id": id,
                "title": obj.get("title").and_then(|v| v.as_str()).unwrap_or("YouTube Video"),
                "url": url,
                "thumbnail": thumb,
                "duration": dur,
                "durationString": dur_str,
                "channel": channel,
            }));
        }
    }
    Ok(items)
}

pub async fn inspect_url(url_raw: &str, bins: &OnlineBinaries) -> Result<Value, String> {
    let clean = url_raw.trim();
    if !clean.starts_with("http://") && !clean.starts_with("https://") {
        return Err("Link phải bắt đầu bằng http:// hoặc https://".to_string());
    }
    if !is_streaming_url(clean) {
        let u = Url::parse(clean).map_err(|e| e.to_string())?;
        let fname = u
            .path_segments()
            .and_then(|s| s.last())
            .filter(|s| !s.is_empty())
            .unwrap_or("Internet Media");
        let decoded = urlencoding::decode(fname)
            .map(|c| c.into_owned())
            .unwrap_or_else(|_| fname.to_string());
        let title = Path::new(&decoded)
            .file_stem()
            .and_then(|s| s.to_str())
            .unwrap_or("Internet Media")
            .to_string();
        let low = u.path().to_ascii_lowercase();
        let is_img = [".png", ".jpg", ".jpeg", ".webp", ".gif", ".svg"]
            .iter()
            .any(|e| low.ends_with(e));
        return Ok(json!({
            "title": title,
            "url": clean,
            "thumbnail": if is_img { clean } else { "" },
            "duration": 0,
            "durationString": "Direct URL",
            "isDirect": true
        }));
    }

    let args = vec![
        "--dump-single-json".to_string(),
        "--no-playlist".to_string(),
        "--no-warnings".to_string(),
        "--skip-download".to_string(),
        clean.to_string(),
    ];
    let out = run_capture(&bins.ytdlp, &args, 25).await?;
    let info: Value = serde_json::from_str(&out).map_err(|e| e.to_string())?;
    let id = info.get("id").and_then(|v| v.as_str()).unwrap_or_default();
    let dur = info.get("duration").and_then(|v| v.as_f64()).unwrap_or(0.0);
    let thumb = info
        .get("thumbnail")
        .and_then(|v| v.as_str())
        .map(|s| s.to_string())
        .filter(|s| !s.is_empty())
        .unwrap_or_else(|| {
            if id.is_empty() {
                String::new()
            } else {
                format!("https://i.ytimg.com/vi/{id}/hqdefault.jpg")
            }
        });
    Ok(json!({
        "id": id,
        "title": info.get("title").and_then(|v| v.as_str()).unwrap_or("YouTube Wallpaper"),
        "url": clean,
        "thumbnail": thumb,
        "duration": dur,
        "durationString": info.get("duration_string").and_then(|v| v.as_str()).map(|s| s.to_string()).unwrap_or_else(|| format_duration(dur)),
        "channel": info.get("channel").or_else(|| info.get("uploader")).and_then(|v| v.as_str()).unwrap_or("YouTube"),
        "isDirect": false
    }))
}

pub async fn download_online_media<F>(
    req: &DownloadRequest,
    dest_dir: &Path,
    bins: &OnlineBinaries,
    on_progress: F,
) -> Result<(PathBuf, String), String>
where
    F: Fn(u32, String) + Send + Sync + 'static,
{
    fs::create_dir_all(dest_dir).map_err(|e| e.to_string())?;
    let clean = req.url.trim();
    if !clean.starts_with("http://") && !clean.starts_with("https://") {
        return Err("Link không hợp lệ.".to_string());
    }

    if !is_streaming_url(clean) {
        return download_direct_file(clean, dest_dir, req.title.as_deref(), on_progress).await;
    }

    if !bins.has_ytdlp {
        return Err("Không tìm thấy yt-dlp.exe trong thư mục bin/.".to_string());
    }

    let rand_id: [u8; 5] = rand::random();
    let id = format!("yt-{}", hex::encode(rand_id));
    let raw_out = dest_dir.join(format!("{id}_raw.mp4"));
    let final_path = dest_dir.join(format!("{id}.mp4"));

    let max_h = match req.quality.as_deref().unwrap_or("1080") {
        "2160" => 2160,
        "1440" => 1440,
        "720" => 720,
        _ => 1080,
    };
    let keep_audio = req.keep_audio.unwrap_or(false);
    let fmt = if keep_audio {
        format!("bestvideo[height<={max_h}][ext=mp4]+bestaudio[ext=m4a]/bestvideo[height<={max_h}]+bestaudio/best[height<={max_h}]")
    } else {
        format!("bestvideo[height<={max_h}][vcodec^=avc1][ext=mp4]/bestvideo[height<={max_h}][ext=mp4]/bestvideo[height<={max_h}]/best[height<={max_h}]")
    };

    let mut args = vec![
        "--no-playlist".to_string(),
        "--newline".to_string(),
        "--no-warnings".to_string(),
        "-f".to_string(),
        fmt,
        "--merge-output-format".to_string(),
        "mp4".to_string(),
        "-o".to_string(),
        raw_out.to_string_lossy().to_string(),
    ];

    if bins.has_ffmpeg {
        if let Some(ff_dir) = Path::new(&bins.ffmpeg).parent() {
            args.push("--ffmpeg-location".to_string());
            args.push(ff_dir.to_string_lossy().to_string());
        }
        let dur = req.duration_sec.unwrap_or(25);
        if dur > 0 {
            let start = req.start_sec.unwrap_or(0);
            let end = start + dur.max(5);
            args.push("--download-sections".to_string());
            args.push(format!("*{start}-{end}"));
            args.push("--force-keyframes-at-cuts".to_string());
        }
    }
    args.push(clean.to_string());

    on_progress(5, "Đang kết nối YouTube & lấy luồng video HD...".to_string());

    let mut cmd = Command::new(&bins.ytdlp);
    cmd.args(&args)
        .stdout(Stdio::piped())
        .stderr(Stdio::piped());
    #[cfg(windows)]
    cmd.creation_flags(CREATE_NO_WINDOW);

    let mut child = cmd.spawn().map_err(|e| e.to_string())?;
    let stdout = child.stdout.take();
    let stderr = child.stderr.take();

    let cb = std::sync::Arc::new(on_progress);
    let cb1 = cb.clone();
    let out_task = tokio::spawn(async move {
        if let Some(s) = stdout {
            let mut lines = BufReader::new(s).lines();
            while let Ok(Some(line)) = lines.next_line().await {
                if let Some(pct) = parse_percent(&line) {
                    let p = ((pct * 0.85 + 6.0).round() as u32).min(92);
                    cb1(p, format!("Đang tải video từ YouTube ({}% )...", pct.round() as u32));
                }
            }
        }
    });

    let cb2 = cb.clone();
    let err_task = tokio::spawn(async move {
        let mut buf = String::new();
        if let Some(s) = stderr {
            let mut lines = BufReader::new(s).lines();
            while let Ok(Some(line)) = lines.next_line().await {
                buf.push_str(&line);
                buf.push('\n');
                if let Some(pct) = parse_percent(&line) {
                    let p = ((pct * 0.85 + 6.0).round() as u32).min(92);
                    cb2(p, format!("Đang tải video từ YouTube ({}% )...", pct.round() as u32));
                }
            }
        }
        buf
    });

    let status = child.wait().await.map_err(|e| e.to_string())?;
    let _ = out_task.await;
    let err_buf = err_task.await.unwrap_or_default();
    if !status.success() {
        return Err(err_buf
            .trim()
            .chars()
            .take(400)
            .collect::<String>());
    }

    let mut actual_raw = raw_out.clone();
    if !actual_raw.exists() {
        if let Ok(entries) = fs::read_dir(dest_dir) {
            let prefix = format!("{id}_raw");
            for ent in entries.flatten() {
                if ent.file_name().to_string_lossy().starts_with(&prefix) {
                    actual_raw = ent.path();
                    break;
                }
            }
        }
    }
    if !actual_raw.exists() {
        return Err("Tải xong nhưng không tìm thấy tệp video đầu ra.".to_string());
    }

    if bins.has_ffmpeg {
        cb(96, "Tối ưu giải mã phần cứng GPU (H.264 FastStart)...".to_string());
        let mut ff_args = vec![
            "-y".to_string(),
            "-i".to_string(),
            actual_raw.to_string_lossy().to_string(),
        ];
        if !keep_audio {
            ff_args.push("-an".to_string());
        }
        ff_args.extend([
            "-c:v".to_string(),
            "copy".to_string(),
            "-movflags".to_string(),
            "+faststart".to_string(),
            final_path.to_string_lossy().to_string(),
        ]);

        if run_capture(&bins.ffmpeg, &ff_args, 30).await.is_ok() {
            let _ = fs::remove_file(&actual_raw);
        } else {
            let _ = fs::rename(&actual_raw, &final_path);
        }
    } else {
        let _ = fs::rename(&actual_raw, &final_path);
    }

    cb(100, "Đã tải xong & thêm vào thư viện!".to_string());
    Ok((
        final_path,
        req.title
            .clone()
            .filter(|s| !s.trim().is_empty())
            .unwrap_or_else(|| "YouTube Live Wallpaper".to_string()),
    ))
}

async fn download_direct_file<F>(
    clean_url: &str,
    dest_dir: &Path,
    custom_name: Option<&str>,
    on_progress: F,
) -> Result<(PathBuf, String), String>
where
    F: Fn(u32, String) + Send + Sync + 'static,
{
    on_progress(10, "Đang tải tệp từ Internet...".to_string());
    let client = reqwest::Client::builder()
        .user_agent("AntigravityStudioRust/12.0")
        .build()
        .map_err(|e| e.to_string())?;
    let resp = client.get(clean_url).send().await.map_err(|e| e.to_string())?;
    if !resp.status().is_success() {
        return Err(format!("HTTP {}", resp.status().as_u16()));
    }

    let ct = resp
        .headers()
        .get(reqwest::header::CONTENT_TYPE)
        .and_then(|v| v.to_str().ok())
        .unwrap_or("")
        .to_ascii_lowercase();
    let parsed_url = Url::parse(clean_url).map_err(|e| e.to_string())?;
    let mut ext = Path::new(parsed_url.path())
        .extension()
        .and_then(|e| e.to_str())
        .map(|s| format!(".{}", s.to_ascii_lowercase()))
        .unwrap_or_default();
    if ext.is_empty() || ext.len() > 6 {
        ext = if ct.contains("mp4") {
            ".mp4".into()
        } else if ct.contains("webm") {
            ".webm".into()
        } else if ct.contains("gif") {
            ".gif".into()
        } else if ct.contains("webp") {
            ".webp".into()
        } else if ct.contains("png") {
            ".png".into()
        } else if ct.contains("jpeg") || ct.contains("jpg") {
            ".jpg".into()
        } else {
            ".mp4".into()
        };
    }

    let rand_id: [u8; 5] = rand::random();
    let file_path = dest_dir.join(format!("web-{}{}", hex::encode(rand_id), ext));
    let total = resp.content_length().unwrap_or(0);
    let mut file = tokio::fs::File::create(&file_path)
        .await
        .map_err(|e| e.to_string())?;
    let mut stream = resp.bytes_stream();
    let mut loaded: u64 = 0;

    while let Some(chunk) = stream.next().await {
        let data = chunk.map_err(|e| e.to_string())?;
        file.write_all(&data).await.map_err(|e| e.to_string())?;
        loaded += data.len() as u64;
        if total > 0 {
            let pct = (((loaded as f64 / total as f64) * 100.0).round() as u32).min(98);
            on_progress(
                pct,
                format!(
                    "Đang tải {:.1} MB / {:.1} MB",
                    loaded as f64 / (1024.0 * 1024.0),
                    total as f64 / (1024.0 * 1024.0)
                ),
            );
        }
    }
    file.flush().await.map_err(|e| e.to_string())?;
    on_progress(100, "Hoàn tất!".to_string());

    let fallback_title = Path::new(parsed_url.path())
        .file_stem()
        .and_then(|s| s.to_str())
        .unwrap_or("Web Theme")
        .to_string();
    Ok((
        file_path,
        custom_name
            .filter(|s| !s.trim().is_empty())
            .map(|s| s.to_string())
            .unwrap_or(fallback_title),
    ))
}

fn parse_percent(line: &str) -> Option<f64> {
    let idx = line.find('%')?;
    let prefix = &line[..idx];
    let num_str: String = prefix
        .chars()
        .rev()
        .take_while(|c| c.is_ascii_digit() || *c == '.')
        .collect::<String>()
        .chars()
        .rev()
        .collect();
    num_str.parse::<f64>().ok()
}
