import React, { useState } from 'react';
import {
  ArrowLeftRight,
  Cpu,
  Dices,
  Droplets,
  Eye,
  Film,
  ListVideo,
  Monitor,
  Palette,
  Pause,
  Play,
  RotateCcw,
  SkipForward,
  Sliders,
  Sparkles,
  Wand2,
} from 'lucide-react';
import { NEON_SWATCHES, PLAYLIST_INTERVALS } from '../data/presets';

const INSPECTOR_TABS = [
  { id: 'glass', label: 'Kính & Mờ', icon: Sliders },
  { id: 'chrome', label: 'Khung & Viền', icon: Eye },
  { id: 'video', label: 'Màn Hình & Video', icon: Film },
  { id: 'auto', label: 'Tự Động', icon: ListVideo },
];

function SliderControl({ label, value, min, max, step = 1, unit, color, onChange }) {
  const pct = Math.max(0, Math.min(100, ((Number(value) - min) / Math.max(0.0001, max - min)) * 100));
  const fill = color || 'var(--studio-accent)';
  return (
    <div className="slider-row">
      <div className="slider-label-line">
        <span>{label}</span>
        <span className="slider-val">
          {value}
          {unit}
        </span>
      </div>
      <input
        type="range"
        className="studio-range"
        min={min}
        max={max}
        step={step}
        value={value}
        style={{
          '--thumb-color': fill,
          background: `linear-gradient(90deg, ${fill} 0%, ${fill} ${pct}%, rgba(255,255,255,0.14) ${pct}%, rgba(255,255,255,0.14) 100%)`,
        }}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </div>
  );
}

