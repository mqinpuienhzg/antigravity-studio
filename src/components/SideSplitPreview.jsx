import React, { useEffect, useRef, useState } from 'react';
import { Code2, Eye, Layers, MessageSquare, SlidersHorizontal, X } from 'lucide-react';
import { hexToRgbStr } from '../data/presets';

const HUMAN_BODY_ACTIONS = [
  { cls: 'startle', dur: 1020, blush: true, icons: ['💓', '🌸', '✨'], quote: 'Ơ kìa! Chạm bất ngờ làm tim em nhảy thót lên đấy~ 💓' },
  { cls: 'peek', dur: 1140, blush: true, icons: ['💕', '✨', '🌟'], quote: 'Ghé sát lại chút... anh đang viết dòng code gì bí mật thế? 👀💗' },
  { cls: 'kiss', dur: 1060, blush: true, icons: ['💋', '💖', '💕'], quote: 'Gửi anh một nụ hôn gió lấy hên fix bug nha~ 💋✨' },
  { cls: 'sway', dur: 1180, blush: false, icons: ['💖', '🌸', '✨'], quote: 'Nhìn em kỹ thế... em ngại đến đỏ mặt rồi đó~ 💖' },
  { cls: 'shy', dur: 980, blush: true, icons: ['😳', '💗', '🌸'], quote: 'Ấn em hoài à... ngại chết đi được ấy~ 😳💗' },
  { cls: 'flutter', dur: 960, blush: true, icons: ['💓', '💖', '💗'], quote: 'Thình thịch... chạm khẽ thế thôi mà em rung động rồi~ 💓' },
  { cls: 'pirouette', dur: 1160, blush: false, icons: ['🦋', '✨', '🌸'], quote: 'Quay lại nhìn anh một chút nè~ Tập trung code nhé! 🦋✨' },
  { cls: 'waltz', dur: 1200, blush: false, icons: ['💎', '🌟', '🌸'], quote: 'Nghỉ tay một nhịp thư giãn cùng em đi nào~ 🦋🌸' },
];

function MediaStage({ theme, enabled, blurPx, dimAlpha, overlayRgb, fit, videoSpeed, videoVolume, neonRgb }) {
  const vidRef = useRef(null);
  const isVideo = theme?.mediaType === 'video';

  useEffect(() => {
    const v = vidRef.current;
    if (!v) return;
    v.playbackRate = Math.max(0.25, Math.min(2.5, Number(videoSpeed) || 1));
    const vol = Math.max(0, Math.min(1, (Number(videoVolume) || 0) / 100));
    v.muted = vol === 0;
    v.volume = vol;
  }, [videoSpeed, videoVolume, theme?.mediaUrl]);

  if (!enabled) {
    return <div className="split-media-fill" style={{ background: '#16161a' }} />;
  }

  return (
    <>
      <div className="split-media-fill">
        {theme?.mediaUrl ? (
          isVideo ? (
            <video
              ref={vidRef}
              key={theme.mediaUrl}
              src={theme.mediaUrl}
              poster={theme.posterUrl || undefined}
              autoPlay
              loop
              muted={(videoVolume || 0) === 0}
              playsInline
              style={{
                width: '100%',
                height: '100%',
                objectFit: fit,
                filter: blurPx > 0 ? `blur(${blurPx}px) scale(${1 + blurPx * 0.004})` : 'none',
              }}
            />
          ) : (
            <img
              src={theme.mediaUrl}
              alt={theme.name}
              style={{
                width: '100%',
                height: '100%',
                objectFit: fit,
                filter: blurPx > 0 ? `blur(${blurPx}px) scale(${1 + blurPx * 0.004})` : 'none',
              }}
            />
          )
        ) : (
          <div
            style={{
              width: '100%',
              height: '100%',
              background:
                theme?.pureBg ||
                `radial-gradient(circle at 75% 25%, rgba(${neonRgb}, 0.24), transparent 55%), linear-gradient(160deg, #090d1e, #050712)`,
            }}
          />
        )}
      </div>
      <div
        className="split-media-scrim"
        style={{
          background: `radial-gradient(ellipse at 50% 45%, rgba(${overlayRgb}, ${(dimAlpha * 0.72).toFixed(3)}) 0%, rgba(${overlayRgb}, ${Math.min(0.92, dimAlpha * 1.15).toFixed(3)}) 100%)`,
        }}
      />
    </>
  );
}

