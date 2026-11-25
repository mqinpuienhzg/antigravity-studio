use futures_util::{SinkExt, StreamExt};
use notify::{RecommendedWatcher, RecursiveMode, Watcher};
use serde_json::{json, Value};
use std::{
    collections::{HashMap, HashSet},
    fs,
    path::PathBuf,
    sync::{
        atomic::{AtomicBool, AtomicU64, Ordering},
        Arc, Mutex,
    },
    time::{Duration, SystemTime, UNIX_EPOCH},
};
use tokio::sync::{mpsc, oneshot, RwLock};
use tokio_tungstenite::{connect_async, tungstenite::Message};

#[cfg(windows)]
use std::os::windows::process::CommandExt;

#[cfg(windows)]
const CREATE_NO_WINDOW: u32 = 0x0800_0000;

const INJECTOR_RUNTIME_JS: &str = include_str!("../resources/injector-runtime.js");
const REMOVE_RUNTIME_JS: &str = include_str!("../resources/remove-runtime.js");

pub fn build_inject_script(payload_state: &Value) -> String {
    let json_str = serde_json::to_string(payload_state).unwrap_or_else(|_| "{}".to_string());
    format!("({INJECTOR_RUNTIME_JS})({json_str})")
}

pub fn build_remove_script() -> String {
    REMOVE_RUNTIME_JS.to_string()
}

fn now_ms() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_millis() as u64)
        .unwrap_or(0)
}

#[derive(Clone)]
pub struct CdpTargetSession {
    pub id: String,
    pub kind: String,
    pub url: String,
    pub title: String,
    pub ready: Arc<AtomicBool>,
    pub preload_script_id: Arc<Mutex<Option<String>>>,
    pub last_heal_at: Arc<AtomicU64>,
    cmd_tx: mpsc::UnboundedSender<String>,
    pending: Arc<Mutex<HashMap<u64, oneshot::Sender<Result<Value, String>>>>>,
    next_id: Arc<AtomicU64>,
}

impl CdpTargetSession {
    pub async fn send(&self, method: &str, params: Value) -> Result<Value, String> {
        let id = self.next_id.fetch_add(1, Ordering::Relaxed);
        let (tx, rx) = oneshot::channel();
        {
            let mut map = self.pending.lock().map_err(|_| "lock poisoned".to_string())?;
            map.insert(id, tx);
        }
        let payload = json!({ "id": id, "method": method, "params": params }).to_string();
        if self.cmd_tx.send(payload).is_err() {
            if let Ok(mut map) = self.pending.lock() {
                map.remove(&id);
            }
            return Err("WebSocket closed".to_string());
        }
        match tokio::time::timeout(Duration::from_secs(6), rx).await {
            Ok(Ok(res)) => res,
            Ok(Err(_)) => Err("Session dropped".to_string()),
            Err(_) => {
                if let Ok(mut map) = self.pending.lock() {
                    map.remove(&id);
                }
                Err("CDP timeout".to_string())
            }
        }
    }

    pub async fn evaluate(&self, expression: &str, return_by_value: bool) -> Option<Value> {
        self.send(
            "Runtime.evaluate",
            json!({
                "expression": expression,
                "returnByValue": return_by_value,
                "awaitPromise": false
            }),
        )
        .await
        .ok()
    }

    pub async fn refresh_preload_script(&self, script: Option<&str>) {
        if !self.ready.load(Ordering::Relaxed) {
            return;
        }
        let prev = self
            .preload_script_id
            .lock()
            .ok()
            .and_then(|mut g| g.take());
        if let Some(ident) = prev {
            let _ = self
                .send(
                    "Page.removeScriptToEvaluateOnNewDocument",
                    json!({ "identifier": ident }),
                )
                .await;
        }
        if let Some(src) = script {
            if let Ok(added) = self
                .send("Page.addScriptToEvaluateOnNewDocument", json!({ "source": src }))
                .await
            {
                if let Some(ident) = added.get("identifier").and_then(|v| v.as_str()) {
                    if let Ok(mut g) = self.preload_script_id.lock() {
                        *g = Some(ident.to_string());
                    }
                }
            }
        }
    }
}

pub type StateProvider = Arc<dyn Fn() -> Value + Send + Sync>;
pub type LogFn = Arc<dyn Fn(String) + Send + Sync>;
pub type StatusEmitter = Arc<dyn Fn(Value) + Send + Sync>;

struct BridgeInner {
    get_state: StateProvider,
    log_fn: LogFn,
    on_status: StatusEmitter,
    http: reqwest::Client,
    sessions: RwLock<HashMap<String, CdpTargetSession>>,
    active_port: RwLock<Option<u16>>,
    active_port_file: RwLock<Option<String>>,
    ide_layout: RwLock<Option<Value>>,
    is_disabled: AtomicBool,
    scanning: AtomicBool,
    last_status_json: Mutex<String>,
    last_fallback_probe: AtomicU64,
    browser_watcher_port: AtomicU64,
    _watchers: Mutex<Vec<RecommendedWatcher>>,
}

