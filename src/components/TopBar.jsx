import React from 'react';
import {
  Camera,
  Link2,
  Minus,
  Monitor,
  PanelRight,
  Power,
  RefreshCw,
  SplitSquareHorizontal,
  Square,
  Upload,
  X,
  Zap,
} from 'lucide-react';

export default function TopBar({
  cdpStatus,
  enabled,
  unifiedFullWindow = true,
  rightPreviewOpen = true,
  chatTheme,
  ideTheme,
  busyAction,
  onToggleUnified,
  onToggleRightPreview,
  onImportFiles,
  onCapture,
  onApplyNow,
  onRestartAntigravity,
  onDisableTheme,
}) {
  const screenRes =
    typeof window !== 'undefined' && window.screen
      ? `${window.screen.width}×${window.screen.height}`
      : '1920×1080';

  const activeLabel = unifiedFullWindow
    ? chatTheme?.name || ideTheme?.name || 'Chưa chọn'
    : `Chat: ${chatTheme?.name || '—'} · IDE: ${ideTheme?.name || '—'}`;

  return (
    <header className="topbar">
      {/* Left: Unified vs Split Pills + Active Theme Readout (Exact Video Match!) */}
      <div className="topbar-left">
        <div className="topbar-mode-seg" title="Chuyển nhanh giữa 1 nền đồng bộ toàn màn hình hoặc tách riêng Chat & IDE">
          <button
            type="button"
            className={`topbar-mode-btn ${unifiedFullWindow ? 'active' : ''}`}
            onClick={() => onToggleUnified?.(true)}
          >
            <Link2 size={12} />
            <span>Đồng bộ</span>
          </button>
          <button
            type="button"
            className={`topbar-mode-btn ${!unifiedFullWindow ? 'active' : ''}`}
            onClick={() => onToggleUnified?.(false)}
          >
            <SplitSquareHorizontal size={12} />
            <span>Chat & IDE riêng</span>
          </button>
        </div>

        <div className="topbar-selection-pill" title={activeLabel}>
          <span className="topbar-sel-prefix">Đang chọn:</span>
          <span className="topbar-sel-name">{activeLabel}</span>
        </div>
      </div>

      {/* Right: Resolution + Upload + Apply Theme + Window Controls */}
      <div className="topbar-actions">
        <div className="topbar-res-pill" title={`CDP Port: ${cdpStatus?.port || 'Đang chờ'}`}>
          <Monitor size={11} />
          <span>{screenRes}</span>
        </div>

        <button
          type="button"
          className={`btn btn-sm ${rightPreviewOpen ? 'btn-accent' : ''}`}
          onClick={onToggleRightPreview}
          title={rightPreviewOpen ? 'Ẩn khung xem trước cạnh phải' : 'Mở khung xem trước IDE + Chat cạnh phải'}
        >
          <PanelRight size={12} />
          <span>Xem trước phải</span>
        </button>

        <button
          type="button"
          className="btn btn-sm"
          onClick={onImportFiles}
          title="Tải lên video hoặc ảnh từ máy tính"
        >
          <Upload size={12} />
          <span>Tải lên</span>
        </button>

        <button
          type="button"
          className="btn btn-ghost btn-sm"
          onClick={onCapture}
          title="Chụp ảnh giao diện Studio"
        >
          <Camera size={13} />
        </button>

        <button
          type="button"
          className="btn btn-ghost btn-sm"
          disabled={busyAction === 'restart'}
          onClick={onRestartAntigravity}
          title="Khởi động lại Antigravity IDE với cờ CDP"
        >
          <RefreshCw size={13} className={busyAction === 'restart' ? 'spin' : ''} />
        </button>

        <button
          type="button"
          className="btn btn-apply-hero btn-sm"
          disabled={busyAction === 'apply'}
          onClick={onApplyNow}
        >
          <Zap size={13} />
          <span>{busyAction === 'apply' ? 'ĐANG ÁP DỤNG...' : 'ÁP DỤNG THEME'}</span>
        </button>

        <button
          type="button"
          className="btn btn-danger btn-sm"
          onClick={onDisableTheme}
          title="Tắt tùy biến và trả về bản gốc"
        >
          <Power size={12} />
          <span>{enabled ? 'Bản gốc' : 'Đang tắt'}</span>
        </button>

        <div className="window-controls">
          <button
            type="button"
            className="win-btn"
            onClick={() => window.studioAPI?.minimize()}
            title="Thu nhỏ"
          >
            <Minus size={14} />
          </button>
          <button
            type="button"
            className="win-btn"
            onClick={() => window.studioAPI?.maximize()}
            title="Phóng to / Khôi phục"
          >
            <Square size={11} />
          </button>
          <button
            type="button"
            className="win-btn close"
            onClick={() => window.studioAPI?.close()}
            title="Thu xuống khay hệ thống"
          >
            <X size={15} />
          </button>
        </div>
      </div>
    </header>
  );
}