export default function RightControls({
  config,
  chatTheme,
  ideTheme,
  desktopTheme,
  desktopStatus,
  onPatchConfig,
  onToggleDesktop,
  onSetDesktopFromIde,
  onToggleDesktopPause,
  onNextPlaylist,
  onQuickRandomize,
  onResetQuick,
}) {
  const [tab, setTab] = useState('glass');
  const neonColor = config.neonColor || '#a855f7';
  const unified = config.unifiedFullWindow !== false;
  const activeTheme = chatTheme || ideTheme;

  const applyCrystalPreset = () => {
    onPatchConfig(
      {
        wallpaperBlur: 0,
        uiPanelBlur: 0,
        dimming: 10,
        sidebarOpacity: 0,
        chatBoxOpacity: 0,
        editorOpacity: 10,
        terminalOpacity: 6,
        settingsOpacity: 14,
      },
      true
    );
  };

  const applyLiquidGlassPreset = () => {
    onPatchConfig(
      {
        wallpaperBlur: 0,
        uiPanelBlur: 4,
        dimming: 12,
        sidebarOpacity: 0,
        chatBoxOpacity: 0,
        editorOpacity: 16,
        terminalOpacity: 8,
        settingsOpacity: 18,
      },
      true
    );
  };

  const applyBalancedGlassPreset = () => {
    onPatchConfig(
      {
        wallpaperBlur: 2,
        uiPanelBlur: 10,
        dimming: 20,
        sidebarOpacity: 14,
        chatBoxOpacity: 18,
        editorOpacity: 28,
        terminalOpacity: 22,
        settingsOpacity: 32,
      },
      true
    );
  };

  const applyThemeAccent = () => {
    if (!activeTheme) return;
    onPatchConfig(
      {
        neonColor: activeTheme.accent || '#a855f7',
        neonSecondary: activeTheme.secondary || '#38bdf8',
      },
      true
    );
  };

  return (
    <aside className="right-panel">
      {/* Header matching Reference Video */}
      <div className="right-panel-titlebar">
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12.5, fontWeight: 700 }}>
          <Sliders size={13} color="var(--studio-accent)" />
          <span>Bảng tinh chỉnh</span>
        </span>
        <button
          type="button"
          className="icon-btn"
          onClick={onResetQuick}
          title="Đặt lại độ mờ về mặc định Liquid Glass"
        >
          <RotateCcw size={11} />
        </button>
      </div>

      {/* 4-Tab Pro Inspector Switcher */}
      <div className="inspector-tabs">
        {INSPECTOR_TABS.map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              type="button"
              className={`inspector-tab ${tab === t.id ? 'active' : ''}`}
              onClick={() => setTab(t.id)}
            >
              <Icon size={12} />
              <span>{t.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB 1: GLASS, OPACITY, SETTINGS & TERMINAL & ACCENT */}
      {tab === 'glass' && (
        <>
          <div className="panel-section">
            <div className="panel-heading">
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                <Droplets size={11} color="var(--studio-accent)" />
                ĐỘ MỜ KÍNH & LỚP PHỦ
              </span>
            </div>

            <SliderControl
              label="Độ Mờ Hình Nền (Wallpaper Blur)"
              value={config.wallpaperBlur ?? 0}
              min={0}
              max={24}
              unit="px"
              onChange={(v) => onPatchConfig({ wallpaperBlur: v })}
            />
            <SliderControl
              label="Độ Mờ Khung Giao Diện (UI Panels Blur)"
              value={config.uiPanelBlur ?? 0}
              min={0}
              max={20}
              unit="px"
              onChange={(v) => onPatchConfig({ uiPanelBlur: v })}
            />
            <SliderControl
              label="Độ Tối Phủ Nền (Dimming)"
              value={config.dimming ?? 12}
              min={0}
              max={90}
              unit="%"
              onChange={(v) => onPatchConfig({ dimming: v })}
            />
            <SliderControl
              label="Độ Mờ Sidebar & Tabs"
              value={config.sidebarOpacity ?? 0}
              min={0}
              max={90}
              unit="%"
              onChange={(v) => onPatchConfig({ sidebarOpacity: v })}
            />
            <SliderControl
              label="Độ Mờ Chat Box (Agent Workspace)"
              value={config.chatBoxOpacity ?? 0}
              min={0}
              max={90}
              unit="%"
              onChange={(v) => onPatchConfig({ chatBoxOpacity: v })}
            />
            <SliderControl
              label="Độ Mờ Monaco Code Editor"
              value={config.editorOpacity ?? 18}
              min={0}
              max={90}
              unit="%"
              onChange={(v) => onPatchConfig({ editorOpacity: v })}
            />
            <SliderControl
              label="Độ Mờ Terminal & Panel Đáy"
              value={config.terminalOpacity ?? 8}
              min={0}
              max={90}
              unit="%"
              onChange={(v) => onPatchConfig({ terminalOpacity: v })}
            />
            <SliderControl
              label="Độ Mờ Box Settings (Chat App & IDE)"
              value={config.settingsOpacity ?? 20}
              min={0}
              max={90}
              unit="%"
              onChange={(v) => onPatchConfig({ settingsOpacity: v })}
            />

            <div className="preset-btn-row-3">
              <button type="button" className="preset-chip-btn preset-emerald" onClick={applyCrystalPreset}>
                <Sparkles size={10} />
                <span>Trong Suốt 100%</span>
              </button>
              <button type="button" className="preset-chip-btn preset-liquid" onClick={applyLiquidGlassPreset}>
                <Droplets size={10} />
                <span>Liquid Glass</span>
              </button>
              <button type="button" className="preset-chip-btn" onClick={applyBalancedGlassPreset}>
                <Sliders size={10} />
                <span>Kính cân bằng</span>
              </button>
            </div>
          </div>

          <div className="panel-section">
            <div className="panel-heading">
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                <Palette size={11} color="var(--studio-accent)" />
                MÀU ACCENT
              </span>
              <button
                type="button"
                className="mini-action-link"
                onClick={applyThemeAccent}
                title="Tự trích màu chủ đạo từ chủ đề đang dùng"
              >
                <Wand2 size={10} />
                <span>Lấy từ Theme</span>
              </button>
            </div>

            <div className="swatch-grid">
              {NEON_SWATCHES.map((sw) => {
                const active = neonColor.toLowerCase() === sw.color.toLowerCase();
                return (
                  <button
                    key={sw.color}
                    type="button"
                    className={`swatch-dot ${active ? 'selected' : ''}`}
                    title={sw.name}
                    style={{
                      background: sw.color,
                      boxShadow: active ? `0 0 12px ${sw.color}` : 'none',
                    }}
                    onClick={() => onPatchConfig({ neonColor: sw.color, neonSecondary: sw.secondary })}
                  />
                );
              })}
              <label
                title="Chọn màu tùy ý"
                style={{
                  width: 21,
                  height: 21,
                  borderRadius: '50%',
                  border: '1.5px dashed rgba(255,255,255,0.5)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  overflow: 'hidden',
                  flexShrink: 0,
                  background: 'conic-gradient(#f43f5e, #fbbf24, #10b981, #06b6d4, #8b5cf6, #ec4899, #f43f5e)',
                }}
              >
                <input
                  type="color"
                  value={neonColor}
                  onChange={(e) => onPatchConfig({ neonColor: e.target.value })}
                  style={{ opacity: 0, width: 28, height: 28, cursor: 'pointer' }}
                />
              </label>
            </div>

            <SliderControl
              label="Cường độ hào quang viền"
              value={config.neonIntensity ?? 52}
              min={0}
              max={100}
              unit="%"
              color={neonColor}
              onChange={(v) => onPatchConfig({ neonIntensity: v })}
            />
          </div>
        </>
      )}

      {/* TAB 2: TYPOGRAPHY, BORDERS & IDE CHROME */}
      {tab === 'chrome' && (
        <>
          <div className="panel-section">
            <div className="panel-heading"><span>CHỮ & ĐỘ DỄ ĐỌC</span></div>

            <div className="slider-row">
              <div className="slider-label-line"><span>Font chữ giao diện</span></div>
              <select
                className="studio-select"
                value={config.uiFont || 'be_vietnam'}
                onChange={(e) => onPatchConfig({ uiFont: e.target.value }, true)}
              >
                <option value="be_vietnam">Be Vietnam Pro</option>
                <option value="lexend">Lexend (Siêu dễ đọc)</option>
                <option value="inter">Inter (Chuẩn macOS)</option>
                <option value="jakarta">Plus Jakarta Sans</option>
                <option value="space">Space Grotesk</option>
                <option value="system">Segoe UI</option>
              </select>
            </div>

            <div className="slider-row">
              <div className="slider-label-line"><span>Độ nét chữ trên nền sáng</span></div>
              <div className="seg-control" style={{ gridTemplateColumns: '1fr 1fr 1fr' }}>
                {[
                  { id: 'crisp', label: 'Siêu nét' },
                  { id: 'outline', label: 'Viền đậm' },
                  { id: 'soft', label: 'Mềm mại' },
                ].map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    className={`seg-btn ${(config.textContrastMode || 'crisp') === m.id ? 'active' : ''}`}
                    onClick={() => onPatchConfig({ textContrastMode: m.id }, true)}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </div>

            <SliderControl
              label="Cỡ chữ khung Chat"
              value={config.chatFontSize ?? 14}
              min={12}
              max={18}
              unit="px"
              onChange={(v) => onPatchConfig({ chatFontSize: v })}
            />

            <div className="slider-row">
              <div className="slider-label-line"><span>Kiểu đường viền</span></div>
              <div className="seg-control" style={{ gridTemplateColumns: '1fr 1fr 1fr' }}>
                {[
                  { id: 'none', label: 'Không viền' },
                  { id: 'subtle', label: 'Mảnh' },
                  { id: 'neon', label: 'Neon' },
                ].map((b) => (
                  <button
                    key={b.id}
                    type="button"
                    className={`seg-btn ${(config.borderStyle || 'none') === b.id ? 'active' : ''}`}
                    onClick={() => onPatchConfig({ borderStyle: b.id }, true)}
                  >
                    {b.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="slider-row">
              <div className="slider-label-line"><span>Bảng màu chữ</span></div>
              <div className="seg-control" style={{ gridTemplateColumns: '1fr 1fr' }}>
                {[
                  { id: 'alabaster', label: 'Bạch ngọc' },
                  { id: 'warm_cream', label: 'Kem ấm' },
                  { id: 'ice_blue', label: 'Băng lam' },
                  { id: 'custom', label: 'Tự chọn' },
                ].map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    className={`seg-btn ${(config.textPalette || 'alabaster') === p.id ? 'active' : ''}`}
                    onClick={() => onPatchConfig({ textPalette: p.id }, true)}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="panel-section">
            <div className="panel-heading"><span>THANH CÔNG CỤ IDE</span></div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 7 }}>
              <div className="slider-row">
                <div className="slider-label-line"><span>Logo</span></div>
                <select className="studio-select" value={config.appIconStyle || 'glow'} onChange={(e) => onPatchConfig({ appIconStyle: e.target.value }, true)}>
                  <option value="glow">Phát sáng</option>
                  <option value="badge">Huy hiệu</option>
                  <option value="clean">Sạch</option>
                  <option value="hidden">Ẩn</option>
                </select>
              </div>
              <div className="slider-row">
                <div className="slider-label-line"><span>Cột icon</span></div>
                <select className="studio-select" value={config.activityBarStyle || 'colorful_glow'} onChange={(e) => onPatchConfig({ activityBarStyle: e.target.value }, true)}>
                  <option value="colorful_glow">Đa sắc</option>
                  <option value="neon_pills">Đơn sắc</option>
                  <option value="floating_dock">Dock nổi</option>
                  <option value="minimal">Tối giản</option>
                </select>
              </div>
              <div className="slider-row">
                <div className="slider-label-line"><span>Tab file</span></div>
                <select className="studio-select" value={config.tabsChromeStyle || 'floating_pills'} onChange={(e) => onPatchConfig({ tabsChromeStyle: e.target.value }, true)}>
                  <option value="floating_pills">Thẻ kính</option>
                  <option value="neon_underline">Gạch sáng</option>
                  <option value="cyber_capsule">Viên kén</option>
                  <option value="minimal">Tối giản</option>
                </select>
              </div>
              <div className="slider-row">
                <div className="slider-label-line"><span>Thanh đáy</span></div>
                <select className="studio-select" value={config.statusBarStyle || 'glass_pills'} onChange={(e) => onPatchConfig({ statusBarStyle: e.target.value }, true)}>
                  <option value="glass_pills">Thẻ kính</option>
                  <option value="neon_strip">Dải neon</option>
                  <option value="floating_dock">Viên kén</option>
                  <option value="minimal">Tối giản</option>
                </select>
              </div>
              <div className="slider-row">
                <div className="slider-label-line"><span>Màn chào</span></div>
                <select className="studio-select" value={config.ideWelcomeStyle || 'luxury_bottom'} onChange={(e) => onPatchConfig({ ideWelcomeStyle: e.target.value }, true)}>
                  <option value="luxury_bottom">Góc dưới</option>
                  <option value="floating_card">Thẻ giữa</option>
                  <option value="cyber_hud">HUD</option>
                  <option value="minimal_zen">Zen mờ</option>
                </select>
              </div>
              <div className="slider-row">
                <div className="slider-label-line"><span>Font chào</span></div>
                <select className="studio-select" value={config.ideWelcomeFont || 'orbitron'} onChange={(e) => onPatchConfig({ ideWelcomeFont: e.target.value }, true)}>
                  <option value="orbitron">Orbitron</option>
                  <option value="cinzel">Cinzel</option>
                  <option value="space">Space</option>
                  <option value="be_vietnam">Be Vietnam</option>
                  <option value="mono">Mono</option>
                </select>
              </div>
            </div>
          </div>
        </>
      )}

      {/* TAB 3: VIDEO ENGINE & DISPLAY MODE */}
      {tab === 'video' && (
        <>
          <div className="panel-section">
            <div className="panel-heading">
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                <Monitor size={11} color="#34d399" />
                HÌNH NỀN ĐỘNG WINDOWS DESKTOP
              </span>
              <span
                className={`desktop-status-pill ${
                  config.desktopWallpaperEnabled
                    ? desktopStatus?.paused
                      ? 'paused'
                      : 'on'
                    : ''
                }`}
              >
                {config.desktopWallpaperEnabled
                  ? desktopStatus?.manualPaused
                    ? 'Tạm dừng'
                    : desktopStatus?.autoPaused
                    ? 'Nghỉ GPU'
                    : 'Đang chạy'
                  : 'Đang tắt'}
              </span>
            </div>

            <div className="toggle-row">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <span style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--ink-primary)' }}>
                  Bật hình nền động Desktop
                </span>
                <span style={{ fontSize: 10, color: 'var(--ink-muted)' }}>
                  {desktopTheme?.name || 'Chọn bất kỳ theme nào'}
                </span>
              </div>
              <button
                type="button"
                className={`toggle-switch ${config.desktopWallpaperEnabled ? 'on' : ''}`}
                onClick={() => onToggleDesktop?.(!config.desktopWallpaperEnabled)}
              />
            </div>

            <div style={{ display: 'flex', gap: 6 }}>
              <button
                type="button"
                className="btn btn-sm"
                style={{ flex: 1 }}
                onClick={onSetDesktopFromIde}
                title="Đặt ngay nền hiện tại của IDE làm hình nền động Windows Desktop"
              >
                <Monitor size={11} />
                <span>Lấy nền IDE</span>
              </button>
              {config.desktopWallpaperEnabled && (
                <button
                  type="button"
                  className="btn btn-sm"
                  onClick={onToggleDesktopPause}
                  title={desktopStatus?.manualPaused ? 'Tiếp tục phát video Desktop' : 'Tạm dừng video Desktop'}
                >
                  {desktopStatus?.manualPaused ? <Play size={11} /> : <Pause size={11} />}
                  <span>{desktopStatus?.manualPaused ? 'Chạy tiếp' : 'Tạm dừng'}</span>
                </button>
              )}
            </div>

            <div className="toggle-row" style={{ paddingTop: 6, borderTop: '1px solid var(--hairline)' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <span style={{ fontSize: 11, fontWeight: 550, color: 'var(--ink-primary)' }}>
                  Tự đồng bộ theo nền IDE
                </span>
                <span style={{ fontSize: 10, color: 'var(--ink-muted)' }}>
                  Đổi nền IDE sẽ tự đổi nền Desktop
                </span>
              </div>
              <button
                type="button"
                className={`toggle-switch ${config.desktopSyncWithIde ? 'on' : ''}`}
                onClick={() => onPatchConfig({ desktopSyncWithIde: !config.desktopSyncWithIde }, true)}
              />
            </div>

            <div className="slider-row">
              <div className="slider-label-line"><span>Khung hình Desktop</span></div>
              <div className="seg-control">
                <button
                  type="button"
                  className={`seg-btn ${config.desktopObjectFit !== 'contain' ? 'active' : ''}`}
                  onClick={() => onPatchConfig({ desktopObjectFit: 'cover' }, true)}
                >
                  Lấp đầy (Cover)
                </button>
                <button
                  type="button"
                  className={`seg-btn ${config.desktopObjectFit === 'contain' ? 'active' : ''}`}
                  onClick={() => onPatchConfig({ desktopObjectFit: 'contain' }, true)}
                >
                  Vừa khung
                </button>
              </div>
            </div>

            <div className="slider-row">
              <div className="slider-label-line"><span>Màn hình áp dụng</span></div>
              <div className="seg-control">
                <button
                  type="button"
                  className={`seg-btn ${config.desktopDisplayMode !== 'all' ? 'active' : ''}`}
                  onClick={() => onPatchConfig({ desktopDisplayMode: 'primary' }, true)}
                >
                  Màn hình chính
                </button>
                <button
                  type="button"
                  className={`seg-btn ${config.desktopDisplayMode === 'all' ? 'active' : ''}`}
                  onClick={() => onPatchConfig({ desktopDisplayMode: 'all' }, true)}
                >
                  Tất cả màn hình
                </button>
              </div>
            </div>

            <SliderControl
              label="Độ tối nền Desktop"
              value={config.desktopDimming ?? 0}
              min={0}
              max={80}
              unit="%"
              color="#34d399"
              onChange={(v) => onPatchConfig({ desktopDimming: v })}
            />
            <SliderControl
              label="Độ mờ nền Desktop"
              value={config.desktopBlur ?? 0}
              min={0}
              max={16}
              unit="px"
              color="#34d399"
              onChange={(v) => onPatchConfig({ desktopBlur: v })}
            />
            <SliderControl
              label="Tốc độ video Desktop"
              value={config.desktopSpeed ?? 1}
              min={0.25}
              max={2}
              step={0.25}
              unit="x"
              color="#34d399"
              onChange={(v) => onPatchConfig({ desktopSpeed: v })}
            />
            <SliderControl
              label="Âm lượng Desktop"
              value={config.desktopVolume ?? 0}
              min={0}
              max={100}
              unit="%"
              color="#34d399"
              onChange={(v) => onPatchConfig({ desktopVolume: v })}
            />

            <div className="toggle-row" style={{ paddingTop: 6, borderTop: '1px solid var(--hairline)' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--ink-primary)', display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                  <Cpu size={12} color="#34d399" />
                  Tự nghỉ GPU khi chơi game
                </span>
                <span style={{ fontSize: 10, color: 'var(--ink-muted)' }}>
                  Tạm dừng video khi cửa sổ phóng to che Desktop
                </span>
              </div>
              <button
                type="button"
                className={`toggle-switch ${config.desktopSmartPause !== false ? 'on' : ''}`}
                onClick={() => onPatchConfig({ desktopSmartPause: !(config.desktopSmartPause !== false) }, true)}
              />
            </div>
          </div>

          <div className="panel-section">
            <div className="panel-heading"><span>CHẾ ĐỘ PHỦ MÀN HÌNH</span></div>
            <div className="seg-control">
              <button type="button" className={`seg-btn ${unified ? 'active' : ''}`} onClick={() => onPatchConfig({ unifiedFullWindow: true, ideThemeId: config.chatThemeId }, true)}>
                Đồng bộ toàn cửa sổ
              </button>
              <button type="button" className={`seg-btn ${!unified ? 'active' : ''}`} onClick={() => onPatchConfig({ unifiedFullWindow: false }, true)}>
                Chat & IDE riêng
              </button>
            </div>
            {!unified && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 4, borderTop: '1px solid var(--hairline)', fontSize: 11 }}>
                <span style={{ color: 'var(--ink-secondary)' }}>
                  Chat: <strong style={{ color: '#fff' }}>{chatTheme?.name || '—'}</strong> · IDE: <strong style={{ color: '#fff' }}>{ideTheme?.name || '—'}</strong>
                </span>
                <button type="button" className="icon-btn" title="Hoán đổi nền Chat ↔ IDE" onClick={() => onPatchConfig({ chatThemeId: config.ideThemeId, ideThemeId: config.chatThemeId }, true)}>
                  <ArrowLeftRight size={11} />
                </button>
              </div>
            )}
          </div>

          <div className="panel-section">
            <div className="panel-heading"><span>ĐỘNG CƠ PHÁT VIDEO 60FPS</span></div>
            <div className="slider-row">
              <div className="slider-label-line"><span>Khung hình video</span></div>
              <div className="seg-control">
                <button type="button" className={`seg-btn ${config.videoObjectFit !== 'contain' ? 'active' : ''}`} onClick={() => onPatchConfig({ videoObjectFit: 'cover' })}>Lấp đầy (Cover)</button>
                <button type="button" className={`seg-btn ${config.videoObjectFit === 'contain' ? 'active' : ''}`} onClick={() => onPatchConfig({ videoObjectFit: 'contain' })}>Vừa khung</button>
              </div>
            </div>
            <SliderControl label="Tốc độ phát" value={config.videoSpeed ?? 1} min={0.25} max={2} step={0.25} unit="x" onChange={(v) => onPatchConfig({ videoSpeed: v })} />
            <SliderControl label="Âm lượng video" value={config.videoVolume ?? 0} min={0} max={100} unit="%" onChange={(v) => onPatchConfig({ videoVolume: v })} />
            <div className="toggle-row" style={{ paddingTop: 6, borderTop: '1px solid var(--hairline)' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <span style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--ink-primary)', display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                  <Cpu size={12} color="#34d399" />
                  Tiết kiệm GPU thông minh
                </span>
                <span style={{ fontSize: 10, color: 'var(--ink-muted)' }}>Tự dừng video khi ẩn cửa sổ IDE</span>
              </div>
              <button type="button" className={`toggle-switch ${config.smartGpuPowerSaving ? 'on' : ''}`} onClick={() => onPatchConfig({ smartGpuPowerSaving: !config.smartGpuPowerSaving })} />
            </div>
          </div>
        </>
      )}

      {/* TAB 4: AUTOMATION, PLAYLIST & RANDOMIZER */}
      {tab === 'auto' && (
        <>
          <div className="panel-section">
            <div className="panel-heading">
              <span>TỰ XOAY VÒNG (PLAYLIST)</span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--ink-muted)' }}>
                {(config.playlistIds || []).length ? `${config.playlistIds.length} ghim` : 'Tất cả'}
              </span>
            </div>
            <div className="toggle-row">
              <span style={{ fontSize: 11.5, fontWeight: 550, color: 'var(--ink-primary)' }}>Tự đổi chủ đề định kỳ</span>
              <button type="button" className={`toggle-switch ${config.playlistEnabled ? 'on' : ''}`} onClick={() => onPatchConfig({ playlistEnabled: !config.playlistEnabled })} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
              <select className="studio-select" value={config.playlistIntervalSec || 120} onChange={(e) => onPatchConfig({ playlistIntervalSec: Number(e.target.value) })}>
                {PLAYLIST_INTERVALS.map((it) => (
                  <option key={it.sec} value={it.sec}>Mỗi {it.label}</option>
                ))}
              </select>
              <select className="studio-select" value={config.playlistTarget || 'both'} onChange={(e) => onPatchConfig({ playlistTarget: e.target.value })}>
                <option value="both">Toàn màn hình</option>
                <option value="chat">Chỉ Chat</option>
                <option value="ide">Chỉ IDE</option>
              </select>
            </div>
            <button type="button" className="btn btn-sm" onClick={onNextPlaylist}>
              <SkipForward size={12} />
              <span>Chuyển theme tiếp theo</span>
            </button>
          </div>

          <div className="panel-section">
            <div className="panel-heading"><span>ĐỔI NGẪU NHIÊN NHANH</span></div>
            <button type="button" className="btn btn-apply-hero btn-sm" onClick={onQuickRandomize}>
              <Dices size={13} />
              <span>Trộn Theme Ngẫu Nhiên</span>
            </button>
          </div>
        </>
      )}
    </aside>
  );
}