#[derive(Clone)]
pub struct CdpBridge {
    inner: Arc<BridgeInner>,
}

fn classify_target(t: &Value) -> Option<&'static str> {
    let typ = t.get("type").and_then(|v| v.as_str())?;
    if typ != "page" && typ != "iframe" {
        return None;
    }
    let ws = t
        .get("webSocketDebuggerUrl")
        .and_then(|v| v.as_str())
        .unwrap_or("");
    if ws.is_empty() {
        return None;
    }
    let url = t.get("url").and_then(|v| v.as_str()).unwrap_or("");
    if url.starts_with("devtools://") || url.starts_with("chrome-extension://") {
        return None;
    }
    if url.contains("workbench") || url.starts_with("vscode-file://") {
        Some("ide")
    } else if url.contains("127.0.0.1") || url.contains("launchpad") {
        Some("chat")
    } else if url.starts_with("vscode-webview://") {
        Some("webview")
    } else {
        None
    }
}

fn candidate_port_files() -> Vec<PathBuf> {
    let mut list = Vec::new();
    if let Ok(env_p) = std::env::var("AGY_PORT_FILE") {
        if !env_p.is_empty() {
            list.push(PathBuf::from(env_p));
        }
    }
    if let Some(cfg) = dirs::config_dir() {
        list.push(cfg.join("Antigravity IDE").join("DevToolsActivePort"));
        list.push(cfg.join("antigravity").join("DevToolsActivePort"));
        list.push(cfg.join("Antigravity").join("DevToolsActivePort"));
    }
    list
}

fn probe_listening_ide_ports_windows() -> Vec<u16> {
    #[cfg(not(windows))]
    {
        Vec::new()
    }
    #[cfg(windows)]
    {
        let ps = "$pids = Get-Process -Name 'Antigravity IDE','Antigravity' -ErrorAction SilentlyContinue | Select-Object -ExpandProperty Id; if (-not $pids) { return }; $ports = Get-NetTCPConnection -State Listen -LocalAddress '127.0.0.1' -ErrorAction SilentlyContinue | Where-Object { $pids -contains $_.OwningProcess } | Select-Object -ExpandProperty LocalPort -Unique; Write-Output ($ports -join ',')";
        let out = std::process::Command::new("powershell.exe")
            .args(["-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", ps])
            .creation_flags(CREATE_NO_WINDOW)
            .output();
        match out {
            Ok(o) => String::from_utf8_lossy(&o.stdout)
                .split(',')
                .filter_map(|s| s.trim().parse::<u16>().ok())
                .filter(|&p| p > 1024)
                .collect(),
            Err(_) => Vec::new(),
        }
    }
}

fn build_health_check_expr(state: &Value, kind: &str) -> String {
    if kind == "webview" {
        return r#"(() => {
  const st = document.getElementById('agy-studio-style');
  let innerOk = true;
  const af = document.querySelector('iframe#active-frame');
  if (af) {
    try {
      if (af.contentDocument && af.contentDocument.head) {
        innerOk = !!af.contentDocument.getElementById('agy-studio-style');
      }
    } catch (_) {}
  }
  return { readyDom: !!document.body, ok: !!(st && st.textContent && st.textContent.length > 30 && innerOk), layoutStale: false };
})()"#
            .to_string();
    }

    let cfg = state.get("config").unwrap_or(&Value::Null);
    let chat_id = state
        .get("chatTheme")
        .and_then(|t| t.get("id"))
        .and_then(|v| v.as_str());
    let ide_id = state
        .get("ideTheme")
        .and_then(|t| t.get("id"))
        .and_then(|v| v.as_str());
    let same_both = chat_id.is_some() && chat_id == ide_id;
    let unified = (cfg
        .get("unifiedFullWindow")
        .and_then(|v| v.as_bool())
        .unwrap_or(true)
        || same_both)
        && cfg
            .get("applyToIde")
            .and_then(|v| v.as_bool())
            .unwrap_or(true);

    let active_theme = if unified {
        state.get("chatTheme").or_else(|| state.get("ideTheme"))
    } else if kind == "ide" {
        state.get("ideTheme")
    } else {
        state.get("chatTheme")
    };
    let has_media_url = active_theme
        .and_then(|t| t.get("mediaUrl"))
        .and_then(|v| v.as_str())
        .map(|s| !s.is_empty())
        .unwrap_or(false);
    let is_video = active_theme
        .and_then(|t| t.get("mediaType"))
        .and_then(|v| v.as_str())
        == Some("video");

    let expect_video = has_media_url && is_video;
    let expect_image = has_media_url && !is_video;
    let expect_pass_through_chat = kind == "chat" && unified;

    format!(
        r#"(() => {{
  const st = document.getElementById('agy-studio-style');
  const bg = document.getElementById('agy-studio-bg-layer');
  const wb = document.querySelector('.monaco-workbench');
  const sh = document.querySelector('.agy-shell');
  const styleOk = !!(st && st.textContent && st.textContent.length > 50);
  if (!wb && window.self !== window.top && (location.hostname === '127.0.0.1' || location.hostname === 'localhost')) {{
    if (!sh) return {{ readyDom: !!document.body, ok: styleOk && !bg, layoutStale: false }};
    if ({expect_pass_through_chat}) return {{ readyDom: true, ok: styleOk && !bg, layoutStale: false }};
  }}
  const readyDom = !!(wb || sh);
  const hostOk = wb ? (bg && wb.contains(bg)) : (sh ? (bg && sh.contains(bg)) : !!bg);
  let mediaOk = !!bg && bg.dataset.mediaFailed !== '1';
  if (mediaOk && {expect_video}) {{
    const v = document.getElementById('agy-studio-bg-video');
    const mountAge = Date.now() - (window.__AGY_MOUNT_TS__ || 0);
    if (!v || v.error || (v.readyState === 0 && mountAge > 6000)) {{
      mediaOk = false;
      if (bg) {{ bg.dataset.mediaFailed = '1'; bg.dataset.mediaKey = ''; }}
    }}
  }} else if (mediaOk && {expect_image}) {{
    const im = document.getElementById('agy-studio-bg-img');
    if (!im || (im.complete && im.naturalWidth === 0)) {{
      mediaOk = false;
      if (bg) {{ bg.dataset.mediaFailed = '1'; bg.dataset.mediaKey = ''; }}
    }}
  }}
  return {{ readyDom, ok: !!(styleOk && bg && hostOk && mediaOk), layoutStale: false }};
}})()"#
    )
}

