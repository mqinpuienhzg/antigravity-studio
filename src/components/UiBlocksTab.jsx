import React from 'react';
import { AppWindow, Columns3, LayoutPanelLeft, Layers, MessageSquare, PanelBottom, ShieldCheck, Sparkles, Sun, Type } from 'lucide-react';
import {
  ACTIVITY_BAR_STYLES,
  APP_ICON_STYLES,
  BUBBLE_STYLES,
  COMPOSER_STYLES,
  IDE_WELCOME_FONTS,
  IDE_WELCOME_STYLES,
  STATUS_BAR_STYLES,
  TABS_CHROME_STYLES,
} from '../data/presets';

const GREETING_SUGGESTIONS = [
  'Nô thần kính chào Đại Đế',
  'Hey, what should we build today?',
  'Chào mừng trở lại Antigravity Studio ✨',
  '',
];

export default function UiBlocksTab({ config, onPatchConfig }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div className="page-section-grid">
        {/* Targets & Mode */}
        <div className="card-box">
          <div className="card-title">
            <ShieldCheck size={16} color="#06b6d4" />
            <span>Phạm Vi Áp Dụng & Chế Độ Kính</span>
          </div>
          <div className="card-desc">
            Bật/tắt độc lập từng cửa sổ Antigravity và giữ nguyên cơ chế cắt lỗ Split-Browser an toàn.
          </div>

          <div className="toggle-row">
            <span style={{ fontWeight: 600 }}>Áp dụng cho Antigravity Chat App</span>
            <button
              type="button"
              className={`toggle-switch ${config.applyToChat !== false ? 'on' : ''}`}
              onClick={() => onPatchConfig({ applyToChat: config.applyToChat === false })}
            />
          </div>

          <div className="toggle-row">
            <span style={{ fontWeight: 600 }}>Áp dụng cho Antigravity Code Editor (IDE)</span>
            <button
              type="button"
              className={`toggle-switch ${config.applyToIde !== false ? 'on' : ''}`}
              onClick={() => onPatchConfig({ applyToIde: config.applyToIde === false })}
            />
          </div>

          <div className="toggle-row">
            <span style={{ fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <Sun size={14} color="#fbbf24" />
              Chế Độ Kính Sáng (Light Glass)
            </span>
            <button
              type="button"
              className={`toggle-switch ${config.isLightMode ? 'on' : ''}`}
              onClick={() => onPatchConfig({ isLightMode: !config.isLightMode })}
            />
          </div>

          <div className="toggle-row">
            <span style={{ fontWeight: 600 }}>Bảo vệ khung Trình Duyệt nhúng (Split-Browser Cutout)</span>
            <button
              type="button"
              className={`toggle-switch ${config.splitBrowserSafe !== false ? 'on' : ''}`}
              onClick={() =>
                onPatchConfig({ splitBrowserSafe: config.splitBrowserSafe === false })
              }
            />
          </div>

          <div className="toggle-row">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <span style={{ fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <AppWindow size={14} color="#38bdf8" />
                Đồng Bộ Cụm Nút Cửa Sổ (— □ ✕) Tự Động
              </span>
              <span style={{ fontSize: 10.5, color: '#94a3b8' }}>
                Hòa nền nút góc trên phải ngay lập tức & bật nút kính trong suốt sau 1 lần mở lại IDE
              </span>
            </div>
            <button
              type="button"
              className={`toggle-switch ${config.syncWindowControls !== false ? 'on' : ''}`}
              onClick={() =>
                onPatchConfig({ syncWindowControls: config.syncWindowControls === false }, true)
              }
            />
          </div>
        </div>

        {/* Welcome Greeting & Corner Radius */}
        <div className="card-box">
          <div className="card-title">
            <Type size={16} color="#8b5cf6" />
            <span>Lời Chào & Bo Góc Giao Diện</span>
          </div>
          <div className="card-desc">
            Thay đổi dòng chữ chào mừng trên màn hình mới của Antigravity và độ bo góc khối thẻ UI.
          </div>

          <div className="slider-row">
            <div className="slider-label-line">
              <span>Dòng Chữ Chào Mừng (để trống = mặc định)</span>
            </div>
            <input
              type="text"
              className="studio-input"
              placeholder="Ví dụ: Nô thần kính chào Đại Đế..."
              value={config.welcomeText || ''}
              onChange={(e) => onPatchConfig({ welcomeText: e.target.value })}
            />
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
              {GREETING_SUGGESTIONS.map((txt, idx) => (
                <button
                  key={idx}
                  type="button"
                  className="btn btn-sm"
                  onClick={() => onPatchConfig({ welcomeText: txt })}
                >
                  {txt || 'Mặc định gốc'}
                </button>
              ))}
            </div>
          </div>

          <div className="slider-row" style={{ marginTop: 4 }}>
            <div className="slider-label-line">
              <span>Độ Bo Góc Thẻ UI (Border Radius)</span>
              <span className="slider-val">{config.cornerRadius ?? 14}px</span>
            </div>
            <input
              type="range"
              className="studio-range"
              min={6}
              max={24}
              value={config.cornerRadius ?? 14}
              onChange={(e) => onPatchConfig({ cornerRadius: Number(e.target.value) })}
            />
          </div>
        </div>
      </div>

      {/* IDE Center Welcome Hero Customization (Image 3) */}
      <div className="card-box">
        <div className="card-title">
          <Sparkles size={16} color="#fbbf24" />
          <span>Tùy Biến Màn Hình Chào Trung Tâm (Logo, Chữ & Nút Open Folder)</span>
        </div>
        <div className="card-desc">
          Biến khu vực Antigravity IDE ở giữa thành giao diện chữ phát sáng cực chất và nút viên thuốc gọn gàng, không che nhân vật chính.
        </div>

        <div className="choice-grid">
          {IDE_WELCOME_STYLES.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`choice-card ${(config.ideWelcomeStyle || 'luxury_bottom') === item.id ? 'selected' : ''}`}
              onClick={() => onPatchConfig({ ideWelcomeStyle: item.id }, true)}
            >
              <span style={{ fontWeight: 700, color: '#fff', fontSize: 12.5 }}>{item.label}</span>
              <span style={{ fontSize: 11, color: '#94a3b8' }}>{item.desc}</span>
            </button>
          ))}
        </div>

        <div className="page-section-grid" style={{ marginTop: 6 }}>
          <div className="slider-row">
            <div className="slider-label-line">
              <span>Tiêu Đề Trung Tâm (Tùy Chỉnh)</span>
            </div>
            <input
              type="text"
              className="studio-input"
              placeholder="Ví dụ: Antigravity IDE / ĐẠI ĐẾ STUDIO..."
              value={config.ideWelcomeTitle ?? 'Antigravity IDE'}
              onChange={(e) => onPatchConfig({ ideWelcomeTitle: e.target.value })}
            />
          </div>

          <div className="slider-row">
            <div className="slider-label-line">
              <span>Kiểu Chữ (Display Font)</span>
            </div>
            <select
              className="studio-select"
              value={config.ideWelcomeFont || 'orbitron'}
              onChange={(e) => onPatchConfig({ ideWelcomeFont: e.target.value }, true)}
            >
              {IDE_WELCOME_FONTS.map((f) => (
                <option key={f.id} value={f.id}>{f.label}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="slider-row" style={{ marginTop: 4 }}>
          <div className="slider-label-line">
            <span>Cỡ Chữ Tiêu Đề Trung Tâm</span>
            <span className="slider-val">{config.ideWelcomeFontSize ?? 26}px</span>
          </div>
          <input
            type="range"
            className="studio-range"
            min={16}
            max={44}
            value={config.ideWelcomeFontSize ?? 26}
            onChange={(e) => onPatchConfig({ ideWelcomeFontSize: Number(e.target.value) })}
          />
        </div>
      </div>

      {/* IDE Chrome Customization: Logo, Activity Bar, Tabs/Menu & Status Bar */}
      <div className="card-box">
        <div className="card-title">
          <LayoutPanelLeft size={16} color="#38bdf8" />
          <span>Tùy Biến Logo Góc Trên Trái & Thanh Biểu Tượng (Activity Bar)</span>
        </div>
        <div className="card-desc">
          Xóa sạch khung đen vuông sau logo Antigravity và tùy biến màu sắc, hiệu ứng kính phát sáng cho cột biểu tượng bên trái.
        </div>

        <div style={{ fontSize: 11.5, fontWeight: 700, color: '#cbd5e1', marginTop: 4 }}>
          1. Logo Antigravity góc trên trái
        </div>
        <div className="choice-grid">
          {APP_ICON_STYLES.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`choice-card ${(config.appIconStyle || 'glow') === item.id ? 'selected' : ''}`}
              onClick={() => onPatchConfig({ appIconStyle: item.id }, true)}
            >
              <span style={{ fontWeight: 700, color: '#fff', fontSize: 12.5 }}>{item.label}</span>
              <span style={{ fontSize: 11, color: '#94a3b8' }}>{item.desc}</span>
            </button>
          ))}
        </div>

        <div style={{ fontSize: 11.5, fontWeight: 700, color: '#cbd5e1', marginTop: 8 }}>
          2. Cột Biểu Tượng Trái (Explorer, Search, Git, Extensions...)
        </div>
        <div className="choice-grid">
          {ACTIVITY_BAR_STYLES.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`choice-card ${(config.activityBarStyle || 'colorful_glow') === item.id ? 'selected' : ''}`}
              onClick={() => onPatchConfig({ activityBarStyle: item.id }, true)}
            >
              <span style={{ fontWeight: 700, color: '#fff', fontSize: 12.5 }}>{item.label}</span>
              <span style={{ fontSize: 11, color: '#94a3b8' }}>{item.desc}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Tabs, Menubar & Breadcrumbs */}
      <div className="card-box">
        <div className="card-title">
          <Columns3 size={16} color="#a855f7" />
          <span>Tùy Biến Thanh Tab File, Menu & Đường Dẫn (Breadcrumbs)</span>
        </div>
        <div className="card-desc">
          Làm đẹp thẻ file đang mở, cụm nút Split/Preview và đường dẫn thư mục phía trên khung code.
        </div>
        <div className="choice-grid">
          {TABS_CHROME_STYLES.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`choice-card ${(config.tabsChromeStyle || 'floating_pills') === item.id ? 'selected' : ''}`}
              onClick={() => onPatchConfig({ tabsChromeStyle: item.id }, true)}
            >
              <span style={{ fontWeight: 700, color: '#fff', fontSize: 12.5 }}>{item.label}</span>
              <span style={{ fontSize: 11, color: '#94a3b8' }}>{item.desc}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Status Bar Style */}
      <div className="card-box">
        <div className="card-title">
          <PanelBottom size={16} color="#34d399" />
          <span>Tùy Biến Thanh Trạng Thái Đáy (Status Bar)</span>
        </div>
        <div className="card-desc">
          Tăng độ tương phản siêu nét trên nền video sáng, bo tròn nút Remote và làm nổi bật thông số Quota / Model / Antigravity.
        </div>
        <div className="choice-grid">
          {STATUS_BAR_STYLES.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`choice-card ${(config.statusBarStyle || 'glass_pills') === item.id ? 'selected' : ''}`}
              onClick={() => onPatchConfig({ statusBarStyle: item.id }, true)}
            >
              <span style={{ fontWeight: 700, color: '#fff', fontSize: 12.5 }}>{item.label}</span>
              <span style={{ fontSize: 11, color: '#94a3b8' }}>{item.desc}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Chat Bubble Style */}
      <div className="card-box">
        <div className="card-title">
          <MessageSquare size={16} color="#ec4899" />
          <span>Phong Cách Bong Bóng Chat Người Dùng</span>
        </div>
        <div className="choice-grid">
          {BUBBLE_STYLES.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`choice-card ${config.bubbleStyle === item.id ? 'selected' : ''}`}
              onClick={() => onPatchConfig({ bubbleStyle: item.id })}
            >
              <span style={{ fontWeight: 700, color: '#fff', fontSize: 12.5 }}>{item.label}</span>
              <span style={{ fontSize: 11, color: '#94a3b8' }}>{item.desc}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Composer Style */}
      <div className="card-box">
        <div className="card-title">
          <Layers size={16} color="#fbbf24" />
          <span>Phong Cách Khung Nhập Liệu (Composer)</span>
        </div>
        <div className="choice-grid">
          {COMPOSER_STYLES.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`choice-card ${config.composerStyle === item.id ? 'selected' : ''}`}
              onClick={() => onPatchConfig({ composerStyle: item.id })}
            >
              <span style={{ fontWeight: 700, color: '#fff', fontSize: 12.5 }}>
                <Sparkles size={11} style={{ marginRight: 5, verticalAlign: 'middle' }} />
                {item.label}
              </span>
              <span style={{ fontSize: 11, color: '#94a3b8' }}>{item.desc}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
