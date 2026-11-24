import React, { useEffect, useRef, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Download,
  ExternalLink,
  FolderOpen,
  Globe,
  Loader2,
  RotateCw,
  Sparkles,
} from 'lucide-react';

const QUICK_SITES = [
  { id: 'moewalls', label: 'MoeWalls', url: 'https://moewalls.com/', badge: 'Anime 4K' },
  { id: 'motionbgs', label: 'MotionBGs', url: 'https://motionbgs.com/', badge: 'Live MP4' },
  { id: 'pixabay', label: 'Pixabay 4K', url: 'https://pixabay.com/videos/', badge: 'Free HD' },
  { id: 'pexels', label: 'Pexels Video', url: 'https://www.pexels.com/videos/', badge: 'Cinema' },
  { id: 'wallhaven', label: 'Wallhaven', url: 'https://wallhaven.cc/', badge: '2K/4K Art' },
  { id: 'tenor', label: 'Tenor GIFs', url: 'https://tenor.com/search/anime-chibi-stickers', badge: 'Mascot' },
  { id: 'giphy', label: 'Giphy Stickers', url: 'https://giphy.com/stickers', badge: 'Sticker' },
];

export default function WebBrowserTab({
  downloadProgress,
  recentDownloads = [],
  onApplyDownloaded,
  onOpenExtraFolder,
  onOpenDemo,
  onShowToast,
}) {
  const webviewRef = useRef(null);
  const [activeSite, setActiveSite] = useState('moewalls');
  const [urlInput, setUrlInput] = useState(QUICK_SITES[0].url);
  const [currentUrl, setCurrentUrl] = useState(QUICK_SITES[0].url);
  const [isLoading, setIsLoading] = useState(false);
  const [canBack, setCanBack] = useState(false);
  const [canForward, setCanForward] = useState(false);
  const [grabbingUrl, setGrabbingUrl] = useState(false);

  useEffect(() => {
    const wv = webviewRef.current;
    if (!wv) return;

    const syncNav = (nextUrl) => {
      if (nextUrl) {
        setUrlInput(nextUrl);
        setCurrentUrl(nextUrl);
      }
      try {
        setCanBack(typeof wv.canGoBack === 'function' ? wv.canGoBack() : false);
        setCanForward(typeof wv.canGoForward === 'function' ? wv.canGoForward() : false);
      } catch (_) {}
    };

    const onStart = () => setIsLoading(true);
    const onStop = () => {
      setIsLoading(false);
      syncNav();
    };
    const onNav = (e) => syncNav(e.url);
    const onNewWindow = (e) => {
      if (e.url) {
        try {
          wv.loadURL(e.url);
        } catch (_) {}
      }
    };

    wv.addEventListener('did-start-loading', onStart);
    wv.addEventListener('did-stop-loading', onStop);
    wv.addEventListener('did-navigate', onNav);
    wv.addEventListener('did-navigate-in-page', onNav);
    wv.addEventListener('new-window', onNewWindow);

    return () => {
      wv.removeEventListener('did-start-loading', onStart);
      wv.removeEventListener('did-stop-loading', onStop);
      wv.removeEventListener('did-navigate', onNav);
      wv.removeEventListener('did-navigate-in-page', onNav);
      wv.removeEventListener('new-window', onNewWindow);
    };
  }, []);

  const navigateTo = (rawUrl, siteId = '') => {
    let target = String(rawUrl || '').trim();
    if (!target) return;
    if (!/^https?:\/\//i.test(target)) {
      target = target.includes('.') && !target.includes(' ')
        ? `https://${target}`
        : `https://www.google.com/search?q=${encodeURIComponent(target)}`;
    }
    if (siteId) setActiveSite(siteId);
    setUrlInput(target);
    setCurrentUrl(target);
    const wv = webviewRef.current;
    if (wv && typeof wv.loadURL === 'function') {
      try {
        wv.loadURL(target);
      } catch (_) {}
    }
  };

  const handleDirectGrab = async () => {
    const target = currentUrl || urlInput;
    if (!target || grabbingUrl) return;
    setGrabbingUrl(true);
    try {
      const res = await window.studioAPI?.onlineDownload?.({
        url: target,
        applyTarget: 'both',
      });
      if (res?.ok && res?.theme) {
        onApplyDownloaded?.({ kind: 'theme', item: res.theme, state: res.state });
        onShowToast?.(`Đã tải & áp dụng "${res.theme.name}" từ trình duyệt!`);
      } else {
        onShowToast?.(
          res?.error
            ? `Không bắt được luồng trực tiếp: ${res.error} — Hãy bấm nút Download trên trang web.`
            : 'Hãy bấm nút Download trực tiếp trên trang web để Studio tự nạp!'
        );
      }
    } catch (err) {
      onShowToast?.(`Không thể tải trực tiếp: ${err.message}`);
    } finally {
      setGrabbingUrl(false);
    }
  };

  return (
    <section className="browser-shell">
      {/* Top Address Toolbar (Exact 1:1 Match to Reference Video frames 7-10!) */}
      <div className="browser-nav-bar">
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <button type="button" className="icon-btn" disabled={!canBack} onClick={() => webviewRef.current?.goBack?.()} title="Quay lại">
            <ArrowLeft size={12} />
          </button>
          <button type="button" className="icon-btn" disabled={!canForward} onClick={() => webviewRef.current?.goForward?.()} title="Tiến tới">
            <ArrowRight size={12} />
          </button>
          <button type="button" className="icon-btn" onClick={() => (isLoading ? webviewRef.current?.stop?.() : webviewRef.current?.reload?.())} title="Tải lại">
            <RotateCw size={12} className={isLoading ? 'spin' : ''} />
          </button>
        </div>

        <form
          className="browser-url-form"
          onSubmit={(e) => {
            e.preventDefault();
            navigateTo(urlInput);
          }}
        >
          <Globe size={13} color="var(--ink-muted)" />
          <input
            type="text"
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            placeholder="Nhập địa chỉ web hình nền động (.mp4, .webm, .gif)..."
          />
          {isLoading && <Loader2 size={12} className="spin" color="var(--studio-accent)" />}
        </form>

        <button
          type="button"
          className="btn btn-accent btn-sm"
          disabled={grabbingUrl}
          onClick={handleDirectGrab}
          title="Thử trích xuất video trực tiếp từ trang hiện tại"
        >
          {grabbingUrl ? <Loader2 size={12} className="spin" /> : <Download size={12} />}
          <span>{grabbingUrl ? 'Đang bắt...' : 'Tải Video Trang'}</span>
        </button>

        {onOpenDemo && (
          <button type="button" className="btn btn-sm" onClick={onOpenDemo} title="Quay về Live Preview & Bộ Sưu Tập">
            <Sparkles size={12} color="var(--studio-accent)" />
            <span>Xem Demo</span>
          </button>
        )}

        <button type="button" className="btn btn-sm" onClick={onOpenExtraFolder} title="Mở thư mục lưu theme tải về">
          <FolderOpen size={12} />
        </button>
      </div>

      {/* Quick Sites Strip right underneath Address Bar (Exact Match to Reference Video!) */}
      <div className="browser-sites-bar">
        <span style={{ fontSize: 10.5, fontWeight: 650, color: 'var(--ink-muted)', flexShrink: 0 }}>
          Kho Web Nổi Tiếng
        </span>
        <div className="browser-sites-list">
          {QUICK_SITES.map((site) => (
            <button
              key={site.id}
              type="button"
              className={`browser-site-chip ${activeSite === site.id ? 'active' : ''}`}
              onClick={() => navigateTo(site.url, site.id)}
            >
              <span>{site.label}</span>
              <span className="browser-site-tag">{site.badge}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Live Auto-Intercept Download Status */}
      {downloadProgress && downloadProgress.state === 'progressing' && (
        <div className="browser-dl-bar">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
            <Loader2 size={13} className="spin" color="var(--studio-accent)" />
            <span style={{ fontSize: 11.5, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              Đang tự động nạp vào Kho: {downloadProgress.filename}
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
            <div className="browser-dl-track">
              <div className="browser-dl-fill" style={{ width: `${downloadProgress.percent || 15}%` }} />
            </div>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--studio-accent)' }}>
              {downloadProgress.percent || 15}%
            </span>
          </div>
        </div>
      )}

      {/* Recently Downloaded Strip */}
      {recentDownloads.length > 0 && (
        <div className="browser-recent-strip">
          <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--ink-secondary)', display: 'inline-flex', alignItems: 'center', gap: 5, flexShrink: 0 }}>
            <Sparkles size={12} color="var(--studio-accent)" />
            Vừa tải tự động:
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, overflowX: 'auto' }}>
            {recentDownloads.slice(0, 4).map((dl) => (
              <div key={dl.id} className="browser-recent-pill">
                <Check size={11} color="#34d399" />
                <span title={dl.filename}>{dl.item?.name || dl.filename}</span>
                {dl.item && (
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    style={{ height: 22, padding: '0 8px', fontSize: 10.5 }}
                    onClick={() => onApplyDownloaded?.(dl)}
                  >
                    Áp dụng ngay
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tip Banner */}
      <div className="browser-hint-line">
        <span>
          Bấm nút <strong>Download (.mp4 / .webm / .jpg / .gif)</strong> trên bất kỳ trang nào phía dưới — Studio sẽ <strong>tự động chặn tải & nạp thẳng vào Kho Chủ Đề</strong> (hoặc Linh Vật nếu là GIF/Sticker).
        </span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: 'var(--ink-muted)', flexShrink: 0 }}>
          <ExternalLink size={11} />
          Tích hợp Webview
        </span>
      </div>

      {/* Live Embedded Chromium Webview */}
      <div className="browser-webview-wrap">
        <webview
          ref={webviewRef}
          src={QUICK_SITES[0].url}
          allowpopups="true"
          className="browser-webview"
          style={{ width: '100%', height: '100%' }}
        />
      </div>
    </section>
  );
}
