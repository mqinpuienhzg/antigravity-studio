import React from 'react';
import { RotateCcw, Trash2 } from 'lucide-react';
import { formatBytes } from '../data/presets';

export default function TrashTab({
  trashThemes = [],
  onRestore,
  onDeleteForever,
  onEmptyTrash,
}) {
  return (
    <section className="card-box">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
        <div className="card-title">
          <Trash2 size={15} color="#f87171" />
          <span>Thùng Rác ({trashThemes.length})</span>
        </div>
        {trashThemes.length > 0 && (
          <button type="button" className="btn btn-danger btn-sm" onClick={onEmptyTrash}>
            <Trash2 size={12} />
            <span>Dọn sạch thùng rác</span>
          </button>
        )}
      </div>

      <div className="card-desc">
        Các chủ đề cá nhân bạn vừa xóa sẽ được giữ an toàn tại đây — có thể khôi phục về Thư viện chỉ bằng 1 bấm.
      </div>

      {trashThemes.length === 0 ? (
        <div style={{ padding: '26px 12px', textAlign: 'center', color: 'var(--ink-muted)', fontSize: 12 }}>
          Thùng rác hiện đang trống.
        </div>
      ) : (
        <div className="combo-grid">
          {trashThemes.map((t) => (
            <div key={t.id} className="combo-card" style={{ cursor: 'default' }}>
              <div className="combo-thumb">
                {t.mediaUrl ? (
                  t.mediaType === 'video' ? (
                    <video src={t.mediaUrl} muted playsInline preload="metadata" />
                  ) : (
                    <img src={t.mediaUrl} alt={t.name} />
                  )
                ) : null}
                <div className="theme-thumb-gradient" />
              </div>
              <div className="combo-body" style={{ gap: 6 }}>
                <div className="combo-name" title={t.name}>{t.name}</div>
                <div className="combo-meta">
                  <span>{formatBytes(t.fileSize)}</span>
                  <span>{t.mediaType === 'video' ? 'Video' : 'Ảnh'}</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 5, marginTop: 2 }}>
                  <button type="button" className="btn btn-sm" onClick={() => onRestore(t.id)}>
                    <RotateCcw size={11} />
                    <span>Khôi phục</span>
                  </button>
                  <button type="button" className="btn btn-danger btn-sm" onClick={() => onDeleteForever(t.id)}>
                    <Trash2 size={11} />
                    <span>Xóa hẳn</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