export default function SideSplitPreview({
  config,
  chatTheme,
  ideTheme,
  hoverTheme,
  mascot,
  userAvatarUrl,
  agentAvatarUrl,
  demoToast,
  mascotPulseKey,
  onClose,
}) {
  const [layoutMode, setLayoutMode] = useState('dual'); // 'dual' | 'ide' | 'chat' | 'settings'
  const [mascotAnim, setMascotAnim] = useState('');
  const [mascotBlush, setMascotBlush] = useState(false);
  const [mascotSpeech, setMascotSpeech] = useState('');
  const [sparkles, setSparkles] = useState([]);
  const [gazeTransform, setGazeTransform] = useState('none');
  const [dragPos, setDragPos] = useState(null);

  const chatPaneRef = useRef(null);
  const speechTimerRef = useRef(null);
  const animTimerRef = useRef(null);
  const charmDeckRef = useRef([]);
  const dragRef = useRef({ down: false, moved: false, startX: 0, startY: 0, origL: 0, origT: 0, lastX: 0, tilt: 0 });

  const unified = config.unifiedFullWindow !== false;
  const resolvedIdeTheme = hoverTheme || (unified ? chatTheme || ideTheme : ideTheme || chatTheme);
  const resolvedChatTheme = hoverTheme || (unified ? chatTheme || ideTheme : chatTheme || ideTheme);

  const isLight = Boolean(config.isLightMode);
  const neonHex = config.neonColor || resolvedChatTheme?.accent || '#c084fc';
  const neonSec = config.neonSecondary || resolvedChatTheme?.secondary || '#38bdf8';
  const neonRgb = hexToRgbStr(neonHex);
  const overlayRgb = isLight ? '244, 247, 255' : (resolvedChatTheme?.overlayRgb || '8, 10, 22');

  const blurPx = config.wallpaperBlur || 0;
  const dimAlpha = (config.dimming ?? 14) / 100;
  const sidebarAlpha = (config.sidebarOpacity ?? 0) / 100;
  const chatAlpha = (config.chatBoxOpacity ?? 0) / 100;
  const editorAlpha = (config.editorOpacity ?? 18) / 100;
  const fit = config.videoObjectFit === 'contain' ? 'contain' : 'cover';

  const textInk = isLight ? '#0f172a' : '#f1f5f9';
  const mutedInk = isLight ? '#475569' : '#cbd5e1';
  const textShadow = isLight ? 'none' : '0 1px 2px rgba(0,0,0,0.96), 0 0 8px rgba(0,0,0,0.75)';
  const lgClearBg = 'linear-gradient(155deg, rgba(255, 255, 255, 0.09) 0%, rgba(10, 14, 28, 0.05) 50%, rgba(255, 255, 255, 0.05) 100%)';

  const triggerMascotReaction = (relY = 0.5, isDouble = false, customMsg = '') => {
    let act;
    if (isDouble) {
      act = { cls: 'spin', dur: 1200, blush: true, icons: ['💋', '💖', '🦋', '✨', '💎'], quote: 'Đặc quyền riêng cho Đại Đế nè~ Siêu năng lượng +100% 💋💖' };
    } else if (relY < 0.34) {
      act = { cls: 'headpat', dur: 1120, blush: true, icons: ['🥰', '✨', '💕', '🌸'], quote: 'Xoa đầu em thế này... thích quá đi mất~ 🥰✨' };
    } else if (relY > 0.72) {
      act = { cls: 'tease', dur: 960, blush: true, icons: ['😳', '💢', '💗'], quote: 'Á! Chạm đâu đấy, hư quá rồi nha~ 😳💢' };
    } else {
      if (!charmDeckRef.current.length) {
        const idxs = HUMAN_BODY_ACTIONS.map((_, i) => i);
        for (let i = idxs.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [idxs[i], idxs[j]] = [idxs[j], idxs[i]];
        }
        charmDeckRef.current = idxs;
      }
      act = HUMAN_BODY_ACTIONS[charmDeckRef.current.pop()];
    }

    setMascotSpeech(customMsg || act.quote);
    setMascotBlush(Boolean(act.blush));
    setMascotAnim('');
    requestAnimationFrame(() => setMascotAnim(act.cls));

    const batch = Array.from({ length: isDouble ? 9 : 6 }).map((_, i) => ({
      id: Date.now() + i,
      icon: act.icons[i % act.icons.length],
      dx: Math.round((Math.random() - 0.5) * 84),
      dy: -Math.round(30 + Math.random() * 44),
    }));
    setSparkles(batch);

    clearTimeout(animTimerRef.current);
    animTimerRef.current = setTimeout(() => {
      setMascotAnim('');
      setMascotBlush(false);
      setSparkles([]);
    }, act.dur + 50);

    clearTimeout(speechTimerRef.current);
    speechTimerRef.current = setTimeout(() => setMascotSpeech(''), 2900);
  };

  useEffect(() => {
    if (mascotPulseKey > 0 && mascot) {
      triggerMascotReaction(0.5, false, `Xin chào! Em là ${mascot.name} ✨`);
    }
  }, [mascotPulseKey]);

  const showMascot = Boolean(config.enabled && config.mascotEnabled && mascot?.mediaUrl);
  const mascotSize = Math.round(Math.max(48, Math.min(96, (config.mascotSize || 124) * 0.66)));

  const handleMascotPointerDown = (e) => {
    if (e.button !== 0) return;
    e.preventDefault();
    const box = e.currentTarget;
    const parent = chatPaneRef.current;
    if (!parent) return;
    const pr = parent.getBoundingClientRect();
    const br = box.getBoundingClientRect();
    dragRef.current = {
      down: true,
      moved: false,
      startX: e.clientX,
      startY: e.clientY,
      lastX: e.clientX,
      tilt: 0,
      origL: br.left - pr.left,
      origT: br.top - pr.top,
    };
    try { box.setPointerCapture(e.pointerId); } catch (_) {}
  };

  const handleMascotPointerMove = (e) => {
    const d = dragRef.current;
    const box = e.currentTarget;
    if (!d.down) {
      const r = box.getBoundingClientRect();
      const nx = ((e.clientX - r.left) / Math.max(1, r.width) - 0.5) * 2;
      const ny = ((e.clientY - r.top) / Math.max(1, r.height) - 0.5) * 2;
      setGazeTransform(`translate3d(${(nx * 3).toFixed(1)}px, -2px, 0) rotateY(${(nx * 10).toFixed(1)}deg) rotateX(${(-ny * 6).toFixed(1)}deg) rotateZ(${(nx * 3.5).toFixed(1)}deg) scale(1.04)`);
      return;
    }
    const dx = e.clientX - d.startX;
    const dy = e.clientY - d.startY;
    if (!d.moved && Math.hypot(dx, dy) > 5) d.moved = true;
    if (d.moved && chatPaneRef.current) {
      const pr = chatPaneRef.current.getBoundingClientRect();
      const nextL = Math.max(6, Math.min(pr.width - mascotSize - 6, Math.round(d.origL + dx)));
      const nextT = Math.max(28, Math.min(pr.height - mascotSize - 6, Math.round(d.origT + dy)));
      const vx = e.clientX - d.lastX;
      d.lastX = e.clientX;
      d.tilt = Math.max(-15, Math.min(15, d.tilt * 0.6 + vx * 0.55));
      setDragPos({ left: nextL, top: nextT });
      setGazeTransform(`translate3d(0, -5px, 0) rotateZ(${d.tilt.toFixed(1)}deg) scale(1.06)`);
    }
  };

  const handleMascotPointerUp = (e) => {
    const d = dragRef.current;
    if (!d.down) return;
    d.down = false;
    try { e.currentTarget.releasePointerCapture(e.pointerId); } catch (_) {}
    setGazeTransform('none');
    if (d.moved) {
      setMascotAnim('land');
      setMascotSpeech('Đặt em ở đây nhìn mê quá đi~ ✨');
      clearTimeout(animTimerRef.current);
      animTimerRef.current = setTimeout(() => setMascotAnim(''), 560);
      clearTimeout(speechTimerRef.current);
      speechTimerRef.current = setTimeout(() => setMascotSpeech(''), 2400);
    } else {
      const r = e.currentTarget.getBoundingClientRect();
      const relY = (e.clientY - r.top) / Math.max(1, r.height);
      triggerMascotReaction(relY, false);
    }
  };

  const singleSharedBg = unified && layoutMode === 'dual';

  return (
    <aside className="side-split-preview">
      <div className="side-split-head">
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
          <Eye size={13} color="var(--studio-accent)" />
          <span style={{ fontSize: 12, fontWeight: 700, color: '#fff', whiteSpace: 'nowrap' }}>Xem trước trực tiếp</span>
          <span className="demo-fps-badge">60 FPS</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <div className="side-split-seg">
            <button
              type="button"
              className={layoutMode === 'dual' ? 'active' : ''}
              onClick={() => setLayoutMode('dual')}
              title="Chia đôi IDE (trên) + Chat (dưới)"
            >
              <Layers size={11} />
              <span>Cả 2</span>
            </button>
            <button
              type="button"
              className={layoutMode === 'ide' ? 'active' : ''}
              onClick={() => setLayoutMode('ide')}
              title="Phóng to xem trước IDE"
            >
              <Code2 size={11} />
            </button>
            <button
              type="button"
              className={layoutMode === 'chat' ? 'active' : ''}
              onClick={() => setLayoutMode('chat')}
              title="Phóng to xem trước Chat"
            >
              <MessageSquare size={11} />
            </button>
            <button
              type="button"
              className={layoutMode === 'settings' ? 'active' : ''}
              onClick={() => setLayoutMode('settings')}
              title="Xem trước Settings trong suốt"
            >
              <SlidersHorizontal size={11} />
            </button>
          </div>
          <button type="button" className="win-btn" style={{ width: 24, height: 24 }} onClick={onClose} title="Ẩn khung xem trước cạnh phải">
            <X size={13} />
          </button>
        </div>
      </div>

      <div className="side-split-stage" style={{ color: textInk, textShadow }}>
        {/* When unified + dual mode, render ONE single shared video across BOTH IDE & Chat panes to save 50% RAM! */}
        {singleSharedBg && (
          <MediaStage
            theme={resolvedChatTheme}
            enabled={config.enabled}
            blurPx={blurPx}
            dimAlpha={dimAlpha}
            overlayRgb={overlayRgb}
            fit={fit}
            videoSpeed={config.videoSpeed}
            videoVolume={config.videoVolume}
            neonRgb={neonRgb}
          />
        )}

        {hoverTheme && (
          <div className="preview-hover-badge" style={{ top: 8 }}>
            Đang xem thử: <strong>{hoverTheme.name}</strong>
          </div>
        )}
        {!hoverTheme && demoToast && (
          <div className="demo-toast" style={{ top: 8 }}>
            {demoToast}
          </div>
        )}

        <div className="side-split-stack">
          {/* TOP PANE: ANTIGRAVITY IDE (shown in dual & ide modes) */}
          {(layoutMode === 'dual' || layoutMode === 'ide') && (
            <div className="side-split-pane">
              {!singleSharedBg && (
                <MediaStage
                  theme={resolvedIdeTheme}
                  enabled={config.enabled}
                  blurPx={blurPx}
                  dimAlpha={dimAlpha}
                  overlayRgb={overlayRgb}
                  fit={fit}
                  videoSpeed={config.videoSpeed}
                  videoVolume={config.videoVolume}
                  neonRgb={neonRgb}
                />
              )}
              <div className="side-split-pane-ui">
                <div
                  className="split-titlebar"
                  style={{
                    background:
                      !config.enabled
                        ? '#1c1c21'
                        : sidebarAlpha <= 0.01
                        ? 'transparent'
                        : `rgba(${overlayRgb}, ${sidebarAlpha.toFixed(2)})`,
                  }}
                >
                  <span className="split-badge-ide">Antigravity IDE</span>
                  <span style={{ opacity: 0.78, fontSize: 9.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {resolvedIdeTheme?.name || 'Custom'}
                  </span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, opacity: 0.75 }}>— □ ✕</span>
                </div>

                <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>
                  {/* Activity Bar */}
                  <div
                    style={{
                      width: 24,
                      background: config.enabled ? `rgba(${overlayRgb}, ${sidebarAlpha.toFixed(2)})` : '#18181b',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      paddingTop: 7,
                      gap: 7,
                      flexShrink: 0,
                    }}
                  >
                    {['#38bdf8', '#c084fc', '#34d399', '#fb923c', '#f472b6'].map((c, idx) => (
                      <div
                        key={c}
                        style={{
                          width: 10,
                          height: 10,
                          borderRadius: 3,
                          background: c,
                          opacity: idx === 0 ? 1 : 0.72,
                          boxShadow: idx === 0 ? `0 0 8px ${c}` : 'none',
                        }}
                      />
                    ))}
                  </div>

                  {/* Mini Explorer */}
                  <div
                    style={{
                      width: 96,
                      padding: '6px 6px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 3,
                      background: config.enabled ? `rgba(${overlayRgb}, ${sidebarAlpha.toFixed(2)})` : '#18181b',
                      flexShrink: 0,
                    }}
                  >
                    <div style={{ fontSize: 8.5, fontWeight: 700, opacity: 0.75, letterSpacing: '0.05em' }}>EXPLORER</div>
                    {['App.jsx', 'main.cjs', 'injector.cjs', 'app.css'].map((f, i) => (
                      <div
                        key={f}
                        style={{
                          padding: '2.5px 5px',
                          borderRadius: 5,
                          fontSize: 9.5,
                          background: i === 0 && config.enabled ? `rgba(${neonRgb}, 0.22)` : 'transparent',
                          color: i === 0 ? '#fff' : mutedInk,
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                      >
                        {f}
                      </div>
                    ))}
                  </div>

                  {/* Code Editor */}
                  <div
                    style={{
                      flex: 1,
                      minWidth: 0,
                      padding: '7px 9px',
                      fontFamily: 'var(--font-mono)',
                      fontSize: 9.5,
                      lineHeight: 1.6,
                      background: config.enabled ? `rgba(${overlayRgb}, ${editorAlpha.toFixed(2)})` : '#1e1e24',
                      overflow: 'hidden',
                    }}
                  >
                    <div style={{ display: 'flex', gap: 4, marginBottom: 5 }}>
                      <span
                        style={{
                          padding: '1.5px 7px',
                          borderRadius: 6,
                          fontSize: 9,
                          background: `linear-gradient(135deg, rgba(${neonRgb}, 0.28), rgba(56,189,248,0.16))`,
                          border: `1px solid rgba(${neonRgb}, 0.5)`,
                          color: '#fff',
                          fontFamily: 'var(--font-ui)',
                          fontWeight: 600,
                        }}
                      >
                        StudioTheme.ts
                      </span>
                      <span style={{ padding: '1.5px 6px', fontSize: 9, opacity: 0.65, fontFamily: 'var(--font-ui)' }}>
                        app.css
                      </span>
                    </div>
                    <div><span style={{ color: '#c084fc' }}>export const</span> <span style={{ color: '#38bdf8' }}>liquidGlass</span> = {'{'}</div>
                    <div style={{ paddingLeft: 10 }}>blur: <span style={{ color: '#fbbf24' }}>{blurPx}</span>, seam: <span style={{ color: '#34d399' }}>0</span>,</div>
                    <div style={{ paddingLeft: 10 }}>ramMode: <span style={{ color: '#f472b6' }}>'eco-single'</span>,</div>
                    <div style={{ paddingLeft: 10 }}>fps: <span style={{ color: '#34d399' }}>60</span>,</div>
                    <div>{'}'};</div>
                  </div>
                </div>

                {/* Transparent Floating Pill Statusbar */}
                <div
                  className="split-statusbar"
                  style={{
                    background:
                      !config.enabled
                        ? '#18181b'
                        : sidebarAlpha <= 0.02
                        ? 'transparent'
                        : `rgba(${overlayRgb}, ${sidebarAlpha.toFixed(2)})`,
                  }}
                >
                  <span>✓ 0 ⚠ 0</span>
                  <span style={{ display: 'flex', gap: 5 }}>
                    <span className="split-sb-pill">G4AM: 100%</span>
                    <span className="split-sb-pill accent">Antigravity</span>
                  </span>
                </div>
              </div>
            </div>
          )}

          {layoutMode === 'dual' && <div className="side-split-divider" />}

          {/* BOTTOM PANE: ANTIGRAVITY CHAT APP (shown in dual & chat modes) */}
          {(layoutMode === 'dual' || layoutMode === 'chat') && (
            <div className="side-split-pane" ref={chatPaneRef}>
              {!singleSharedBg && (
                <MediaStage
                  theme={resolvedChatTheme}
                  enabled={config.enabled}
                  blurPx={blurPx}
                  dimAlpha={dimAlpha}
                  overlayRgb={overlayRgb}
                  fit={fit}
                  videoSpeed={config.videoSpeed}
                  videoVolume={config.videoVolume}
                  neonRgb={neonRgb}
                />
              )}
              <div className="side-split-pane-ui">
                <div
                  className="split-titlebar"
                  style={{
                    background:
                      !config.enabled
                        ? '#1c1c21'
                        : sidebarAlpha <= 0.01
                        ? 'transparent'
                        : `rgba(${overlayRgb}, ${sidebarAlpha.toFixed(2)})`,
                  }}
                >
                  <span className="split-badge-chat">Antigravity Chat</span>
                  <span style={{ opacity: 0.78, fontSize: 9.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {resolvedChatTheme?.name || 'Custom'}
                  </span>
                  <span style={{ fontSize: 9, opacity: 0.78 }}>+ ⋮</span>
                </div>

                <div style={{ flex: 1, padding: '8px 10px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: 0, gap: 6 }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'flex-end', gap: 5 }}>
                      <div
                        style={{
                          padding: '5px 9px',
                          borderRadius: Math.min(12, config.cornerRadius || 12),
                          background: config.enabled ? lgClearBg : '#27272a',
                          backdropFilter: config.enabled ? 'blur(4px) saturate(160%)' : 'none',
                          border: config.enabled ? '1px solid rgba(255,255,255,0.22)' : 'none',
                          boxShadow: config.enabled ? 'inset 0 1px 1px rgba(255,255,255,0.32)' : 'none',
                          fontSize: 10,
                          color: '#fff',
                          maxWidth: '84%',
                        }}
                      >
                        Trong suốt không thanh nối + linh vật tương tác như thật!
                      </div>
                      {userAvatarUrl && config.enabled && (
                        <img
                          src={userAvatarUrl}
                          alt=""
                          style={{ width: 18, height: 18, borderRadius: `${config.avatarRadius ?? 50}%`, objectFit: 'cover' }}
                        />
                      )}
                    </div>

                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: 6,
                        padding: chatAlpha <= 0.01 ? '2px 2px' : '6px 9px',
                        borderRadius: Math.min(12, config.cornerRadius || 12),
                        background:
                          !config.enabled
                            ? '#1c1c21'
                            : chatAlpha <= 0.01
                            ? 'transparent'
                            : `rgba(${overlayRgb}, ${chatAlpha.toFixed(2)})`,
                        maxWidth: '78%',
                      }}
                    >
                      {agentAvatarUrl && config.enabled && (
                        <img
                          src={agentAvatarUrl}
                          alt=""
                          style={{ width: 18, height: 18, borderRadius: `${config.avatarRadius ?? 50}%`, objectFit: 'cover', flexShrink: 0 }}
                        />
                      )}
                      <div style={{ fontSize: 10, lineHeight: 1.5 }}>
                        Đã xóa sạch vết tối mép Chat, tối ưu RAM cực nhẹ. Thử bấm vào đầu hoặc kéo em linh vật bên phải xem nè! ✨
                      </div>
                    </div>
                  </div>

                  {/* Clear Liquid Glass Composer */}
                  <div
                    style={{
                      padding: '6px 10px',
                      borderRadius: Math.min(12, config.cornerRadius || 12),
                      background: config.enabled ? lgClearBg : '#18181b',
                      backdropFilter: config.enabled ? 'blur(5px) saturate(165%)' : 'none',
                      border: config.enabled ? '1px solid rgba(255,255,255,0.24)' : '1px solid rgba(255,255,255,0.08)',
                      boxShadow: config.enabled ? 'inset 0 1px 1px rgba(255,255,255,0.32)' : 'none',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      fontSize: 10,
                      color: mutedInk,
                    }}
                  >
                    <span>Ask anything, @ to mention...</span>
                    <span style={{ color: '#fff', fontWeight: 700 }}>→</span>
                  </div>
                </div>
              </div>

              {/* Live Interactive Human-Like Mascot inside Right Split Preview (Click Head/Body/Feet + Drag!) */}
              {showMascot && (
                <div
                  className={`demo-mascot-wrap ${mascotAnim ? `anim-${mascotAnim}` : ''}`}
                  style={{
                    position: 'absolute',
                    ...(dragPos ? { left: dragPos.left, top: dragPos.top } : { bottom: 42, right: 10 }),
                    width: mascotSize,
                    height: mascotSize,
                    opacity: (config.mascotOpacity ?? 96) / 100,
                    zIndex: 25,
                    cursor: 'grab',
                    touchAction: 'none',
                    perspective: 520,
                    filter: `drop-shadow(0 6px 16px rgba(${neonRgb}, 0.55))`,
                  }}
                  title="Xoa đầu / Bấm tương tác • Nháy đúp xoay • Kéo thả thử trực tiếp"
                  onPointerDown={handleMascotPointerDown}
                  onPointerMove={handleMascotPointerMove}
                  onPointerUp={handleMascotPointerUp}
                  onPointerLeave={() => { if (!dragRef.current.down) setGazeTransform('none'); }}
                  onDoubleClick={() => triggerMascotReaction(0.5, true)}
                >
                  {mascotSpeech && <div className="demo-mascot-bubble" style={{ maxWidth: 190 }}>{mascotSpeech}</div>}
                  {sparkles.map((s) => (
                    <span key={s.id} className="demo-sparkle" style={{ '--dx': `${s.dx}px`, '--dy': `${s.dy}px` }}>
                      {s.icon}
                    </span>
                  ))}
                  <div
                    style={{
                      width: '100%',
                      height: '100%',
                      position: 'relative',
                      transform: gazeTransform,
                      transition: dragRef.current.down ? 'transform 0.08s linear' : 'transform 0.24s cubic-bezier(0.22, 1, 0.36, 1)',
                    }}
                  >
                    <div
                      style={{
                        position: 'absolute',
                        inset: '12% 16% 36% 16%',
                        borderRadius: '50%',
                        pointerEvents: 'none',
                        opacity: mascotBlush ? 1 : 0,
                        background: 'radial-gradient(circle, rgba(251, 113, 133, 0.38) 0%, rgba(244, 114, 182, 0.14) 55%, transparent 78%)',
                        filter: 'blur(5px)',
                        transition: 'opacity 0.25s ease',
                        zIndex: 3,
                      }}
                    />
                    {/\.(mp4|webm)$/i.test(mascot.filePath || '') ? (
                      <video src={mascot.mediaUrl} autoPlay loop muted playsInline draggable={false} style={{ width: '100%', height: '100%', objectFit: 'contain', borderRadius: 10, pointerEvents: 'none', transform: config.mascotFlip ? 'scaleX(-1)' : 'none' }} />
                    ) : (
                      <img src={mascot.mediaUrl} alt={mascot.name} draggable={false} style={{ width: '100%', height: '100%', objectFit: 'contain', pointerEvents: 'none', transform: config.mascotFlip ? 'scaleX(-1)' : 'none' }} />
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* SETTINGS MODE */}
          {layoutMode === 'settings' && (
            <div className="side-split-pane">
              <MediaStage
                theme={resolvedIdeTheme}
                enabled={config.enabled}
                blurPx={blurPx}
                dimAlpha={dimAlpha}
                overlayRgb={overlayRgb}
                fit={fit}
                videoSpeed={config.videoSpeed}
                videoVolume={config.videoVolume}
                neonRgb={neonRgb}
              />
              <div className="side-split-pane-ui" style={{ padding: 12, gap: 10 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>Antigravity Settings (Trong suốt 100%)</div>
                <div
                  style={{
                    padding: '9px 11px',
                    borderRadius: 10,
                    background: `rgba(${overlayRgb}, ${Math.max(0.16, (config.settingsOpacity ?? 20) / 100).toFixed(2)})`,
                    border: '1px solid rgba(255,255,255,0.14)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 650 }}>Clear Liquid Glass</div>
                    <div style={{ fontSize: 9.5, color: mutedInk }}>Không mảng xám đục che hình nền</div>
                  </div>
                  <div style={{ width: 28, height: 15, borderRadius: 99, background: neonHex }} />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
