import React from 'react';
import { ListVideo, Play, RefreshCw, SkipForward, Star } from 'lucide-react';
import { PLAYLIST_INTERVALS } from '../data/presets';

export default function AutoRotateTab({
  config,
  themes = [],
  onPatchConfig,
  onTogglePlaylist,
  onNextPlaylist,
}) {
  const pinnedSet = new Set(config.playlistIds || []);
  const pinnedThemes = themes.filter((t) => pinnedSet.has(t.id));

  return (
    <section style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div className="card-box">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
          <div className="card-title">
            <RefreshCw size={15} color="var(--studio-accent)" />
            <span>Tự Động Đổi Theme (Playlist Carousel)</span>
          </div>
          <button
            type="button"
            className={`toggle-switch ${config.playlistEnabled ? 'on' : ''}`}
            onClick={() => onPatchConfig({ playlistEnabled: !config.playlistEnabled }, true)}
          />
        </div>
        <div className="card-desc">
          Tự động chuyển mượt mà giữa các hình nền yêu thích theo chu kỳ thời gian. Nếu chưa ghim theme nào, Studio sẽ xoay vòng qua toàn bộ kho Video động.
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: 8, alignItems: 'center' }}>
          <select
            className="studio-select"
            value={config.playlistIntervalSec || 120}
            onChange={(e) => onPatchConfig({ playlistIntervalSec: Number(e.target.value) }, true)}
          >
            {PLAYLIST_INTERVALS.map((it) => (
              <option key={it.sec} value={it.sec}>Đổi theme mỗi {it.label}</option>
            ))}
          </select>

          <select
            className="studio-select"
            value={config.playlistTarget || 'both'}
            onChange={(e) => onPatchConfig({ playlistTarget: e.target.value }, true)}
          >
            <option value="both">Áp dụng Toàn màn hình</option>
            <option value="chat">Chỉ đổi màn hình Chat</option>
            <option value="ide">Chỉ đổi màn hình IDE</option>
          </select>

          <button type="button" className="btn btn-apply-hero btn-sm" onClick={onNextPlaylist}>
            <SkipForward size={12} />
            <span>Chuyển ngay</span>
          </button>
        </div>
      </div>

      <div className="card-box">
        <div className="card-title">
          <ListVideo size={15} color="var(--studio-accent)" />
          <span>Danh Sách Theme Đã Ghim ({pinnedThemes.length})</span>
        </div>

        {pinnedThemes.length === 0 ? (
          <div style={{ padding: '16px 8px', color: 'var(--ink-muted)', fontSize: 12 }}>
            Chưa ghim theme riêng — bấm biểu tượng ngôi sao (★) trên bất kỳ thẻ theme nào trong Bộ Sưu Tập để thêm vào danh sách phát riêng.
          </div>
        ) : (
          <div className="history-grid">
            {pinnedThemes.map((th) => (
              <div key={th.id} className="history-card">
                <div className="history-thumb">
                  {th.mediaType === 'video' ? (
                    <video src={th.mediaUrl} muted playsInline preload="metadata" />
                  ) : (
                    <img src={th.mediaUrl} alt={th.name} />
                  )}
                  {th.mediaType === 'video' && (
                    <span className="history-play-badge"><Play size={8} fill="currentColor" /></span>
                  )}
                </div>
                <div className="history-meta">
                  <div className="history-name">{th.name}</div>
                  <div className="history-time">{th.resBadge || 'FHD'}</div>
                </div>
                <button
                  type="button"
                  className="icon-btn active-pl"
                  onClick={() => onTogglePlaylist(th.id)}
                  title="Bỏ khỏi Playlist"
                >
                  <Star size={11} fill="currentColor" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
