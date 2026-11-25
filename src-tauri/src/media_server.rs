use axum::{
    body::Body,
    extract::{Path as AxumPath, Query, State},
    http::{header, HeaderMap, HeaderValue, Method, StatusCode},
    response::{IntoResponse, Response},
    routing::{any, get},
    Json, Router,
};
use serde::Deserialize;
use serde_json::{json, Value};
use std::{
    collections::HashMap,
    net::SocketAddr,
    path::{Path, PathBuf},
    sync::{Arc, RwLock},
};
use tokio::{
    fs::File,
    io::{AsyncReadExt, AsyncSeekExt, SeekFrom},
    net::TcpListener,
};
use tokio_util::io::ReaderStream;

pub type ControlCallback = Arc<dyn Fn(&str) -> Value + Send + Sync>;

struct InnerServer {
    port: u16,
    registry: RwLock<HashMap<String, PathBuf>>,
    control_token: RwLock<String>,
    on_control: RwLock<Option<ControlCallback>>,
}

#[derive(Clone)]
pub struct LocalMediaServer {
    inner: Arc<InnerServer>,
}

#[derive(Deserialize)]
struct TokenQuery {
    token: Option<String>,
}

fn mime_for_path(p: &Path) -> &'static str {
    match p
        .extension()
        .and_then(|e| e.to_str())
        .map(|s| s.to_ascii_lowercase())
        .as_deref()
    {
        Some("mp4") | Some("m4v") => "video/mp4",
        Some("webm") => "video/webm",
        Some("mov") => "video/quicktime",
        Some("ogg") => "video/ogg",
        Some("gif") => "image/gif",
        Some("webp") => "image/webp",
        Some("png") => "image/png",
        Some("jpg") | Some("jpeg") => "image/jpeg",
        Some("svg") => "image/svg+xml",
        Some("avif") => "image/avif",
        Some("bmp") => "image/bmp",
        _ => "application/octet-stream",
    }
}

fn apply_cors_headers(headers: &mut HeaderMap) {
    headers.insert(header::ACCESS_CONTROL_ALLOW_ORIGIN, HeaderValue::from_static("*"));
    headers.insert(
        header::ACCESS_CONTROL_ALLOW_METHODS,
        HeaderValue::from_static("GET, HEAD, POST, OPTIONS"),
    );
    headers.insert(
        header::ACCESS_CONTROL_ALLOW_HEADERS,
        HeaderValue::from_static("Range, Content-Type"),
    );
    headers.insert(
        header::HeaderName::from_static("cross-origin-resource-policy"),
        HeaderValue::from_static("cross-origin"),
    );
}

impl LocalMediaServer {
    pub async fn start() -> Result<Self, String> {
        let listener = TcpListener::bind("127.0.0.1:0")
            .await
            .map_err(|e| format!("Failed to bind local media server: {e}"))?;
        let addr: SocketAddr = listener
            .local_addr()
            .map_err(|e| format!("Failed to read bound media server port: {e}"))?;

        let server = Self {
            inner: Arc::new(InnerServer {
                port: addr.port(),
                registry: RwLock::new(HashMap::new()),
                control_token: RwLock::new(String::new()),
                on_control: RwLock::new(None),
            }),
        };

        let app = Router::new()
            .route("/health", get(handle_health))
            .route("/media/{id}", any(handle_media))
            .route("/__studio/{action}", any(handle_control))
            .with_state(server.clone());

        tokio::spawn(async move {
            let _ = axum::serve(listener, app).await;
        });

        Ok(server)
    }

    pub fn port(&self) -> u16 {
        self.inner.port
    }

    pub fn set_control(&self, token: String, cb: ControlCallback) {
        if let Ok(mut t) = self.inner.control_token.write() {
            *t = token;
        }
        if let Ok(mut f) = self.inner.on_control.write() {
            *f = Some(cb);
        }
    }

    pub fn register(&self, id: &str, file_path: &Path) -> String {
        if id.is_empty() {
            return String::new();
        }
        if let Ok(mut map) = self.inner.registry.write() {
            map.insert(id.to_string(), file_path.to_path_buf());
        }
        self.get_url(id)
    }

    pub fn get_url(&self, id: &str) -> String {
        if self.inner.port == 0 || id.is_empty() {
            return String::new();
        }
        format!(
            "http://127.0.0.1:{}/media/{}",
            self.inner.port,
            urlencoding::encode(id)
        )
    }
}

async fn handle_health(State(state): State<LocalMediaServer>) -> Response {
    let count = state.inner.registry.read().map(|m| m.len()).unwrap_or(0);
    let mut resp = Json(json!({ "ok": true, "count": count })).into_response();
    apply_cors_headers(resp.headers_mut());
    resp
}

