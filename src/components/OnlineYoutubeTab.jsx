import React, { useEffect, useState } from 'react';
import {
  Code2,
  Download,
  Globe,
  Link2,
  Loader2,
  MessageSquare,
  Search,
  Sparkles,
  Youtube,
} from 'lucide-react';

const QUICK_SEARCHES = [
  'Anime Live Wallpaper 4K Loop',
  'Cyberpunk Rain City Live Wallpaper 4K',
  'Sakura Night Live Wallpaper Anime',
  'Lofi Cozy Room Night Loop',
  'Fantasy Forest Fireflies Live Wallpaper',
  'Space Nebula 4K Loop Background',
  'Samurai Sunset Live Wallpaper 4K',
];

export default function OnlineYoutubeTab({
  onlineBins,
  onDownloaded,
  onShowToast,
}) {
  const [subTab, setSubTab] = useState('youtube'); // 'youtube' | 'url'
  const [searchQuery, setSearchQuery] = useState('Anime Live Wallpaper 4K Loop');
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState([]);
  const [searchError, setSearchError] = useState('');

  const [directUrl, setDirectUrl] = useState('');
  const [inspecting, setInspecting] = useState(false);
  const [urlInfo, setUrlInfo] = useState(null);
  const [urlError, setUrlError] = useState('');

  // Download options
  const [quality, setQuality] = useState('1440');
  const [durationSec, setDurationSec] = useState(25);
  const [startSec, setStartSec] = useState(0);
  const [keepAudio, setKeepAudio] = useState(false);

  const [downloadingId, setDownloadingId] = useState('');
  const [progress, setProgress] = useState({ percent: 0, stage: '' });

  useEffect(() => {
    const off = window.studioAPI?.onDownloadProgress?.((p) => {
      if (p) setProgress(p);
    });
    return () => off?.();
  }, []);

  const handleSearch = async (overrideQuery) => {
    const q = (overrideQuery !== undefined ? overrideQuery : searchQuery).trim();
    if (!q) return;
    if (overrideQuery !== undefined) setSearchQuery(overrideQuery);
    setSearching(true);
    setSearchError('');
    try {
      const res = await window.studioAPI.onlineSearch(q);
      if (res?.ok) {
        setResults(res.items || []);
        if (!res.items?.length) setSearchError('Không tìm thấy video phù hợp. Thử từ khóa khác nhé!');
      } else {
        setSearchError(res?.error || 'Không thể tìm kiếm YouTube lúc này.');
      }
    } finally {
      setSearching(false);
    }
  };

  const handleInspectUrl = async () => {
    if (!directUrl.trim()) return;
    setInspecting(true);
    setUrlError('');
    setUrlInfo(null);
    try {
      const res = await window.studioAPI.onlineInspect(directUrl.trim());
      if (res?.ok) setUrlInfo(res.info);
      else setUrlError(res?.error || 'Không đọc được thông tin từ đường link này.');
    } finally {
      setInspecting(false);
    }
  };

  const handleDownload = async ({ id, url, title, applyTarget }) => {
    if (downloadingId) return;
    setDownloadingId(id || url);
    setProgress({ percent: 4, stage: 'Đang chuẩn bị tải video...' });
    try {
      const res = await window.studioAPI.onlineDownload({
        url,
        title,
        quality,
        durationSec,
        startSec,
        keepAudio,
        applyTarget,
      });
      if (res?.ok) {
        onDownloaded(res.state, res.theme, applyTarget);
        onShowToast(
          applyTarget === 'chat'
            ? `✨ Đã tải xong & đặt "${res.theme?.name}" cho Chat App!`
            : applyTarget === 'ide'
            ? `✨ Đã tải xong & đặt "${res.theme?.name}" cho Code Editor!`
            : `✨ Đã tải "${res.theme?.name}" vào Bộ Sưu Tập!`
        );
      } else {
        onShowToast('Lỗi tải video: ' + (res?.error || 'Không rõ nguyên nhân'));
      }
    } finally {
      setDownloadingId('');
      setTimeout(() => setProgress({ percent: 0, stage: '' }), 1800);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* Header Banner */}
      <div className="card-box">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
          <div>
            <div className="card-title" style={{ fontSize: 14 }}>
              <Youtube size={16} color="#f43f5e" />
              <span>Kho Video YouTube & Tải Chủ Đề Từ Internet</span>
            </div>
            <div className="card-desc">
              Tìm trực tiếp Live Wallpaper 4K/HD trên YouTube hoặc dán link YouTube / MP4 / WebM — tự động cắt vòng lặp mượt & lưu thẳng vào thư viện.
            </div>
          </div>

          <div className="demo-mode-tabs">
            <button
              type="button"
              className={`mode-tab ${subTab === 'youtube' ? 'active-ide' : ''}`}
              onClick={() => setSubTab('youtube')}
            >
              <Youtube size={12} />
              <span>Tìm YouTube</span>
            </button>
            <button
              type="button"
              className={`mode-tab ${subTab === 'url' ? 'active-chat' : ''}`}
              onClick={() => setSubTab('url')}
            >
              <Link2 size={12} />
              <span>Dán Link URL</span>
            </button>
          </div>
        </div>

        {/* Shared Download Quality / Loop Controls */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
            gap: 10,
            paddingTop: 6,
            borderTop: '1px solid rgba(255,255,255,0.08)',
          }}
        >
          <div>
            <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 4 }}>Chất Lượng Video</div>
            <select className="studio-select" value={quality} onChange={(e) => setQuality(e.target.value)}>
              <option value="2160">4K Ultra HD (2160p - Cực nét)</option>
              <option value="1440">2K QHD (1440p - Khuyên dùng)</option>
              <option value="1080">Full HD (1080p)</option>
              <option value="720">HD (720p - Nhẹ)</option>
            </select>
          </div>

          <div>
            <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 4 }}>Độ Dài Vòng Lặp (Cắt Mượt)</div>
            <select
              className="studio-select"
              value={durationSec}
              onChange={(e) => setDurationSec(Number(e.target.value))}
            >
              <option value={15}>15 giây (Siêu nhẹ ~5MB)</option>
              <option value={25}>25 giây (Khuyên dùng ~8MB)</option>
              <option value={45}>45 giây (Dài & mượt)</option>
              <option value={0}>Tải toàn bộ video</option>
            </select>
          </div>

          <div>
            <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 4 }}>Bắt Đầu Từ Giây Thứ</div>
            <input
              type="number"
              min={0}
              max={3600}
              className="studio-input"
              value={startSec}
              onChange={(e) => setStartSec(Math.max(0, Number(e.target.value) || 0))}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <div className="toggle-row">
              <span style={{ fontSize: 11.5, fontWeight: 600 }}>Giữ âm thanh gốc</span>
              <button
                type="button"
                className={`toggle-switch ${keepAudio ? 'on' : ''}`}
                onClick={() => setKeepAudio(!keepAudio)}
              />
            </div>
            <div style={{ fontSize: 10, color: '#64748b', marginTop: 3 }}>
              yt-dlp: {onlineBins?.hasYtdlp ? 'Sẵn sàng ✓' : 'Chưa có'} • ffmpeg: {onlineBins?.hasFfmpeg ? 'Sẵn sàng ✓' : 'Tắt cắt'}
            </div>
          </div>
        </div>

        {/* Live Progress Bar */}
        {(downloadingId || progress.percent > 0) && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, paddingTop: 4 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11.5, color: '#67e8f9', fontWeight: 700 }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <Loader2 size={13} className="spin" />
                {progress.stage || 'Đang xử lý...'}
              </span>
              <span>{progress.percent}%</span>
            </div>
            <div style={{ width: '100%', height: 7, borderRadius: 999, background: 'rgba(15,23,42,0.8)', overflow: 'hidden' }}>
              <div
                style={{
                  width: `${progress.percent}%`,
                  height: '100%',
                  background: 'linear-gradient(90deg, #8b5cf6, #06b6d4, #ec4899)',
                  transition: 'width 0.25s ease',
                }}
              />
            </div>
          </div>
        )}
      </div>

      {subTab === 'youtube' ? (
        <div className="card-box">
          <div style={{ display: 'flex', gap: 8 }}>
            <div className="search-wrap" style={{ maxWidth: 'none', flex: 1, height: 38 }}>
              <Search size={15} color="#94a3b8" />
              <input
                type="text"
                placeholder="Nhập từ khóa tìm Live Wallpaper trên YouTube (vd: Anime cyberpunk rain 4k loop)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              />
            </div>
            <button
              type="button"
              className="btn btn-primary"
              disabled={searching}
              onClick={() => handleSearch()}
            >
              {searching ? <Loader2 size={14} className="spin" /> : <Search size={14} />}
              <span>{searching ? 'Đang Tìm...' : 'Tìm YouTube'}</span>
            </button>
          </div>

          {/* Quick Topic Chips */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {QUICK_SEARCHES.map((chip) => (
              <button
                key={chip}
                type="button"
                className="filter-pill"
                style={{ fontSize: 11, padding: '4px 10px' }}
                onClick={() => handleSearch(chip)}
              >
                <Sparkles size={10} style={{ marginRight: 4, verticalAlign: 'middle', color: '#c084fc' }} />
                {chip}
              </button>
            ))}
          </div>

          {searchError && (
            <div style={{ fontSize: 12, color: '#fca5a5', padding: '8px 12px', borderRadius: 9, background: 'rgba(239,68,68,0.12)' }}>
              {searchError}
            </div>
          )}

          {results.length > 0 && (
            <div className="theme-grid" style={{ marginTop: 4 }}>
              {results.map((item) => {
                const isBusy = downloadingId === item.id;
                return (
                  <div key={item.id} className="theme-card" style={{ cursor: 'default' }}>
                    <div className="theme-thumb" style={{ cursor: 'default' }}>
                      <img src={item.thumbnail} alt={item.title} loading="lazy" />
                      <div className="theme-thumb-gradient" />
                      <div className="thumb-badges-left">
                        <span className="mini-badge video">YOUTUBE</span>
                      </div>
                      <div className="theme-overlay-meta">
                        <div className="theme-overlay-top">
                          <div className="theme-name" title={item.title}>{item.title}</div>
                          {item.durationString && <span className="theme-size-pill">{item.durationString}</span>}
                        </div>
                        <div className="theme-concept">{item.channel}</div>
                      </div>
                    </div>
                    <div className="theme-split-bar">
                      <button
                        type="button"
                        className="assign-btn active-chat"
                        disabled={Boolean(downloadingId)}
                        onClick={() =>
                          handleDownload({
                            id: item.id,
                            url: item.url,
                            title: item.title,
                            applyTarget: 'both',
                          })
                        }
                      >
                        {isBusy ? <Loader2 size={11} className="spin" /> : <Download size={11} />}
                        <span>Tải & Áp dụng</span>
                      </button>
                      <button
                        type="button"
                        className="assign-btn"
                        disabled={Boolean(downloadingId)}
                        onClick={() =>
                          handleDownload({
                            id: item.id,
                            url: item.url,
                            title: item.title,
                            applyTarget: '',
                          })
                        }
                      >
                        {isBusy ? <Loader2 size={11} className="spin" /> : <Code2 size={11} />}
                        <span>Lưu vào kho</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        <div className="card-box">
          <div className="card-title">
            <Globe size={16} color="#06b6d4" />
            <span>Dán Link YouTube, YouTube Shorts hoặc Link Trực Tiếp (.MP4 / .WebM / Ảnh)</span>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              type="text"
              className="studio-input"
              placeholder="https://www.youtube.com/watch?v=... hoặc https://.../wallpaper.mp4"
              value={directUrl}
              onChange={(e) => setDirectUrl(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleInspectUrl()}
            />
            <button type="button" className="btn" disabled={inspecting} onClick={handleInspectUrl}>
              {inspecting ? <Loader2 size={14} className="spin" /> : <Search size={14} />}
              <span>Kiểm Tra Link</span>
            </button>
            <button
              type="button"
              className="btn btn-primary"
              disabled={Boolean(downloadingId) || !directUrl.trim()}
              onClick={() =>
                handleDownload({
                  id: 'direct',
                  url: directUrl.trim(),
                  title: urlInfo?.title || '',
                  applyTarget: 'chat',
                })
              }
            >
              <Download size={14} />
              <span>Tải & Áp Dụng Ngay</span>
            </button>
          </div>

          {urlError && (
            <div style={{ fontSize: 12, color: '#fca5a5', padding: '8px 12px', borderRadius: 9, background: 'rgba(239,68,68,0.12)' }}>
              {urlError}
            </div>
          )}

          {urlInfo && (
            <div
              style={{
                display: 'flex',
                gap: 14,
                padding: 12,
                borderRadius: 12,
                background: 'rgba(9,11,20,0.72)',
                border: '1px solid rgba(6,182,212,0.35)',
                alignItems: 'center',
              }}
            >
              {urlInfo.thumbnail && (
                <img
                  src={urlInfo.thumbnail}
                  alt={urlInfo.title}
                  style={{ width: 170, aspectRatio: '16/9', objectFit: 'cover', borderRadius: 9 }}
                />
              )}
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
                <div style={{ fontSize: 13.5, fontWeight: 700, color: '#fff' }}>{urlInfo.title}</div>
                <div style={{ fontSize: 11.5, color: '#94a3b8' }}>
                  {urlInfo.channel || 'Internet'} • {urlInfo.durationString || 'HD Media'}
                </div>
                <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                  <button
                    type="button"
                    className="btn btn-cyan btn-sm"
                    disabled={Boolean(downloadingId)}
                    onClick={() =>
                      handleDownload({
                        id: 'direct-chat',
                        url: directUrl.trim(),
                        title: urlInfo.title,
                        applyTarget: 'chat',
                      })
                    }
                  >
                    <MessageSquare size={12} />
                    <span>Tải & Đặt Chat</span>
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    disabled={Boolean(downloadingId)}
                    onClick={() =>
                      handleDownload({
                        id: 'direct-ide',
                        url: directUrl.trim(),
                        title: urlInfo.title,
                        applyTarget: 'ide',
                      })
                    }
                  >
                    <Code2 size={12} />
                    <span>Tải & Đặt IDE</span>
                  </button>
                  <button
                    type="button"
                    className="btn btn-sm"
                    disabled={Boolean(downloadingId)}
                    onClick={() =>
                      handleDownload({
                        id: 'direct-both',
                        url: directUrl.trim(),
                        title: urlInfo.title,
                        applyTarget: 'both',
                      })
                    }
                  >
                    <Download size={12} />
                    <span>Đặt Cho Cả Hai</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