impl CdpBridge {
    pub fn new(get_state: StateProvider, log_fn: LogFn, on_status: StatusEmitter) -> Self {
        let http = reqwest::Client::builder()
            .no_proxy()
            .timeout(Duration::from_millis(500))
            .build()
            .unwrap_or_else(|_| reqwest::Client::new());

        Self {
            inner: Arc::new(BridgeInner {
                get_state,
                log_fn,
                on_status,
                http,
                sessions: RwLock::new(HashMap::new()),
                active_port: RwLock::new(None),
                active_port_file: RwLock::new(None),
                ide_layout: RwLock::new(None),
                is_disabled: AtomicBool::new(false),
                scanning: AtomicBool::new(false),
                last_status_json: Mutex::new(String::new()),
                last_fallback_probe: AtomicU64::new(0),
                browser_watcher_port: AtomicU64::new(0),
                _watchers: Mutex::new(Vec::new()),
            }),
        }
    }

    pub fn start(&self) {
        self.start_port_file_watchers();
        let this = self.clone();
        tauri::async_runtime::spawn(async move {
            loop {
                this.scan().await;
                let has_port = this.inner.active_port.read().await.is_some();
                let delay = if has_port { 1400 } else { 380 };
                tokio::time::sleep(Duration::from_millis(delay)).await;
            }
        });
    }

    fn start_port_file_watchers(&self) {
        let dirs_set: HashSet<PathBuf> = candidate_port_files()
            .into_iter()
            .filter_map(|p| p.parent().map(|d| d.to_path_buf()))
            .filter(|d| d.exists())
            .collect();

        for dir in dirs_set {
            let this = self.clone();
            if let Ok(mut watcher) = notify::recommended_watcher(move |res: notify::Result<notify::Event>| {
                if let Ok(ev) = res {
                    let relevant = ev.paths.iter().any(|p| {
                        p.file_name()
                            .and_then(|n| n.to_str())
                            .map(|s| s.to_ascii_lowercase().contains("devtoolsactiveport"))
                            .unwrap_or(false)
                    });
                    if relevant {
                        let b = this.clone();
                        tauri::async_runtime::spawn(async move {
                            tokio::time::sleep(Duration::from_millis(25)).await;
                            b.scan().await;
                        });
                    }
                }
            }) {
                if watcher.watch(&dir, RecursiveMode::NonRecursive).is_ok() {
                    if let Ok(mut w) = self.inner._watchers.lock() {
                        w.push(watcher);
                    }
                }
            }
        }
    }

    async fn fetch_json(&self, url: &str) -> Option<Value> {
        let resp = self.inner.http.get(url).send().await.ok()?;
        if !resp.status().is_success() {
            return None;
        }
        resp.json::<Value>().await.ok()
    }

