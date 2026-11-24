import React, { useState } from 'react';
import {
  ChevronDown,
  Clock,
  Compass,
  Dices,
  Film,
  FolderHeart,
  FolderOpen,
  Heart,
  Image,
  Layers,
  Palette,
  RefreshCw,
  Settings,
  Sparkles,
  Sticker,
  Trash2,
  Youtube,
} from 'lucide-react';

export default function Sidebar({
  activeTab,
  onSelectTab,
  cdpStatus,
  mediaPort,
  appLogoUrl,
  config,
  onToggleAutoInject,
  counts = {},
}) {
  const [libOpen, setLibOpen] = useState(true);

  const libItems = [
    { id: 'lib-images', label: 'Ảnh', icon: Image, count: counts.images || 0 },
    { id: 'lib-videos', label: 'Video', icon: Film, count: counts.videos || 0 },
    { id: 'lib-gifs', label: 'GIF', icon: Sparkles, count: counts.gifs || 0 },
    { id: 'mascots', label: 'Sticker', icon: Sticker, count: counts.mascots || 0 },
    { id: 'combos', label: 'Album', icon: FolderHeart, count: counts.combos || 0 },
    { id: 'trash', label: 'Thùng rác', icon: Trash2, count: counts.trash || 0 },
  ];

  const mainNav = [
    { id: 'history', label: 'Lịch Sử Theme', icon: Clock, count: counts.history || null },
    { id: 'auto-rotate', label: 'Tự Động Đổi Theme', icon: RefreshCw, badge: config?.playlistEnabled ? 'ON' : null },
    { id: 'randomizer', label: 'Randomizer Studio', icon: Dices },
    { id: 'browser', label: 'Duyệt Web & Tải Theme', icon: Compass },
    { id: 'mascots-hub', label: 'Linh Thú & Sticker', icon: Heart },
    { id: 'ui-blocks', label: 'Khối Giao Diện', icon: Layers },
    { id: 'online', label: 'YouTube & URL', icon: Youtube },
    { id: 'settings', label: 'Cài Đặt & Sao Lưu', icon: Settings },
  ];

  const isTabActive = (id) => {
    if (id === 'mascots-hub' && activeTab === 'mascots') return true;
    return activeTab === id;
  };

  return (
    <aside className="sidebar">
      <div className="sidebar-scroll">
        {/* Brand Header inside Sidebar (1:1 Reference Video Style) */}
        <div className="sidebar-brand">
          <div className="brand-mark">
            {appLogoUrl ? <img src={appLogoUrl} alt="Antigravity" /> : <Sparkles size={15} />}
          </div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div className="brand-title">Antigravity Studio</div>
            <div className="sidebar-brand-sub">BY MQINPUIENHZG · v11.2</div>
          </div>
        </div>

        <nav className="nav-list">
          {/* Primary Collection Item */}
          <button
            type="button"
            className={`nav-item nav-item-hero ${activeTab === 'themes' ? 'active' : ''}`}
            onClick={() => onSelectTab('themes')}
          >
            <Palette size={15} strokeWidth={2} />
            <span>Bộ Sưu Tập Theme</span>
            <span className="nav-count">{counts.all || 0}</span>
          </button>

          {/* Expandable Library Group (Exact Match to Video) */}
          <button
            type="button"
            className="nav-group-toggle"
            onClick={() => setLibOpen((o) => !o)}
          >
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
              <FolderOpen size={14} />
              <span>Thư Viện</span>
            </span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <span className="nav-count">{counts.all || 0}</span>
              <ChevronDown size={12} className={`inspector-chevron ${libOpen ? 'open' : ''}`} />
            </span>
          </button>

          {libOpen && (
            <div className="nav-sub-list">
              {libItems.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    type="button"
                    className={`nav-sub-item ${activeTab === item.id ? 'active' : ''}`}
                    onClick={() => onSelectTab(item.id)}
                  >
                    <Icon size={13} strokeWidth={1.9} />
                    <span>{item.label}</span>
                    <span className="nav-count">{item.count}</span>
                  </button>
                );
              })}
            </div>
          )}

          <div className="sidebar-divider" />

          {mainNav.map((item) => {
            const Icon = item.icon;
            const targetId = item.id === 'mascots-hub' ? 'mascots' : item.id;
            return (
              <button
                key={item.id}
                type="button"
                className={`nav-item ${isTabActive(item.id) ? 'active' : ''}`}
                onClick={() => onSelectTab(targetId)}
              >
                <Icon size={14} strokeWidth={1.9} />
                <span>{item.label}</span>
                {item.badge && <span className="nav-live-badge">{item.badge}</span>}
                {!item.badge && item.count != null && <span className="nav-count">{item.count}</span>}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Bottom Live Engine Status & Auto-Inject Toggle (Exact Match to Video!) */}
      <div className="sidebar-footer">
        <div className="sidebar-status-head">
          <span className="sidebar-status-title">Antigravity Engine</span>
          <span className={`sidebar-status-dot ${cdpStatus?.connected ? 'on' : ''}`} />
        </div>

        <div className="sidebar-status-rows">
          <div className="sidebar-status-row">
            <span>Chat App</span>
            <span className={`status-ver-tag ${cdpStatus?.chatConnected ? 'on' : ''}`}>
              ● {cdpStatus?.chatConnected ? 'v11' : 'chờ'}
            </span>
          </div>
          <div className="sidebar-status-row">
            <span>IDE Workbench</span>
            <span className={`status-ver-tag ${cdpStatus?.ideConnected ? 'on' : ''}`}>
              ● {cdpStatus?.ideConnected ? 'v11' : 'chờ'}
            </span>
          </div>
          <div className="sidebar-status-row">
            <span>CDP Cổng</span>
            <span className="status-port-tag">
              {cdpStatus?.port || '—'} {mediaPort ? `· M:${mediaPort}` : ''}
            </span>
          </div>
        </div>

        <div className="sidebar-autoinject-row">
          <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--ink-primary)' }}>
            Tự động tiêm khi mở app
          </span>
          <button
            type="button"
            className={`toggle-switch ${config?.autoApplyOnChange !== false ? 'on' : ''}`}
            onClick={() => onToggleAutoInject?.(!(config?.autoApplyOnChange !== false))}
            title="Tự động áp dụng theme ngay khi mở Antigravity IDE"
          />
        </div>
      </div>
    </aside>
  );
}