async fn handle_control(
    method: Method,
    AxumPath(action): AxumPath<String>,
    Query(q): Query<TokenQuery>,
    State(state): State<LocalMediaServer>,
) -> Response {
    if method == Method::OPTIONS {
        let mut resp = StatusCode::NO_CONTENT.into_response();
        apply_cors_headers(resp.headers_mut());
        return resp;
    }

    let expected = state
        .inner
        .control_token
        .read()
        .map(|s| s.clone())
        .unwrap_or_default();
    let got = q.token.unwrap_or_default();
    if expected.is_empty() || got != expected {
        let mut resp = (
            StatusCode::FORBIDDEN,
            Json(json!({ "ok": false, "error": "forbidden" })),
        )
            .into_response();
        apply_cors_headers(resp.headers_mut());
        return resp;
    }

    let extra = state
        .inner
        .on_control
        .read()
        .ok()
        .and_then(|g| g.as_ref().cloned())
        .map(|cb| cb(&action))
        .unwrap_or_else(|| json!({}));

    let mut body = json!({ "ok": true, "pid": std::process::id() });
    if let (Some(dst), Some(src)) = (body.as_object_mut(), extra.as_object()) {
        for (k, v) in src {
            dst.insert(k.clone(), v.clone());
        }
    }

    let mut resp = Json(body).into_response();
    apply_cors_headers(resp.headers_mut());
    resp
}

async fn handle_media(
    method: Method,
    AxumPath(raw_id): AxumPath<String>,
    req_headers: HeaderMap,
    State(state): State<LocalMediaServer>,
) -> Response {
    if method == Method::OPTIONS {
        let mut resp = StatusCode::NO_CONTENT.into_response();
        apply_cors_headers(resp.headers_mut());
        return resp;
    }
    if method != Method::GET && method != Method::HEAD {
        let mut resp = StatusCode::METHOD_NOT_ALLOWED.into_response();
        apply_cors_headers(resp.headers_mut());
        return resp;
    }

    let decoded_id = urlencoding::decode(&raw_id)
        .map(|c| c.into_owned())
        .unwrap_or(raw_id);

    let file_path = state
        .inner
        .registry
        .read()
        .ok()
        .and_then(|m| m.get(&decoded_id).cloned());

    let Some(path) = file_path else {
        let mut resp = (StatusCode::NOT_FOUND, "Media not found").into_response();
        apply_cors_headers(resp.headers_mut());
        return resp;
    };

    let meta = match tokio::fs::metadata(&path).await {
        Ok(m) if m.is_file() => m,
        _ => {
            let mut resp = (StatusCode::NOT_FOUND, "Media file missing").into_response();
            apply_cors_headers(resp.headers_mut());
            return resp;
        }
    };

    let total = meta.len();
    let content_type = mime_for_path(&path);

    if let Some(range_val) = req_headers.get(header::RANGE).and_then(|v| v.to_str().ok()) {
        if let Some(spec) = range_val.strip_prefix("bytes=") {
            let mut parts = spec.splitn(2, '-');
            let start_s = parts.next().unwrap_or("").trim();
            let end_s = parts.next().unwrap_or("").trim();
            let start = start_s.parse::<u64>().ok();
            let end = if end_s.is_empty() {
                Some(total.saturating_sub(1))
            } else {
                end_s.parse::<u64>().ok()
            };

            if let (Some(s), Some(e)) = (start, end) {
                if total == 0 || s >= total || e >= total || s > e {
                    let mut resp = StatusCode::RANGE_NOT_SATISFIABLE.into_response();
                    apply_cors_headers(resp.headers_mut());
                    if let Ok(hv) = HeaderValue::from_str(&format!("bytes */{total}")) {
                        resp.headers_mut().insert(header::CONTENT_RANGE, hv);
                    }
                    return resp;
                }

                let chunk_size = e - s + 1;
                let builder = Response::builder()
                    .status(StatusCode::PARTIAL_CONTENT)
                    .header(header::CONTENT_TYPE, content_type)
                    .header(header::ACCEPT_RANGES, "bytes")
                    .header(header::CONTENT_LENGTH, chunk_size.to_string())
                    .header(header::CONTENT_RANGE, format!("bytes {s}-{e}/{total}"))
                    .header(header::CACHE_CONTROL, "no-cache");

                let body = if method == Method::HEAD {
                    Body::empty()
                } else {
                    match File::open(&path).await {
                        Ok(mut f) => {
                            if f.seek(SeekFrom::Start(s)).await.is_err() {
                                let mut resp = StatusCode::INTERNAL_SERVER_ERROR.into_response();
                                apply_cors_headers(resp.headers_mut());
                                return resp;
                            }
                            let stream = ReaderStream::new(f.take(chunk_size));
                            Body::from_stream(stream)
                        }
                        Err(_) => {
                            let mut resp = StatusCode::INTERNAL_SERVER_ERROR.into_response();
                            apply_cors_headers(resp.headers_mut());
                            return resp;
                        }
                    }
                };

                if let Ok(mut resp) = builder.body(body) {
                    apply_cors_headers(resp.headers_mut());
                    return resp;
                }
            }
        }
    }

    let body = if method == Method::HEAD {
        Body::empty()
    } else {
        match File::open(&path).await {
            Ok(f) => Body::from_stream(ReaderStream::new(f)),
            Err(_) => {
                let mut resp = StatusCode::INTERNAL_SERVER_ERROR.into_response();
                apply_cors_headers(resp.headers_mut());
                return resp;
            }
        }
    };

    let mut resp = Response::builder()
        .status(StatusCode::OK)
        .header(header::CONTENT_TYPE, content_type)
        .header(header::ACCEPT_RANGES, "bytes")
        .header(header::CONTENT_LENGTH, total.to_string())
        .header(header::CACHE_CONTROL, "no-cache")
        .body(body)
        .unwrap_or_else(|_| StatusCode::INTERNAL_SERVER_ERROR.into_response());
    apply_cors_headers(resp.headers_mut());
    resp
}
