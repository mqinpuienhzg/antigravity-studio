import React, { useState } from 'react';
import {
  BookmarkPlus,
  Clock,
  Dices,
  Layers,
  Play,
  Sparkles,
  Trash2,
} from 'lucide-react';

function formatShortDate(ts) {
  if (!ts) return '';
  try {
    return new Date(ts).toLocaleString('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
      day: '2-digit',
      month: '2-digit',
    });
  } catch (_) {
    return '';
  }
}

export default function CombosHistoryTab({
  savedCombos = [],
  themeHistory = [],
  activeTheme,
  onSaveCombo,
  onApplyCombo,
  onDeleteCombo,
  onRandomize,
  onSelectHistoryTheme,
}) {
  const [comboName, setComboName] = useState('');
  const [onlyVideo, setOnlyVideo] = useState(true);
  const [syncAccent, setSyncAccent] = useState(true);
  const [randomMascot, setRandomMascot] = useState(false);
  const [busyRandom, setBusyRandom] = useState(false);

  const handleSave = async (e) => {
    e.preventDefault();
    const label = comboName.trim() || `${activeTheme?.name || 'Setup'} · ${new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}`;
    await onSaveCombo(label);
    setComboName('');
  };

  const handleRoll = async () => {
    setBusyRandom(true);
    try {
      await onRandomize({ onlyVideo, syncAccent, randomMascot });
    } finally {
      setBusyRandom(false);
    }
  };

  return (
    <section style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* Top Row: Save Current Combo + Randomizer Studio */}
      <div className="page-section-grid">
        {/* Save Combo Box */}
        <div className="card-box">
          <div className="card-title">
            <BookmarkPlus size={15} color="var(--studio-accent)" />
            <span>Lưu Bộ Combo Hiện Tại</span>
          </div>
          <div className="card-desc">
            Ghi lại toàn bộ trạng thái hiện tại: hình nền video, độ trong suốt, font chữ, màu nhấn và linh vật để gọi lại chỉ với 1 bấm.
          </div>
          <form onSubmit={handleSave} style={{ display: 'flex', gap: 7, marginTop: 2 }}>
            <input
              type="text"
              className="studio-input"
              placeholder={`VD: ${activeTheme?.name || 'Anime Tím'} Đêm Mờ...`}
              value={comboName}
              onChange={(e) => setComboName(e.target.value)}
            />
            <button type="submit" className="btn btn-primary btn-sm" style={{ flexShrink: 0 }}>
              <BookmarkPlus size={13} />
              <span>Lưu Combo</span>
            </button>
          </form>
        </div>

        {/* Randomizer Studio */}
        <div className="card-box">
          <div className="card-title">
            <Dices size={15} color="var(--studio-accent)" />
            <span>Randomizer Studio</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
            <div className="toggle-row">
              <span style={{ fontSize: 11.5, color: 'var(--ink-secondary)' }}>Chỉ chọn Video động (MP4)</span>
              <button
                type="button"
                className={`toggle-switch ${onlyVideo ? 'on' : ''}`}
                onClick={() => setOnlyVideo((v) => !v)}
              />
            </div>
            <div className="toggle-row">
              <span style={{ fontSize: 11.5, color: 'var(--ink-secondary)' }}>Tự đồng bộ màu Accent theo theme</span>
              <button
                type="button"
                className={`toggle-switch ${syncAccent ? 'on' : ''}`}
                onClick={() => setSyncAccent((v) => !v)}
              />
            </div>
            <div className="toggle-row">
              <span style={{ fontSize: 11.5, color: 'var(--ink-secondary)' }}>Đổi ngẫu nhiên cả Linh vật</span>
              <button
                type="button"
                className={`toggle-switch ${randomMascot ? 'on' : ''}`}
                onClick={() => setRandomMascot((v) => !v)}
              />
            </div>
          </div>
          <button
            type="button"
            className="btn btn-primary btn-sm"
            disabled={busyRandom}
            onClick={handleRoll}
            style={{ marginTop: 2 }}
          >
            <Dices size={13} />
            <span>{busyRandom ? 'Đang trộn...' : 'Trộn Ngẫu Nhiên Ngay'}</span>
          </button>
        </div>
      </div>

      {/* Saved Combos Grid */}
      <div className="card-box">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div className="card-title">
            <Layers size={15} color="var(--studio-accent)" />
            <span>Bộ Combo Đã Lưu ({savedCombos.length})</span>
          </div>
          <span style={{ fontSize: 11, color: 'var(--ink-muted)' }}>Bấm thẻ để áp dụng toàn bộ setup</span>
        </div>

        {savedCombos.length === 0 ? (
          <div style={{ padding: '20px 10px', textAlign: 'center', color: 'var(--ink-muted)', fontSize: 12 }}>
            Chưa có bộ combo nào được lưu. Đặt tên ở ô phía trên rồi bấm <strong>Lưu Combo</strong> để tạo bộ sưu tập riêng của bạn.
          </div>
        ) : (
          <div className="combo-grid">
            {savedCombos.map((combo) => (
              <div
                key={combo.id}
                className="combo-card"
                onClick={() => onApplyCombo(combo.id)}
                title="Bấm để áp dụng combo này"
              >
                <div className="combo-thumb">
                  {combo.posterUrl || combo.mediaUrl ? (
                    combo.mediaType === 'video' && !combo.posterUrl ? (
                      <div style={{ width: '100%', height: '100%', background: `linear-gradient(135deg, ${combo.snapshot?.neonColor || '#a855f7'}44, #090c14)` }} />
                    ) : (
                      <img src={combo.posterUrl || combo.mediaUrl} alt={combo.name} loading="lazy" />
                    )
                  ) : (
                    <div
                      style={{
                        width: '100%',
                        height: '100%',
                        background: `linear-gradient(135deg, ${combo.snapshot?.neonColor || '#a855f7'}44, #090c14)`,
                      }}
                    />
                  )}
                  <div className="theme-thumb-gradient" />
                  <button
                    type="button"
                    className="icon-btn danger"
                    style={{ position: 'absolute', top: 7, right: 7, zIndex: 5 }}
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteCombo(combo.id);
                    }}
                    title="Xóa combo"
                  >
                    <Trash2 size={11} />
                  </button>
                  <div
                    style={{
                      position: 'absolute',
                      top: 7,
                      left: 7,
                      zIndex: 5,
                      width: 12,
                      height: 12,
                      borderRadius: '50%',
                      background: combo.snapshot?.neonColor || '#c084fc',
                      border: '1.5px solid rgba(255,255,255,0.8)',
                    }}
                    title="Màu nhấn của combo"
                  />
                </div>
                <div className="combo-body">
                  <div className="combo-name" title={combo.name}>{combo.name}</div>
                  <div className="combo-meta">
                    <span>{combo.themeName}</span>
                    <span>{formatShortDate(combo.savedAt)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recent Theme History */}
      <div className="card-box">
        <div className="card-title">
          <Clock size={15} color="var(--studio-accent)" />
          <span>Lịch Sử Chủ Đề Gần Đây ({themeHistory.length})</span>
        </div>

        {themeHistory.length === 0 ? (
          <div style={{ padding: '14px 6px', color: 'var(--ink-muted)', fontSize: 12 }}>
            Các chủ đề bạn từng chọn sẽ tự động xuất hiện tại đây để chuyển qua lại nhanh.
          </div>
        ) : (
          <div className="history-grid">
            {themeHistory.map((item) => {
              const th = item.theme;
              if (!th) return null;
              return (
                <button
                  key={`${th.id}-${item.usedAt}`}
                  type="button"
                  className="history-card"
                  onClick={() => onSelectHistoryTheme(th)}
                  title={`Chuyển lại "${th.name}"`}
                >
                  <div className="history-thumb">
                    {th.posterUrl || th.mediaUrl ? (
                      th.mediaType === 'video' && !th.posterUrl ? (
                        <div style={{ width: '100%', height: '100%', background: `linear-gradient(135deg, ${th.accent || '#a855f7'}44, #090c14)` }} />
                      ) : (
                        <img src={th.posterUrl || th.mediaUrl} alt={th.name} loading="lazy" />
                      )
                    ) : null}
                    {th.mediaType === 'video' && (
                      <span className="history-play-badge">
                        <Play size={8} fill="currentColor" />
                      </span>
                    )}
                  </div>
                  <div className="history-meta">
                    <div className="history-name">{th.name}</div>
                    <div className="history-time">{formatShortDate(item.usedAt)}</div>
                  </div>
                  <Sparkles size={12} color="var(--ink-muted)" style={{ flexShrink: 0 }} />
                </button>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