    async fn discover_live_port(&self) -> Option<(u16, String, Vec<Value>)> {
        let mut files: Vec<PathBuf> = candidate_port_files()
            .into_iter()
            .filter(|p| p.exists())
            .collect();
        files.sort_by_key(|p| {
            std::cmp::Reverse(
                fs::metadata(p)
                    .and_then(|m| m.modified())
                    .unwrap_or(SystemTime::UNIX_EPOCH),
            )
        });

        for file in files {
            if let Ok(raw) = fs::read_to_string(&file) {
                if let Some(first) = raw.trim().lines().next() {
                    if let Ok(port) = first.trim().parse::<u16>() {
                        if port > 0 {
                            let url = format!("http://127.0.0.1:{port}/json");
                            if let Some(Value::Array(arr)) = self.fetch_json(&url).await {
                                return Some((port, file.to_string_lossy().to_string(), arr));
                            }
                        }
                    }
                }
            }
        }

        if let Some(prev_port) = *self.inner.active_port.read().await {
            let url = format!("http://127.0.0.1:{prev_port}/json");
            if let Some(Value::Array(arr)) = self.fetch_json(&url).await {
                let pf = self
                    .inner
                    .active_port_file
                    .read()
                    .await
                    .clone()
                    .unwrap_or_else(|| "live-port".to_string());
                return Some((prev_port, pf, arr));
            }
        }

        let now = now_ms();
        let last = self.inner.last_fallback_probe.load(Ordering::Relaxed);
        if now.saturating_sub(last) > 1800 {
            self.inner.last_fallback_probe.store(now, Ordering::Relaxed);
            let ports = tokio::task::spawn_blocking(probe_listening_ide_ports_windows)
                .await
                .unwrap_or_default();
            for port in ports {
                let url = format!("http://127.0.0.1:{port}/json");
                if let Some(Value::Array(arr)) = self.fetch_json(&url).await {
                    if arr.iter().any(|t| classify_target(t).is_some()) {
                        return Some((port, "process-probe".to_string(), arr));
                    }
                }
            }
        }
        None
    }

    async fn build_enriched_state(&self, raw: Value) -> Value {
        let mut out = raw;
        let layout = self.inner.ide_layout.read().await.clone();
        if let Some(obj) = out.as_object_mut() {
            obj.insert("ideLayout".into(), layout.unwrap_or(Value::Null));
        }
        out
    }

