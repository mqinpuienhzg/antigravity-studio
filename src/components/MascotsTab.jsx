import React, { useMemo, useState } from 'react';
import { FlipHorizontal, Heart, MousePointerClick, Plus, Sparkles, Trash2, Upload, UserCircle2 } from 'lucide-react';
import { MASCOT_ANIMS, MASCOT_POSITIONS } from '../data/presets';

const MASCOT_FILTERS = [
  { id: 'all', label: 'Tất Cả' },
  { id: 'cute', label: 'Cute Dễ Thương' },
  { id: 'cool', label: 'Cá Tính / Ngầu' },
  { id: 'bold', label: 'Quyến Rũ / Táo Bạo' },
  { id: 'user', label: 'Của Tôi' },
];

export default function MascotsTab({
  config,
  mascots,
  avatars,
  onPatchConfig,
  onSelectMascot,
  onTestMascot,
  onImportMascot,
  onDeleteMascot,
  onImportAvatar,
}) {
  const [filterCat, setFilterCat] = useState('all');
  const [quotesText, setQuotesText] = useState(
    (config.mascotQuotes || [
      'Chào Đại Đế! Hôm nay build gì nào? ✨',
      'Fix bug siêu mượt luôn 🔥',
      'Nhớ uống ngụm nước nhé sếp 💧',
      'Giao diện này xịn quá trời 💖',
    ]).join('\n')
  );

  const filteredMascots = useMemo(() => {
    if (filterCat === 'all') return mascots;
    if (filterCat === 'user') return mascots.filter((m) => m.source === 'user');
    return mascots.filter((m) => (m.category || 'cute') === filterCat);
  }, [mascots, filterCat]);

  const handleSaveQuotes = () => {
    const lines = quotesText
      .split(/\r?\n/)
      .map((s) => s.trim())
      .filter(Boolean);
    onPatchConfig({ mascotQuotes: lines }, true);
    onTestMascot();
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* Mascots & Animated Stickers */}
      <div className="card-box">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
          <div>
            <div className="card-title">
              <Heart size={16} color="#ec4899" />
              <span>Kho Linh Vật & Waifu Tương Tác (Từ Cute đến Quyến Rũ Táo Bạo)</span>
            </div>
            <div className="card-desc">
              Bấm vào Linh Vật trên Antigravity để tương tác, nháy đúp xoay 360°, kéo thả tự do hoặc tùy chỉnh kích thước, hào quang, chuyển động & lật hướng!
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button type="button" className="btn btn-primary btn-sm" onClick={onTestMascot}>
              <Sparkles size={13} />
              <span>Thử Tương Tác Ngay</span>
            </button>
            <button type="button" className="btn btn-cyan btn-sm" onClick={onImportMascot}>
              <Plus size={13} />
              <span>Tải Lên Sticker / GIF</span>
            </button>
            <button
              type="button"
              className={`toggle-switch ${config.mascotEnabled ? 'on' : ''}`}
              onClick={() => onPatchConfig({ mascotEnabled: !config.mascotEnabled }, true)}
              title="Bật / Tắt Linh Thú"
            />
          </div>
        </div>

        {/* Category Filter Tabs */}
        <div className="filter-tabs" style={{ flexWrap: 'wrap', marginTop: 4 }}>
          {MASCOT_FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              className={`filter-pill ${filterCat === f.id ? 'active' : ''}`}
              onClick={() => setFilterCat(f.id)}
            >
              {f.label}
            </button>
          ))}
        </div>

        <div className="mascot-grid">
          {filteredMascots.map((m) => {
            const selected = config.mascotId === m.id && config.mascotEnabled;
            const tagColor = m.category === 'bold' ? '#ec4899' : m.category === 'cool' ? '#38bdf8' : '#34d399';
            return (
              <div
                key={m.id}
                className={`mascot-card ${selected ? 'selected' : ''}`}
                onClick={() => onSelectMascot(m)}
              >
                {m.source === 'user' && (
                  <button
                    type="button"
                    className="icon-btn danger"
                    style={{ position: 'absolute', top: 6, right: 6 }}
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteMascot(m.id);
                    }}
                    title="Xóa"
                  >
                    <Trash2 size={11} />
                  </button>
                )}
                {!selected && m.tag && (
                  <span
                    style={{
                      position: 'absolute',
                      top: 6,
                      right: 6,
                      fontSize: 9,
                      fontWeight: 800,
                      padding: '1px 6px',
                      borderRadius: 5,
                      background: `${tagColor}28`,
                      border: `1px solid ${tagColor}70`,
                      color: tagColor,
                    }}
                  >
                    {m.tag}
                  </span>
                )}
                {selected && (
                  <span
                    style={{
                      position: 'absolute',
                      top: 6,
                      left: 6,
                      fontSize: 9,
                      fontWeight: 800,
                      padding: '1px 5px',
                      borderRadius: 5,
                      background: '#06b6d4',
                      color: '#04131c',
                    }}
                  >
                    ĐANG DÙNG
                  </span>
                )}
                <div style={{ width: 88, height: 88, display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: 8 }}>
                  {/\.(mp4|webm)$/i.test(m.filePath || '') ? (
                    <video
                      src={m.mediaUrl}
                      autoPlay
                      loop
                      muted
                      playsInline
                      style={{ width: '100%', height: '100%', objectFit: 'contain', borderRadius: 10 }}
                    />
                  ) : (
                    <img
                      src={m.mediaUrl}
                      alt={m.name}
                      style={{ width: '100%', height: '100%', objectFit: 'contain', filter: 'drop-shadow(0 4px 10px rgba(0,0,0,0.45))' }}
                    />
                  )}
                </div>
                <span style={{ fontSize: 11.5, fontWeight: 700, textAlign: 'center', color: '#e2e8f0' }}>
                  {m.name}
                </span>
              </div>
            );
          })}
        </div>

        <div className="page-section-grid" style={{ marginTop: 2 }}>
          <div className="toggle-row" style={{ padding: '9px 12px', borderRadius: 10, background: 'rgba(255,255,255,0.035)', border: '1px solid var(--hairline)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <MousePointerClick size={14} color="var(--studio-accent)" />
              <div>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#fff' }}>Click & Kéo Thả Tương Tác</div>
                <div style={{ fontSize: 10.5, color: 'var(--ink-muted)' }}>Bấm nhảy, nói chuyện & kéo thả tự do</div>
              </div>
            </div>
            <button
              type="button"
              className={`toggle-switch ${config.mascotInteractive !== false ? 'on' : ''}`}
              onClick={() => onPatchConfig({ mascotInteractive: config.mascotInteractive === false }, true)}
            />
          </div>

          <div className="toggle-row" style={{ padding: '9px 12px', borderRadius: 10, background: 'rgba(255,255,255,0.035)', border: '1px solid var(--hairline)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Sparkles size={14} color="var(--studio-accent-2)" />
              <div>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#fff' }}>Hào Quang Phát Sáng</div>
                <div style={{ fontSize: 10.5, color: 'var(--ink-muted)' }}>Tỏa ánh sáng dịu quanh viền nhân vật</div>
              </div>
            </div>
            <button
              type="button"
              className={`toggle-switch ${config.mascotGlow !== false ? 'on' : ''}`}
              onClick={() => onPatchConfig({ mascotGlow: config.mascotGlow === false }, true)}
            />
          </div>
        </div>

        <div className="page-section-grid" style={{ marginTop: 2 }}>
          <div className="slider-row">
            <div className="slider-label-line">
              <span>Vị Trí Mặc Định</span>
            </div>
            <select
              className="studio-select"
              value={config.mascotPosition || 'bottom-right'}
              onChange={(e) => onPatchConfig({ mascotPosition: e.target.value }, true)}
            >
              {MASCOT_POSITIONS.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label}
                </option>
              ))}
              <option value="custom">Tự do (Giữ vị trí đã kéo thả)</option>
            </select>
          </div>

          <div className="slider-row">
            <div className="slider-label-line">
              <span>Hiệu Ứng Chuyển Động</span>
            </div>
            <select
              className="studio-select"
              value={config.mascotAnim || 'float'}
              onChange={(e) => onPatchConfig({ mascotAnim: e.target.value }, true)}
            >
              {MASCOT_ANIMS.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.label}
                </option>
              ))}
            </select>
          </div>

          <div className="slider-row">
            <div className="slider-label-line">
              <span>Cửa Sổ Hiển Thị</span>
            </div>
            <select
              className="studio-select"
              value={config.mascotTarget || 'both'}
              onChange={(e) => onPatchConfig({ mascotTarget: e.target.value }, true)}
            >
              <option value="both">Cả Chat App & Code Editor</option>
              <option value="chat">Chỉ Antigravity Chat App</option>
              <option value="ide">Chỉ Antigravity Code Editor</option>
            </select>
          </div>

          <div className="toggle-row" style={{ alignSelf: 'end', padding: '6px 10px', borderRadius: 9, background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border)' }}>
            <span style={{ fontSize: 11.5, fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <FlipHorizontal size={14} color="#f472b6" />
              Lật Hướng Nhân Vật (Trái ↔ Phải)
            </span>
            <button
              type="button"
              className={`toggle-switch ${config.mascotFlip ? 'on' : ''}`}
              onClick={() => onPatchConfig({ mascotFlip: !config.mascotFlip }, true)}
            />
          </div>

          <div className="slider-row">
            <div className="slider-label-line">
              <span>Kích Thước Linh Vật (To/Nhỏ)</span>
              <span className="slider-val">{config.mascotSize ?? 124}px</span>
            </div>
            <input
              type="range"
              className="studio-range"
              min={48}
              max={240}
              value={config.mascotSize ?? 124}
              onChange={(e) => onPatchConfig({ mascotSize: Number(e.target.value) })}
            />
          </div>

          <div className="slider-row">
            <div className="slider-label-line">
              <span>Độ Rõ Nét (Opacity)</span>
              <span className="slider-val">{config.mascotOpacity ?? 96}%</span>
            </div>
            <input
              type="range"
              className="studio-range"
              min={20}
              max={100}
              value={config.mascotOpacity ?? 96}
              onChange={(e) => onPatchConfig({ mascotOpacity: Number(e.target.value) })}
            />
          </div>
        </div>

        {/* Custom Speech Lines */}
        <div className="slider-row">
          <div className="slider-label-line">
            <span>Lời Thoại Khi Bấm Vào Linh Thú (mỗi dòng 1 câu)</span>
            <button type="button" className="btn btn-sm btn-cyan" onClick={handleSaveQuotes}>
              Lưu Lời Thoại
            </button>
          </div>
          <textarea
            rows={3}
            className="studio-input"
            style={{ resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.45 }}
            value={quotesText}
            onChange={(e) => setQuotesText(e.target.value)}
          />
        </div>
      </div>

      {/* Chat Avatars */}
      <div className="card-box">
        <div className="card-title">
          <UserCircle2 size={16} color="#06b6d4" />
          <span>Avatar Hội Thoại (Người Dùng & AI Agent)</span>
        </div>
        <div className="card-desc">
          Hiển thị ảnh đại diện bên cạnh tin nhắn của bạn và phản hồi của AI Agent.
        </div>

        <div className="page-section-grid">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button type="button" className="btn btn-sm" onClick={() => onImportAvatar('user')}>
              <Upload size={13} />
              <span>Đổi Avatar Người Dùng</span>
            </button>
            <button
              type="button"
              className="btn btn-sm"
              onClick={() => onPatchConfig({ userAvatarId: '' }, true)}
            >
              Tắt / Mặc định
            </button>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button type="button" className="btn btn-sm" onClick={() => onImportAvatar('agent')}>
              <Upload size={13} />
              <span>Đổi Avatar AI Agent</span>
            </button>
            <button
              type="button"
              className="btn btn-sm"
              onClick={() => onPatchConfig({ agentAvatarId: '' }, true)}
            >
              Tắt / Mặc định
            </button>
          </div>
        </div>

        {avatars.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {avatars.map((av) => (
              <div
                key={av.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 7,
                  padding: '5px 8px',
                  borderRadius: 10,
                  background: 'rgba(9,11,20,0.7)',
                  border: '1px solid var(--border)',
                }}
              >
                <img
                  src={av.mediaUrl}
                  alt={av.name}
                  style={{ width: 26, height: 26, borderRadius: `${config.avatarRadius ?? 50}%`, objectFit: 'cover' }}
                />
                <span style={{ fontSize: 11, color: '#cbd5e1' }}>{av.name}</span>
                <button
                  type="button"
                  className="btn btn-sm"
                  style={{ padding: '2px 6px', fontSize: 10 }}
                  onClick={() => onPatchConfig({ userAvatarId: av.id }, true)}
                >
                  User
                </button>
                <button
                  type="button"
                  className="btn btn-sm"
                  style={{ padding: '2px 6px', fontSize: 10 }}
                  onClick={() => onPatchConfig({ agentAvatarId: av.id }, true)}
                >
                  AI
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="page-section-grid">
          <div className="slider-row">
            <div className="slider-label-line">
              <span>Kích Thước Avatar</span>
              <span className="slider-val">{config.avatarSize ?? 36}px</span>
            </div>
            <input
              type="range"
              className="studio-range"
              min={22}
              max={54}
              value={config.avatarSize ?? 36}
              onChange={(e) => onPatchConfig({ avatarSize: Number(e.target.value) })}
            />
          </div>

          <div className="slider-row">
            <div className="slider-label-line">
              <span>Bo Tròn Avatar</span>
              <span className="slider-val">{config.avatarRadius ?? 50}%</span>
            </div>
            <input
              type="range"
              className="studio-range"
              min={0}
              max={50}
              value={config.avatarRadius ?? 50}
              onChange={(e) => onPatchConfig({ avatarRadius: Number(e.target.value) })}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
