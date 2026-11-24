import React, { useState } from 'react';
import {
  Activity,
  Download,
  FolderOpen,
  HardDrive,
  RefreshCw,
  RotateCcw,
  Upload,
  Wrench,
} from 'lucide-react';

export default function SettingsTab({
  config,
  cdpStatus,
  mediaPort,
  extraThemesDir,
  onPatchConfig,
  onOpenExtraFolder,
  onPatchShortcuts,
  onRestartAntigravity,
  onExportBackup,
  onImportBackup,
  onResetConfig,
  onToggleStartup,
}) {
  const [inspectResult, setInspectResult] = useState(null);
  const [inspecting, setInspecting] = useState(false);

  const handleInspect = async () => {
    setInspecting(true);
    try {
      const res = await window.studioAPI.inspectCdp();
      setInspectResult(res);
    } finally {
      setInspecting(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div className="page-section-grid">
        <div className="card-box">
          <div className="card-title">
            <Activity size={15} color="#34d399" />
            <span>Kết Nối Antigravity CDP (Live Bridge)</span>
          </div>
          <div className="card-desc">
            Trạng thái:{' '}
            <strong style={{ color: cdpStatus?.connected ? '#34d399' : '#fbbf24' }}>
              {cdpStatus?.connected
                ? `Đã gắn thành công (Port ${cdpStatus.port})`
                : 'Đang chờ Antigravity IDE mở với cờ CDP'}
            </strong>
            <br />
            IDE: {cdpStatus?.ideCount || 0} · Chat: {cdpStatus?.chatCount || 0} · Webview: {cdpStatus?.webviewCount || 0} · Media: 127.0.0.1:{mediaPort}
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
            <button type="button" className="btn btn-sm" onClick={handleInspect} disabled={inspecting}>
              <Activity size={12} />
              <span>{inspecting ? 'Đang quét...' : 'Kiểm tra Live DOM'}</span>
            </button>
            <button type="button" className="btn btn-sm" onClick={onPatchShortcuts}>
              <Wrench size={12} />
              <span>Khóa CDP (argv.json + Shortcut)</span>
            </button>
            <button type="button" className="btn btn-sm" onClick={onRestartAntigravity}>
              <RefreshCw size={12} />
              <span>Khởi động lại IDE</span>
            </button>
          </div>

          {inspectResult && (
            <pre
              style={{
                background: 'rgba(0, 0, 0, 0.45)',
                border: '1px solid var(--hairline)',
                borderRadius: 9,
                padding: 10,
                fontFamily: 'var(--font-mono)',
                fontSize: 10.5,
                color: '#cbd5e1',
                overflowX: 'auto',
                maxHeight: 170,
              }}
            >
              {JSON.stringify(inspectResult, null, 2)}
            </pre>
          )}
        </div>

        <div className="card-box">
          <div className="card-title">
            <HardDrive size={15} color="var(--studio-accent)" />
            <span>Hệ Thống & Chạy Ngầm</span>
          </div>
          <div className="card-desc">
            Giữ Antigravity Studio chạy nhẹ dưới khay hệ thống để phát video mượt và tự áp dụng theme mỗi khi bật máy.
          </div>

          <div className="toggle-row">
            <span style={{ fontWeight: 550 }}>Tự áp dụng tức thì khi kéo thanh trượt</span>
            <button
              type="button"
              className={`toggle-switch ${config.autoApplyOnChange !== false ? 'on' : ''}`}
              onClick={() => onPatchConfig({ autoApplyOnChange: config.autoApplyOnChange === false })}
            />
          </div>

          <div className="toggle-row">
            <span style={{ fontWeight: 550 }}>Ẩn xuống khay hệ thống khi bấm đóng</span>
            <button
              type="button"
              className={`toggle-switch ${config.minimizeToTray !== false ? 'on' : ''}`}
              onClick={() => onPatchConfig({ minimizeToTray: config.minimizeToTray === false })}
            />
          </div>

          <div className="toggle-row">
            <span style={{ fontWeight: 550 }}>Tự khởi chạy cùng Windows</span>
            <button
              type="button"
              className={`toggle-switch ${config.autoStartWindows ? 'on' : ''}`}
              onClick={() => onToggleStartup(!config.autoStartWindows)}
            />
          </div>
        </div>
      </div>

      <div className="card-box">
        <div className="card-title">
          <Download size={15} color="#fbbf24" />
          <span>Sao Lưu, Khôi Phục & Thư Mục Mở Rộng</span>
        </div>
        <div className="card-desc">
          Xuất/khôi phục toàn bộ cấu hình JSON hoặc mở nhanh thư mục thả video/ảnh chủ đề mở rộng ({extraThemesDir || 'extra-themes'}).
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          <button type="button" className="btn btn-primary btn-sm" onClick={onExportBackup}>
            <Download size={12} />
            <span>Xuất sao lưu (.json)</span>
          </button>

          <button type="button" className="btn btn-sm" onClick={onImportBackup}>
            <Upload size={12} />
            <span>Khôi phục JSON</span>
          </button>

          <button type="button" className="btn btn-sm" onClick={onOpenExtraFolder}>
            <FolderOpen size={12} />
            <span>Thư mục chủ đề mở rộng</span>
          </button>

          <button type="button" className="btn btn-sm" onClick={() => window.studioAPI?.openDataFolder()}>
            <FolderOpen size={12} />
            <span>Thư mục dữ liệu</span>
          </button>

          <button type="button" className="btn btn-danger btn-sm" onClick={onResetConfig}>
            <RotateCcw size={12} />
            <span>Đặt lại mặc định</span>
          </button>
        </div>
      </div>

      {/* Developer & Open-Source Credit Card */}
      <div className="card-box">
        <div className="card-title">
          <HardDrive size={15} color="#38bdf8" />
          <span>Thông Tin Tác Giả & Dự Án Mã Nguồn Mở</span>
        </div>
        <div className="card-desc">
          <strong>Antigravity Studio v11.2</strong> — Phát triển bởi <strong>mqinpuienhzg</strong>.
          <br />
          Mã nguồn mở MIT License trên GitHub:{' '}
          <a
            href="https://github.com/mqinpuienhzg/antigravity-studio"
            target="_blank"
            rel="noreferrer"
            style={{ color: '#7dd3fc', fontWeight: 600, textDecoration: 'underline' }}
          >
            https://github.com/mqinpuienhzg/antigravity-studio
          </a>
        </div>
      </div>
    </div>
  );
}
