import React, { useMemo, useRef, useState } from 'react';
import {
  Bookmark,
  BookmarkPlus,
  Check,
  Code2,
  FolderOpen,
  FolderPlus,
  MessageSquare,
  Monitor,
  RefreshCw,
  Search,
  Star,
  Trash2,
} from 'lucide-react';
import { formatBytes } from '../data/presets';

function ThemeCard({
  theme,
  unifiedFullWindow,
  isChatActive,
  isIdeActive,
  isDesktopActive,
  inPlaylist,
  onSetUnified,
  onSetChat,
  onSetIde,
  onSetDesktop,
  onHoverTheme,
  onTogglePlaylist,
  onDelete,
}) {
  const [isHovered, setIsHovered] = useState(false);
  const isVideo = theme.mediaType === 'video';
  const isUnifiedActive = unifiedFullWindow && isChatActive;
  const isActive = unifiedFullWindow ? isUnifiedActive : isChatActive || isIdeActive;

  const resBadge = theme.resBadge || (isVideo ? 'FHD' : '2K QHD');
  const fpsBadge = theme.fpsBadge || (isVideo ? '60 FPS' : theme.mediaType === 'gif' ? 'GIF' : 'STATIC');

  return (
    <div
      className={`theme-card ${isActive ? 'active-any' : ''}`}
      onMouseEnter={() => {
        setIsHovered(true);
        onHoverTheme?.(theme);
      }}
      onMouseLeave={() => {
        setIsHovered(false);
        onHoverTheme?.(null);
      }}
      onClick={() => (unifiedFullWindow ? onSetUnified(theme) : onSetChat(theme))}
      title="Rê chuột xem chạy thử trên Live Preview • Bấm để áp dụng"
    >
      <div className="theme-thumb">
        {theme.mediaUrl ? (
          isVideo ? (
            isHovered ? (
              <video
                src={theme.mediaUrl}
                poster={theme.posterUrl || undefined}
                autoPlay
                muted
                loop
                playsInline
              />
            ) : theme.posterUrl ? (
              <img src={theme.posterUrl} alt={theme.name} loading="lazy" decoding="async" />
            ) : (
              <div
                style={{
                  width: '100%',
                  height: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: `radial-gradient(circle at 35% 30%, ${theme.accent || '#8b5cf6'}45, #090d1a 82%)`,
                  color: 'rgba(255,255,255,0.72)',
                  fontSize: 10.5,
                  fontWeight: 650,
                  letterSpacing: '0.06em',
                }}
              >
                LIVE VIDEO
              </div>
            )
          ) : (
            <img src={theme.mediaUrl} alt={theme.name} loading="lazy" decoding="async" />
          )
        ) : (
          <div
            style={{
              width: '100%',
              height: '100%',
              background:
                theme.pureBg ||
                `linear-gradient(135deg, ${theme.accent || '#8b5cf6'}44, #090d1a)`,
            }}
          />
        )}

        <div className="theme-thumb-gradient" />

        {/* Top-Left Video-Style Resolution + FPS Badges */}
        <div className="thumb-badges-left">
          <span className={`mini-badge res-${resBadge.startsWith('4K') ? '4k' : resBadge.startsWith('2K') ? '2k' : 'fhd'}`}>
            {resBadge}
          </span>
          <span className="mini-badge fps">{fpsBadge}</span>
        </div>

        {/* Top-Right Quick Actions */}
        <div className="thumb-badges-right" onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            className={`icon-btn ${inPlaylist ? 'active-pl' : ''}`}
            onClick={() => onTogglePlaylist(theme.id)}
            title={inPlaylist ? 'Bỏ khỏi Tự Động Đổi Theme' : 'Ghim vào Tự Động Đổi Theme'}
          >
            <Star size={11} fill={inPlaylist ? 'currentColor' : 'none'} />
          </button>

          {theme.source === 'user' && (
            <button
              type="button"
              className="icon-btn danger"
              onClick={() => onDelete(theme.id)}
              title="Chuyển vào Thùng rác"
            >
              <Trash2 size={11} />
            </button>
          )}
        </div>

        {/* Bottom Overlay: Active State Tag + File Size */}
        <div className="thumb-bottom-row">
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
            {isUnifiedActive && <span className="mini-badge chat-on">Đang Dùng</span>}
            {!unifiedFullWindow && isChatActive && <span className="mini-badge split-chat">Đang Dùng Chat</span>}
            {!unifiedFullWindow && isIdeActive && <span className="mini-badge split-ide">Đang Dùng IDE</span>}
            {isDesktopActive && <span className="mini-badge desktop-on">Desktop</span>}
          </div>
          <span className="theme-size-pill">{formatBytes(theme.fileSize)}</span>
        </div>
      </div>

      {/* Card Footer (Exact 1:1 Reference Video Layout!) */}
      <div className="theme-card-footer" onClick={(e) => e.stopPropagation()}>
        <div className="theme-name" title={theme.name}>
          {theme.name}
        </div>

        <div className="theme-card-actions-row">
          {unifiedFullWindow ? (
            <button
              type="button"
              className={`card-apply-full ${isUnifiedActive ? 'active' : ''}`}
              onClick={() => onSetUnified(theme)}
            >
              <Check size={11} strokeWidth={2.6} />
              <span>{isUnifiedActive ? 'Đang dùng' : 'Áp dụng'}</span>
            </button>
          ) : (
            <div className="theme-split-btns" style={{ flex: 1 }}>
              <button
                type="button"
                className={`assign-btn ${isChatActive ? 'active-chat' : ''}`}
                onClick={() => onSetChat(theme)}
              >
                <MessageSquare size={10} />
                <span>Đặt Chat</span>
              </button>
              <button
                type="button"
                className={`assign-btn ${isIdeActive ? 'active-ide' : ''}`}
                onClick={() => onSetIde(theme)}
              >
                <Code2 size={10} />
                <span>Đặt IDE</span>
              </button>
            </div>
          )}
          <button
            type="button"
            className={`card-desktop-btn ${isDesktopActive ? 'active' : ''}`}
            onClick={() => onSetDesktop?.(theme)}
            title={
              isDesktopActive
                ? 'Đang làm hình nền động Windows Desktop (bấm để tắt)'
                : 'Đặt làm hình nền động Windows Desktop'
            }
          >
            <Monitor size={12} />
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ThemeGallery({
  themes,
  config,
  desktopThemeId,
  extraThemesDir,
  comboCount = 0,
  initialFilter = 'all',
  onSetUnified,
  onSetChat,
  onSetIde,
  onSetDesktop,
  onHoverTheme,
  onTogglePlaylist,
  onImportFiles,
  onScanFolder,
  onOpenExtraFolder,
  onRescanExtraFolder,
  onQuickSaveCombo,
  onOpenCombos,
  onDeleteTheme,
}) {
  const [filter, setFilter] = useState(initialFilter);
  const [query, setQuery] = useState('');

  React.useEffect(() => {
    setFilter(initialFilter);
  }, [initialFilter]);

  const counts = useMemo(() => ({
    all: themes.length,
    dynamic: themes.filter((t) => t.category === 'dynamic').length,
    static: themes.filter((t) => t.category !== 'dynamic').length,
    videos: themes.filter((t) => t.mediaType === 'video').length,
    gifs: themes.filter((t) => t.mediaType === 'gif').length,
    extra: themes.filter((t) => t.source === 'extra' || t.source === 'user').length,
  }), [themes]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return themes.filter((t) => {
      if (filter === 'dynamic' && t.category !== 'dynamic') return false;
      if (filter === 'static' && t.category === 'dynamic') return false;
      if (filter === 'videos' && t.mediaType !== 'video') return false;
      if (filter === 'images' && (t.mediaType === 'video' || t.mediaType === 'gif')) return false;
      if (filter === 'gifs' && t.mediaType !== 'gif') return false;
      if (filter === 'extra' && t.source !== 'extra' && t.source !== 'user') return false;
      if (q && !t.name.toLowerCase().includes(q) && !(t.concept || '').toLowerCase().includes(q)) {
        return false;
      }
      return true;
    });
  }, [themes, filter, query]);

  const playlistSet = useMemo(() => new Set(config.playlistIds || []), [config.playlistIds]);

  return (
    <section style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {/* Exact Reference Video Filter + Save Combo + Search Bar */}
      <div className="gallery-toolbar">
        <div className="filter-tabs">
          <button
            type="button"
            className={`filter-pill ${filter === 'all' ? 'active' : ''}`}
            onClick={() => setFilter('all')}
          >
            Tất cả ({counts.all})
          </button>
          <button
            type="button"
            className={`filter-pill ${filter === 'dynamic' ? 'active' : ''}`}
            onClick={() => setFilter('dynamic')}
          >
            Theme Động ({counts.dynamic})
          </button>
          <button
            type="button"
            className={`filter-pill ${filter === 'static' ? 'active' : ''}`}
            onClick={() => setFilter('static')}
          >
            Theme Tĩnh ({counts.static})
          </button>
          <button
            type="button"
            className="filter-pill"
            onClick={onOpenCombos}
          >
            <Bookmark size={11} />
            <span>Bộ đã lưu ({comboCount})</span>
          </button>
          <button
            type="button"
            className={`filter-pill ${filter === 'extra' ? 'active' : ''}`}
            onClick={() => setFilter('extra')}
          >
            <FolderOpen size={11} />
            <span>Mở rộng ({counts.extra})</span>
          </button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          <button
            type="button"
            className="btn btn-amber-glass btn-sm"
            onClick={onQuickSaveCombo}
            title="Lưu nhanh setup hiện tại vào Bộ Combo"
          >
            <BookmarkPlus size={12} />
            <span>Lưu combo hiện tại</span>
          </button>

          <div className="search-wrap">
            <Search size={12} color="var(--ink-muted)" />
            <input
              type="text"
              placeholder="Tìm theo tên theme..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>

          <button
            type="button"
            className="icon-btn"
            style={{ width: 28, height: 28 }}
            onClick={onOpenExtraFolder}
            title={`Mở thư mục chủ đề mở rộng (${extraThemesDir || 'Themes'})`}
          >
            <FolderOpen size={13} />
          </button>
          <button
            type="button"
            className="icon-btn"
            style={{ width: 28, height: 28 }}
            onClick={onRescanExtraFolder}
            title="Làm mới thư mục mở rộng"
          >
            <RefreshCw size={12} />
          </button>
          <button
            type="button"
            className="icon-btn"
            style={{ width: 28, height: 28 }}
            onClick={onScanFolder}
            title="Quét thư mục bất kỳ trên máy"
          >
            <FolderPlus size={13} />
          </button>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="card-box" style={{ alignItems: 'center', padding: 30, textAlign: 'center' }}>
          <div style={{ fontSize: 13.5, fontWeight: 650 }}>Chưa có chủ đề nào trong mục này</div>
          <div className="card-desc">
            Kéo-thả trực tiếp video (.mp4, .webm, .gif) hoặc ảnh 2K/4K vào cửa sổ này, hoặc bấm nút Tải lên / Duyệt Web.
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
            <button type="button" className="btn btn-apply-hero btn-sm" onClick={onImportFiles}>
              Tải lên từ máy
            </button>
            <button type="button" className="btn btn-sm" onClick={onOpenExtraFolder}>
              Mở thư mục mở rộng
            </button>
          </div>
        </div>
      ) : (
        <div className="theme-grid theme-grid-4">
          {filtered.map((theme) => (
            <ThemeCard
              key={theme.id}
              theme={theme}
              unifiedFullWindow={config.unifiedFullWindow !== false}
              isChatActive={config.chatThemeId === theme.id}
              isIdeActive={config.ideThemeId === theme.id}
              isDesktopActive={Boolean(config.desktopWallpaperEnabled && desktopThemeId === theme.id)}
              inPlaylist={playlistSet.has(theme.id)}
              onSetUnified={onSetUnified}
              onSetChat={onSetChat}
              onSetIde={onSetIde}
              onSetDesktop={onSetDesktop}
              onHoverTheme={onHoverTheme}
              onTogglePlaylist={onTogglePlaylist}
              onDelete={onDeleteTheme}
            />
          ))}
        </div>
      )}
    </section>
  );
}