    pub async fn query_ide_layout_now(&self) -> Option<Value> {
        let sessions: Vec<CdpTargetSession> = self
            .inner
            .sessions
            .read()
            .await
            .values()
            .filter(|s| s.kind == "ide" && s.ready.load(Ordering::Relaxed))
            .cloned()
            .collect();

        let expr = r#"(() => {
  const f = document.querySelector('iframe.webview.ready') || document.querySelector('iframe.webview');
  const r = f ? f.getBoundingClientRect() : null;
  return {
    parentW: window.innerWidth,
    parentH: window.innerHeight,
    offsetX: r ? Math.round(r.left) : 0,
    offsetY: r ? Math.round(r.top) : 0,
    frameW: r ? Math.round(r.width) : 0,
    frameH: r ? Math.round(r.height) : 0
  };
})()"#;

        let mut fallback = None;
        for s in sessions {
            if let Some(res) = s.evaluate(expr, true).await {
                if let Some(val) = res.get("result").and_then(|r| r.get("value")) {
                    let pw = val.get("parentW").and_then(|v| v.as_i64()).unwrap_or(0);
                    let fw = val.get("frameW").and_then(|v| v.as_i64()).unwrap_or(0);
                    let fh = val.get("frameH").and_then(|v| v.as_i64()).unwrap_or(0);
                    if pw > 0 {
                        if fw > 20 && fh > 20 {
                            *self.inner.ide_layout.write().await = Some(val.clone());
                            return Some(val.clone());
                        }
                        if fallback.is_none() {
                            fallback = Some(val.clone());
                        }
                    }
                }
            }
        }
        if let Some(fb) = fallback {
            *self.inner.ide_layout.write().await = Some(fb.clone());
            return Some(fb);
        }
        self.inner.ide_layout.read().await.clone()
    }

    async fn broadcast_layout_to_chats(&self, layout: &Value) {
        let pw = layout.get("parentW").and_then(|v| v.as_i64()).unwrap_or(0);
        if pw <= 0 {
            return;
        }
        let expr = format!(
            "if (typeof window.__AGY_STUDIO_SYNC_LAYOUT__ === 'function') {{ window.__AGY_STUDIO_SYNC_LAYOUT__({}); }}",
            serde_json::to_string(layout).unwrap_or_else(|_| "{}".into())
        );
        let chats: Vec<CdpTargetSession> = self
            .inner
            .sessions
            .read()
            .await
            .values()
            .filter(|s| s.kind == "chat" && s.ready.load(Ordering::Relaxed))
            .cloned()
            .collect();
        for s in chats {
            let _ = s.evaluate(&expr, false).await;
        }
    }

    fn ensure_browser_target_watcher(&self, port: u16) {
        if port == 0 {
            return;
        }
        if self.inner.browser_watcher_port.load(Ordering::Relaxed) == port as u64 {
            return;
        }
        self.inner
            .browser_watcher_port
            .store(port as u64, Ordering::Relaxed);
        let this = self.clone();
        tokio::spawn(async move {
            let ver_url = format!("http://127.0.0.1:{port}/json/version");
            let Some(ver) = this.fetch_json(&ver_url).await else {
                this.inner.browser_watcher_port.store(0, Ordering::Relaxed);
                return;
            };
            let Some(ws_url) = ver.get("webSocketDebuggerUrl").and_then(|v| v.as_str()) else {
                this.inner.browser_watcher_port.store(0, Ordering::Relaxed);
                return;
            };
            let Ok((ws_stream, _)) = connect_async(ws_url).await else {
                this.inner.browser_watcher_port.store(0, Ordering::Relaxed);
                return;
            };
            let (mut write, mut read) = ws_stream.split();
            let _ = write
                .send(Message::Text(
                    json!({ "id": 1, "method": "Target.setDiscoverTargets", "params": { "discover": true } })
                        .to_string()
                        .into(),
                ))
                .await;

            while let Some(Ok(msg)) = read.next().await {
                if this.inner.browser_watcher_port.load(Ordering::Relaxed) != port as u64 {
                    break;
                }
                if let Message::Text(txt) = msg {
                    if let Ok(v) = serde_json::from_str::<Value>(&txt) {
                        let m = v.get("method").and_then(|x| x.as_str()).unwrap_or("");
                        if m == "Target.targetCreated" || m == "Target.targetInfoChanged" {
                            if let Some(info) = v.get("params").and_then(|p| p.get("targetInfo")) {
                                let probe = json!({
                                    "type": info.get("type").cloned().unwrap_or(Value::Null),
                                    "url": info.get("url").cloned().unwrap_or(Value::Null),
                                    "webSocketDebuggerUrl": "ok"
                                });
                                if classify_target(&probe).is_some() {
                                    let tid = info
                                        .get("targetId")
                                        .and_then(|x| x.as_str())
                                        .unwrap_or("");
                                    let known = this.inner.sessions.read().await.contains_key(tid);
                                    if !known {
                                        let b = this.clone();
                                        tokio::spawn(async move {
                                            tokio::time::sleep(Duration::from_millis(30)).await;
                                            b.scan().await;
                                        });
                                    }
                                }
                            }
                        }
                    }
                }
            }
            if this.inner.browser_watcher_port.load(Ordering::Relaxed) == port as u64 {
                this.inner.browser_watcher_port.store(0, Ordering::Relaxed);
            }
        });
    }

    async fn spawn_session(&self, target: Value, kind: String) {
        let id = target
            .get("id")
            .and_then(|v| v.as_str())
            .unwrap_or_default()
            .to_string();
        let ws_url = target
            .get("webSocketDebuggerUrl")
            .and_then(|v| v.as_str())
            .unwrap_or_default()
            .to_string();
        let url = target
            .get("url")
            .and_then(|v| v.as_str())
            .unwrap_or_default()
            .to_string();
        let title = target
            .get("title")
            .and_then(|v| v.as_str())
            .unwrap_or_default()
            .to_string();

        if id.is_empty() || ws_url.is_empty() {
            return;
        }

        let (cmd_tx, mut cmd_rx) = mpsc::unbounded_channel::<String>();
        let pending: Arc<Mutex<HashMap<u64, oneshot::Sender<Result<Value, String>>>>> =
            Arc::new(Mutex::new(HashMap::new()));
        let session = CdpTargetSession {
            id: id.clone(),
            kind: kind.clone(),
            url,
            title,
            ready: Arc::new(AtomicBool::new(false)),
            preload_script_id: Arc::new(Mutex::new(None)),
            last_heal_at: Arc::new(AtomicU64::new(0)),
            cmd_tx,
            pending: pending.clone(),
            next_id: Arc::new(AtomicU64::new(1)),
        };

        self.inner
            .sessions
            .write()
            .await
            .insert(id.clone(), session.clone());

        let this = self.clone();
        tokio::spawn(async move {
            let Ok((ws_stream, _)) = connect_async(&ws_url).await else {
                this.inner.sessions.write().await.remove(&id);
                this.emit_status().await;
                return;
            };
            let (mut write, mut read) = ws_stream.split();

            let writer_task = tokio::spawn(async move {
                while let Some(txt) = cmd_rx.recv().await {
                    if write.send(Message::Text(txt.into())).await.is_err() {
                        break;
                    }
                }
            });

            // Initialize session concurrently while reader loop drains incoming messages
            let init_bridge = this.clone();
            let init_session = session.clone();
            let init_kind = kind.clone();
            let init_id = id.clone();
            tokio::spawn(async move {
                let _ = init_session.send("Page.enable", json!({})).await;
                let _ = init_session.send("Runtime.enable", json!({})).await;
                if init_kind == "ide" {
                    let _ = init_session
                        .send("Runtime.addBinding", json!({ "name": "agyStudioLayoutSync" }))
                        .await;
                }
                init_session.ready.store(true, Ordering::Relaxed);
                let port = init_bridge
                    .inner
                    .active_port
                    .read()
                    .await
                    .unwrap_or(0);
                let short_id: String = init_id.chars().take(8).collect();
                (init_bridge.inner.log_fn)(format!(
                    "CDP session ready [{init_kind}] id={short_id} port={port}"
                ));

                init_bridge.query_ide_layout_now().await;

                if !init_bridge.inner.is_disabled.load(Ordering::Relaxed) {
                    let state = (init_bridge.inner.get_state)();
                    if state
                        .get("config")
                        .and_then(|c| c.get("enabled"))
                        .and_then(|v| v.as_bool())
                        .unwrap_or(false)
                    {
                        let enriched = init_bridge.build_enriched_state(state).await;
                        let script = build_inject_script(&enriched);
                        init_session.refresh_preload_script(Some(&script)).await;
                        let _ = init_session.evaluate(&script, false).await;
                        init_session.last_heal_at.store(now_ms(), Ordering::Relaxed);

                        // Cold-boot self-healing bursts
                        for delay_ms in [800u64, 2200, 5000, 9500] {
                            let b = init_bridge.clone();
                            let s = init_session.clone();
                            let k = init_kind.clone();
                            let sid = init_id.clone();
                            tokio::spawn(async move {
                                tokio::time::sleep(Duration::from_millis(delay_ms)).await;
                                if b.inner.is_disabled.load(Ordering::Relaxed)
                                    || !s.ready.load(Ordering::Relaxed)
                                    || !b.inner.sessions.read().await.contains_key(&sid)
                                {
                                    return;
                                }
                                let latest = (b.inner.get_state)();
                                if !latest
                                    .get("config")
                                    .and_then(|c| c.get("enabled"))
                                    .and_then(|v| v.as_bool())
                                    .unwrap_or(false)
                                {
                                    return;
                                }
                                b.query_ide_layout_now().await;
                                let chk_expr = build_health_check_expr(&latest, &k);
                                if let Some(chk) = s.evaluate(&chk_expr, true).await {
                                    if let Some(val) = chk.get("result").and_then(|r| r.get("value")) {
                                        let ready_dom = val
                                            .get("readyDom")
                                            .and_then(|x| x.as_bool())
                                            .unwrap_or(false);
                                        let ok = val
                                            .get("ok")
                                            .and_then(|x| x.as_bool())
                                            .unwrap_or(false);
                                        if ready_dom && !ok {
                                            (b.inner.log_fn)(format!(
                                                "Cold-boot self-heal [{k}] at +{delay_ms}ms"
                                            ));
                                            s.last_heal_at.store(now_ms(), Ordering::Relaxed);
                                            let enr = b.build_enriched_state(latest).await;
                                            let sc = build_inject_script(&enr);
                                            let _ = s.evaluate(&sc, false).await;
                                        }
                                    }
                                }
                                if k == "ide" {
                                    if let Some(lay) = b.inner.ide_layout.read().await.clone() {
                                        b.broadcast_layout_to_chats(&lay).await;
                                    }
                                }
                            });
                        }
                    }
                }

                if init_kind == "ide" {
                    if let Some(lay) = init_bridge.inner.ide_layout.read().await.clone() {
                        init_bridge.broadcast_layout_to_chats(&lay).await;
                    }
                }
                init_bridge.emit_status().await;
            });

            while let Some(Ok(msg)) = read.next().await {
                let Message::Text(txt) = msg else { continue };
                let Ok(v) = serde_json::from_str::<Value>(&txt) else {
                    continue;
                };
                if let Some(resp_id) = v.get("id").and_then(|x| x.as_u64()) {
                    let tx_opt = pending.lock().ok().and_then(|mut m| m.remove(&resp_id));
                    if let Some(tx) = tx_opt {
                        if let Some(err) = v.get("error") {
                            let emsg = err
                                .get("message")
                                .and_then(|x| x.as_str())
                                .unwrap_or("CDP error")
                                .to_string();
                            let _ = tx.send(Err(emsg));
                        } else {
                            let _ = tx.send(Ok(v.get("result").cloned().unwrap_or(Value::Null)));
                        }
                    }
                    continue;
                }

                let method = v.get("method").and_then(|x| x.as_str()).unwrap_or("");
                if method == "Runtime.bindingCalled"
                    && v.get("params")
                        .and_then(|p| p.get("name"))
                        .and_then(|n| n.as_str())
                        == Some("agyStudioLayoutSync")
                {
                    if let Some(payload) = v
                        .get("params")
                        .and_then(|p| p.get("payload"))
                        .and_then(|s| s.as_str())
                    {
                        if let Ok(layout) = serde_json::from_str::<Value>(payload) {
                            if layout.get("parentW").and_then(|x| x.as_i64()).unwrap_or(0) > 0 {
                                *this.inner.ide_layout.write().await = Some(layout.clone());
                                let b = this.clone();
                                tokio::spawn(async move {
                                    b.broadcast_layout_to_chats(&layout).await;
                                });
                            }
                        }
                    }
                    continue;
                }

                let is_top_nav = method == "Page.frameNavigated"
                    && v.get("params")
                        .and_then(|p| p.get("frame"))
                        .map(|f| f.get("parentId").is_none())
                        .unwrap_or(false);
                if (is_top_nav || method == "Page.loadEventFired")
                    && !this.inner.is_disabled.load(Ordering::Relaxed)
                {
                    let b = this.clone();
                    let s = session.clone();
                    let k = kind.clone();
                    tokio::spawn(async move {
                        let st = (b.inner.get_state)();
                        if st
                            .get("config")
                            .and_then(|c| c.get("enabled"))
                            .and_then(|v| v.as_bool())
                            .unwrap_or(false)
                        {
                            if k == "chat" {
                                b.query_ide_layout_now().await;
                            }
                            let enr = b.build_enriched_state(st).await;
                            let sc = build_inject_script(&enr);
                            let _ = s.evaluate(&sc, false).await;
                            if k == "ide" {
                                if let Some(lay) = b.inner.ide_layout.read().await.clone() {
                                    b.broadcast_layout_to_chats(&lay).await;
                                }
                            }
                        }
                    });
                }
            }

            writer_task.abort();
            if let Ok(mut map) = pending.lock() {
                for (_, tx) in map.drain() {
                    let _ = tx.send(Err("Closed".to_string()));
                }
            }
            this.inner.sessions.write().await.remove(&id);
            this.emit_status().await;
        });
    }

    pub async fn scan(&self) {
        if self
            .inner
            .scanning
            .compare_exchange(false, true, Ordering::SeqCst, Ordering::SeqCst)
            .is_err()
        {
            return;
        }

        let live = self.discover_live_port().await;
        let Some((port, file, targets)) = live else {
            let had_any = !self.inner.sessions.read().await.is_empty()
                || self.inner.active_port.read().await.is_some();
            if had_any {
                let prev = self.inner.active_port.read().await.unwrap_or(0);
                (self.inner.log_fn)(format!(
                    "CDP port {prev} disconnected; waiting for Antigravity IDE..."
                ));
                self.inner.sessions.write().await.clear();
                *self.inner.active_port.write().await = None;
                *self.inner.active_port_file.write().await = None;
                self.inner.browser_watcher_port.store(0, Ordering::Relaxed);
                self.emit_status().await;
            }
            self.inner.scanning.store(false, Ordering::SeqCst);
            return;
        };

        let prev_port = *self.inner.active_port.read().await;
        if let Some(pp) = prev_port {
            if pp != port {
                (self.inner.log_fn)(format!("CDP port changed {pp} -> {port}"));
                self.inner.sessions.write().await.clear();
            }
        } else {
            (self.inner.log_fn)(format!("Discovered live CDP port {port} ({file})"));
        }

        *self.inner.active_port.write().await = Some(port);
        *self.inner.active_port_file.write().await = Some(file);
        self.ensure_browser_target_watcher(port);

        let mut valid_targets: Vec<(Value, String)> = Vec::new();
        for t in targets {
            if let Some(kind) = classify_target(&t) {
                valid_targets.push((t, kind.to_string()));
            }
        }

        let live_ids: HashSet<String> = valid_targets
            .iter()
            .filter_map(|(t, _)| t.get("id").and_then(|v| v.as_str()).map(|s| s.to_string()))
            .collect();

        {
            let mut map = self.inner.sessions.write().await;
            map.retain(|id, _| live_ids.contains(id));
        }

        for (target, kind) in valid_targets {
            let tid = target.get("id").and_then(|v| v.as_str()).unwrap_or("");
            if !tid.is_empty() && !self.inner.sessions.read().await.contains_key(tid) {
                self.spawn_session(target, kind).await;
            }
        }

        // Steady-state DOM & Media Self-Healing Guard
        if !self.inner.is_disabled.load(Ordering::Relaxed) {
            let state = (self.inner.get_state)();
            if state
                .get("config")
                .and_then(|c| c.get("enabled"))
                .and_then(|v| v.as_bool())
                .unwrap_or(false)
            {
                let active_sessions: Vec<CdpTargetSession> = self
                    .inner
                    .sessions
                    .read()
                    .await
                    .values()
                    .filter(|s| s.ready.load(Ordering::Relaxed))
                    .cloned()
                    .collect();

                let mut needs_broadcast = false;
                let now = now_ms();
                for s in active_sessions {
                    let chk_expr = build_health_check_expr(&state, &s.kind);
                    if let Some(chk) = s.evaluate(&chk_expr, true).await {
                        if let Some(v) = chk.get("result").and_then(|r| r.get("value")) {
                            let ready_dom = v.get("readyDom").and_then(|x| x.as_bool()).unwrap_or(false);
                            let ok = v.get("ok").and_then(|x| x.as_bool()).unwrap_or(false);
                            let last = s.last_heal_at.load(Ordering::Relaxed);
                            if ready_dom && !ok && now.saturating_sub(last) > 2500 {
                                s.last_heal_at.store(now, Ordering::Relaxed);
                                let short: String = s.id.chars().take(8).collect();
                                (self.inner.log_fn)(format!(
                                    "Self-healing DOM/media on [{}] id={short}",
                                    s.kind
                                ));
                                self.query_ide_layout_now().await;
                                let enr = self.build_enriched_state(state.clone()).await;
                                let sc = build_inject_script(&enr);
                                s.refresh_preload_script(Some(&sc)).await;
                                let _ = s.evaluate(&sc, false).await;
                                needs_broadcast = true;
                            }
                        }
                    }
                }
                if needs_broadcast {
                    if let Some(lay) = self.inner.ide_layout.read().await.clone() {
                        self.broadcast_layout_to_chats(&lay).await;
                    }
                }
            }
        }

        self.emit_status().await;
        self.inner.scanning.store(false, Ordering::SeqCst);
    }

    pub async fn get_status(&self) -> Value {
        let map = self.inner.sessions.read().await;
        let targets: Vec<Value> = map
            .values()
            .map(|s| {
                json!({
                    "id": s.id,
                    "kind": s.kind,
                    "ready": s.ready.load(Ordering::Relaxed),
                    "title": s.title,
                    "url": s.url
                })
            })
            .collect();
        let chat_count = targets
            .iter()
            .filter(|t| t["kind"] == "chat" && t["ready"] == true)
            .count();
        let ide_count = targets
            .iter()
            .filter(|t| t["kind"] == "ide" && t["ready"] == true)
            .count();
        let webview_count = targets
            .iter()
            .filter(|t| t["kind"] == "webview" && t["ready"] == true)
            .count();
        let port = *self.inner.active_port.read().await;
        let port_file = self.inner.active_port_file.read().await.clone();

        json!({
            "connected": chat_count > 0 || ide_count > 0 || webview_count > 0,
            "port": port,
            "portFile": port_file,
            "chatConnected": chat_count > 0,
            "ideConnected": ide_count > 0,
            "chatCount": chat_count,
            "ideCount": ide_count,
            "webviewCount": webview_count,
            "targets": targets
        })
    }

    async fn emit_status(&self) {
        let status = self.get_status().await;
        let s_json = serde_json::to_string(&status).unwrap_or_default();
        let changed = self
            .inner
            .last_status_json
            .lock()
            .map(|mut prev| {
                if *prev != s_json {
                    *prev = s_json;
                    true
                } else {
                    false
                }
            })
            .unwrap_or(false);
        if changed {
            (self.inner.on_status)(status);
        }
    }

    pub async fn apply_now(&self, payload_state: Value) -> Value {
        let enabled = payload_state
            .get("config")
            .and_then(|c| c.get("enabled"))
            .and_then(|v| v.as_bool())
            .unwrap_or(false);
        self.inner.is_disabled.store(!enabled, Ordering::Relaxed);
        self.query_ide_layout_now().await;

        let script = if !enabled {
            build_remove_script()
        } else {
            let enr = self.build_enriched_state(payload_state).await;
            build_inject_script(&enr)
        };

        let sessions: Vec<CdpTargetSession> = self
            .inner
            .sessions
            .read()
            .await
            .values()
            .filter(|s| s.ready.load(Ordering::Relaxed))
            .cloned()
            .collect();

        let mut results = Vec::new();
        for s in sessions {
            s.refresh_preload_script(if enabled { Some(&script) } else { None })
                .await;
            let res = s.evaluate(&script, true).await;
            s.last_heal_at.store(now_ms(), Ordering::Relaxed);
            let val = res
                .and_then(|r| r.get("result").and_then(|x| x.get("value")).cloned())
                .unwrap_or(Value::Null);
            results.push(json!({ "id": s.id, "kind": s.kind, "value": val }));
        }
        json!({ "ok": true, "count": results.len(), "results": results })
    }

    pub async fn disable_all(&self) -> Value {
        self.inner.is_disabled.store(true, Ordering::Relaxed);
        let script = build_remove_script();
        let sessions: Vec<CdpTargetSession> = self
            .inner
            .sessions
            .read()
            .await
            .values()
            .filter(|s| s.ready.load(Ordering::Relaxed))
            .cloned()
            .collect();
        let mut results = Vec::new();
        for s in sessions {
            s.refresh_preload_script(None).await;
            let res = s.evaluate(&script, true).await;
            let val = res
                .and_then(|r| r.get("result").and_then(|x| x.get("value")).cloned())
                .unwrap_or(Value::Null);
            results.push(json!({ "id": s.id, "kind": s.kind, "value": val }));
        }
        json!({ "ok": true, "count": results.len(), "results": results })
    }

    pub async fn inspect_targets(&self) -> Vec<Value> {
        let expr = r#"(() => ({
  url: location.href.slice(0, 120),
  hasStudioStyle: !!document.getElementById('agy-studio-style'),
  hasBgLayer: !!document.getElementById('agy-studio-bg-layer'),
  hasVideo: !!document.getElementById('agy-studio-bg-video'),
  hasMascot: !!document.getElementById('agy-studio-mascot'),
  hasShell: !!document.querySelector('.agy-shell'),
  hasWorkbench: !!document.querySelector('.monaco-workbench'),
  hasBrowserHole: document.body.getAttribute('data-has-browser-hole') || null
}))()"#;
        let sessions: Vec<CdpTargetSession> = self
            .inner
            .sessions
            .read()
            .await
            .values()
            .filter(|s| s.ready.load(Ordering::Relaxed))
            .cloned()
            .collect();
        let mut list = Vec::new();
        for s in sessions {
            let info = s
                .evaluate(expr, true)
                .await
                .and_then(|r| r.get("result").and_then(|x| x.get("value")).cloned())
                .unwrap_or(Value::Null);
            list.push(json!({ "id": s.id, "kind": s.kind, "info": info }));
        }
        list
    }
}
