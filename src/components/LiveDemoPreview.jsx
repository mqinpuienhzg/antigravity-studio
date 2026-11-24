import React, { useEffect, useRef, useState } from 'react';
import { ChevronDown, ChevronUp, Code2, MessageSquare, SlidersHorizontal } from 'lucide-react';
import { hexToRgbStr } from '../data/presets';

export default function LiveDemoPreview({
  config,
  chatTheme,
  ideTheme,
  hoverTheme,
  mascot,
  userAvatarUrl,
  agentAvatarUrl,
  previewMode,
  onChangePreviewMode,
  demoToast,
  mascotPulseKey,
}) {
  const videoRef = useRef(null);
  const [collapsed, setCollapsed] = useState(false);
  const [mascotAnim, setMascotAnim] = useState('');
  const [mascotSpeech, setMascotSpeech] = useState('');
  const [sparkles, setSparkles] = useState([]);
  const speechTimerRef = useRef(null);
  const animTimerRef = useRef(null);
  const charmDeckRef = useRef([]);

  const CHARM_ACTIONS = [
    { cls: 'sway', dur: 1050, icons: ['💖', '🌸', '✨'], quote: 'Nhìn em kỹ thế... tim em loạn nhịp rồi đó~ 💖' },
    { cls: 'kiss', dur: 940, icons: ['💋', '💖', '💕'], quote: 'Gửi anh một nụ hôn gió lấy hên fix bug nha~ 💋✨' },
    { cls: 'pirouette', dur: 980, icons: ['🦋', '✨', '🌸'], quote: 'Xoay một vòng cho Đại Đế ngắm nè~ Đẹp không? 🦋✨' },
    { cls: 'peek', dur: 960, icons: ['💕', '✨', '🌟'], quote: 'Ghé sát lại chút... anh đang code gì bí mật thế? 👀💗' },
    { cls: 'flutter', dur: 880, icons: ['💓', '💖', '💗'], quote: 'Chạm khẽ thế thôi mà em rung động rồi đấy~ 💓' },
    { cls: 'catwalk', dur: 1020, icons: ['💎', '🌟', '💖'], quote: 'Tạo dáng thế này đủ làm anh phân tâm chưa? 😘💎' },
    { cls: 'waltz', dur: 1080, icons: ['🦋', '🌸', '💫'], quote: 'Nghỉ tay một nhịp khiêu vũ cùng em đi nào~ 🦋🌸' },
    { cls: 'shy', dur: 860, icons: ['😳', '💗', '🌸'], quote: 'Ấn em hoài à... ngại chết đi được ấy~ 😳💗' },
  ];

  const baseTheme =
    config.unifiedFullWindow !== false
      ? chatTheme || ideTheme
      : previewMode === 'ide' || previewMode === 'settings'
      ? ideTheme
      : chatTheme;
  const activeTheme = hoverTheme || baseTheme;
  const isVideo = activeTheme?.mediaType === 'video';
  const isLight = Boolean(config.isLightMode);

  const neonHex = config.neonColor || activeTheme?.accent || '#c084fc';
  const neonSec = config.neonSecondary || activeTheme?.secondary || '#38bdf8';
  const neonRgb = hexToRgbStr(neonHex);
  const glowFactor = (config.neonIntensity ?? 48) / 100;
  const overlayRgb = isLight ? '244, 247, 255' : (activeTheme?.overlayRgb || '7, 9, 22');

  const blurPx = config.wallpaperBlur || 0;
  const dimAlpha = (config.dimming ?? 14) / 100;
  const sidebarAlpha = (config.sidebarOpacity ?? 0) / 100;
  const chatAlpha = (config.chatBoxOpacity ?? 0) / 100;
  const editorAlpha = (config.editorOpacity ?? 22) / 100;
  const fit = config.videoObjectFit === 'contain' ? 'contain' : 'cover';

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    v.playbackRate = Math.max(0.25, Math.min(2.5, Number(config.videoSpeed) || 1));
    const vol = Math.max(0, Math.min(1, (Number(config.videoVolume) || 0) / 100));
    v.muted = vol === 0;
    v.volume = vol;
  }, [config.videoSpeed, config.videoVolume, activeTheme?.mediaUrl, collapsed]);

  const triggerMascotReaction = (isDouble = false, customMsg = '') => {
    let action;
    if (isDouble) {
      action = { cls: 'spin', dur: 1050, icons: ['💋', '💖', '🦋', '✨', '💎'], quote: 'Đặc quyền riêng cho Đại Đế nè~ Siêu năng lượng +100% 💋💖' };
    } else {
      if (!charmDeckRef.current.length) {
        const idxs = CHARM_ACTIONS.map((_, i) => i);
        for (let i = idxs.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [idxs[i], idxs[j]] = [idxs[j], idxs[i]];
        }
        charmDeckRef.current = idxs;
      }
      action = CHARM_ACTIONS[charmDeckRef.current.pop()];
    }

    setMascotSpeech(customMsg || action.quote);
    setMascotAnim('');
    requestAnimationFrame(() => setMascotAnim(action.cls));

    const batch = Array.from({ length: isDouble ? 8 : 5 }).map((_, i) => ({
      id: Date.now() + i,
      icon: action.icons[i % action.icons.length],
      dx: Math.round((Math.random() - 0.5) * 86),
      dy: -Math.round(30 + Math.random() * 44),
    }));
    setSparkles(batch);

    clearTimeout(animTimerRef.current);
    animTimerRef.current = setTimeout(() => {
      setMascotAnim('');
      setSparkles([]);
    }, action.dur + 40);

    clearTimeout(speechTimerRef.current);
    speechTimerRef.current = setTimeout(() => setMascotSpeech(''), 2800);
  };

  useEffect(() => {
    if (mascotPulseKey > 0 && mascot) {
      triggerMascotReaction(false, `Xin chào! Mình là ${mascot.name}`);
    }
  }, [mascotPulseKey]);

  const showMascot =
    config.mascotEnabled &&
    mascot?.mediaUrl &&
    (config.mascotTarget === 'both' || config.mascotTarget === previewMode);

  const mascotScaled = Math.round(Math.max(38, Math.min(92, (config.mascotSize || 124) * 0.62)));
  const mascotPosStyle =
    config.mascotPosition === 'bottom-left'
      ? { bottom: 14, left: 162 }
      : config.mascotPosition === 'top-right'
      ? { top: 34, right: 14 }
      : config.mascotPosition === 'composer'
      ? { bottom: 52, right: 20 }
      : { bottom: 48, right: 18 };

  const bMode = config.borderStyle || 'none';
  const borderStyle =
    bMode === 'none'
      ? '1px solid transparent'
      : bMode === 'neon'
      ? `1px solid rgba(${neonRgb}, ${(0.28 * glowFactor + 0.1).toFixed(2)})`
      : isLight
      ? '1px solid rgba(15, 23, 42, 0.1)'
      : '1px solid rgba(255, 255, 255, 0.08)';

  const textInk = isLight
    ? '#0f172a'
    : config.textPalette === 'warm_cream'
    ? '#f2ece1'
    : config.textPalette === 'ice_blue'
    ? '#e6f3ff'
    : config.textPalette === 'custom'
    ? config.customTextColor || '#edf2f7'
    : '#edf2f7';
  const mutedInk = isLight ? '#475569' : '#c6d3e8';
  const textShadow = isLight ? 'none' : '0 1px 2px rgba(0,0,0,0.94), 0 0 8px rgba(0,0,0,0.72)';

  return (
    <section className="demo-card">
      <div className="demo-header">
        <div className="demo-title">
          <span>Live Preview</span>
          <span className="demo-fps-badge">60 FPS</span>
          <span className="demo-theme-tag">{activeTheme?.name || 'Chưa chọn'}</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div className="demo-mode-tabs">
            <button
              type="button"
              className={`mode-tab ${previewMode === 'chat' ? 'active-chat' : ''}`}
              onClick={() => {
                setCollapsed(false);
                onChangePreviewMode('chat');
              }}
            >
              <MessageSquare size={11} />
              <span>Antigravity Chat App</span>
            </button>
            <button
              type="button"
              className={`mode-tab ${previewMode === 'ide' ? 'active-ide' : ''}`}
              onClick={() => {
                setCollapsed(false);
                onChangePreviewMode('ide');
              }}
            >
              <Code2 size={11} />
              <span>Antigravity IDE</span>
            </button>
            <button
              type="button"
              className={`mode-tab ${previewMode === 'settings' ? 'active-settings' : ''}`}
              onClick={() => {
                setCollapsed(false);
                onChangePreviewMode('settings');
              }}
            >
              <SlidersHorizontal size={11} />
              <span>Settings</span>
            </button>
          </div>

          <button
            type="button"
            className="btn btn-ghost btn-sm"
            style={{ width: 28, padding: 0 }}
            onClick={() => setCollapsed((c) => !c)}
            title={collapsed ? 'Mở rộng khung xem trước' : 'Thu gọn khung xem trước'}
          >
            {collapsed ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
          </button>
        </div>
      </div>

      {!collapsed && (
        <div className="demo-viewport">
          <div className="demo-bg-media">
            {config.enabled ? (
              activeTheme?.mediaUrl ? (
                isVideo ? (
                  <video
                    ref={videoRef}
                    key={activeTheme.mediaUrl}
                    src={activeTheme.mediaUrl}
                    autoPlay
                    loop
                    muted={(config.videoVolume || 0) === 0}
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
                    src={activeTheme.mediaUrl}
                    alt={activeTheme.name}
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
                      activeTheme?.pureBg ||
                      `radial-gradient(circle at 75% 25%, rgba(${neonRgb}, 0.24), transparent 55%), linear-gradient(160deg, #090d1e, #050712)`,
                  }}
                />
              )
            ) : (
              <div style={{ width: '100%', height: '100%', background: '#16161a' }} />
            )}
          </div>

          {config.enabled && (
            <div
              className="demo-scrim"
              style={{
                background: `radial-gradient(ellipse at 50% 45%, rgba(${overlayRgb}, ${(dimAlpha * 0.72).toFixed(3)}) 0%, rgba(${overlayRgb}, ${Math.min(0.92, dimAlpha * 1.15).toFixed(3)}) 100%)`,
              }}
            />
          )}

          {hoverTheme && (
            <div className="preview-hover-badge">
              Đang xem thử: <strong>{hoverTheme.name}</strong>
            </div>
          )}
          {!hoverTheme && demoToast && <div className="demo-toast">{demoToast}</div>}

          <div className="demo-ui-layer" style={{ color: textInk, textShadow }}>
            <div
              className="demo-window-bar"
              style={{
                background: config.enabled ? `rgba(${overlayRgb}, ${Math.min(0.85, sidebarAlpha + 0.06).toFixed(2)})` : '#1c1c21',
                borderBottom: config.enabled ? borderStyle : '1px solid rgba(255,255,255,0.08)',
              }}
            >
              <div className="traffic-dots">
                <span style={{ background: '#ef4444' }} />
                <span style={{ background: '#fbbf24' }} />
                <span style={{ background: '#22c55e' }} />
              </div>
              <span style={{ fontWeight: 650, fontSize: 10.5 }}>
                {previewMode === 'chat'
                  ? 'Antigravity — Chat & Agent'
                  : previewMode === 'settings'
                  ? 'Antigravity Settings (Trong suốt 100%)'
                  : 'Antigravity IDE — App.tsx'}
              </span>
              <span style={{ fontSize: 9.5, fontFamily: 'var(--font-mono)', opacity: 0.78 }}>
                {config.enabled ? (isVideo ? 'LIVE FULL HD' : 'GLASS') : 'STOCK'}
              </span>
            </div>

            {previewMode === 'chat' ? (
              <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>
                <div
                  style={{
                    width: 148,
                    padding: '9px 8px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 5,
                    background: config.enabled ? `rgba(${overlayRgb}, ${sidebarAlpha.toFixed(2)})` : '#18181b',
                    borderRight: config.enabled ? borderStyle : '1px solid rgba(255,255,255,0.08)',
                  }}
                >
                  <div style={{ fontSize: 9.5, color: mutedInk, fontWeight: 650, padding: '2px 4px' }}>
                    EXPLORER
                  </div>
                  {['antigravity-studio', 'main.cjs', 'injector-payload.cjs'].map((t, i) => (
                    <div
                      key={t}
                      style={{
                        padding: '4px 7px',
                        borderRadius: 6,
                        fontSize: 10.5,
                        background: i === 0 && config.enabled ? `rgba(${neonRgb}, 0.18)` : 'transparent',
                        color: i === 0 ? '#ffffff' : mutedInk,
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {t}
                    </div>
                  ))}
                </div>

                <div
                  style={{
                    flex: 1,
                    padding: '10px 16px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    minWidth: 0,
                  }}
                >
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'flex-end', gap: 7 }}>
                      <div
                        style={{
                          padding: '6px 11px',
                          borderRadius: Math.min(14, config.cornerRadius || 14),
                          background: config.enabled ? `rgba(${overlayRgb}, ${Math.max(0.32, chatAlpha + 0.22).toFixed(2)})` : '#27272a',
                          border: config.enabled ? '1px solid rgba(255,255,255,0.12)' : 'none',
                          fontSize: 11,
                          color: '#ffffff',
                        }}
                      >
                        Làm trong suốt toàn bộ màn hình Settings & giao diện luôn nhé
                      </div>
                      {userAvatarUrl && config.enabled && (
                        <img
                          src={userAvatarUrl}
                          alt=""
                          style={{
                            width: 22,
                            height: 22,
                            borderRadius: `${config.avatarRadius ?? 50}%`,
                            objectFit: 'cover',
                            border: '1px solid rgba(255,255,255,0.35)',
                          }}
                        />
                      )}
                    </div>

                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: 8,
                        padding: chatAlpha <= 0.01 ? '4px 2px' : '8px 11px',
                        borderRadius: Math.min(14, config.cornerRadius || 14),
                        background: config.enabled
                          ? chatAlpha <= 0.01
                            ? 'transparent'
                            : `rgba(${overlayRgb}, ${chatAlpha.toFixed(2)})`
                          : '#1c1c21',
                        maxWidth: '86%',
                      }}
                    >
                      {agentAvatarUrl && config.enabled && (
                        <img
                          src={agentAvatarUrl}
                          alt=""
                          style={{
                            width: 22,
                            height: 22,
                            borderRadius: `${config.avatarRadius ?? 50}%`,
                            objectFit: 'cover',
                            flexShrink: 0,
                          }}
                        />
                      )}
                      <div style={{ fontSize: 11, lineHeight: 1.5 }}>
                        Đã phủ kính pha lê liền mạch toàn bộ IDE, Antigravity Settings, Extensions, Terminal và Webview — video chạy mượt không vết nối.
                      </div>
                    </div>
                  </div>

                  <div
                    style={{
                      padding: '7px 12px',
                      borderRadius: Math.min(14, config.cornerRadius || 14),
                      background: config.enabled ? `rgba(${overlayRgb}, ${Math.max(0.38, chatAlpha + 0.24).toFixed(2)})` : '#18181b',
                      border: config.enabled ? '1px solid rgba(255,255,255,0.14)' : '1px solid rgba(255,255,255,0.08)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      fontSize: 11,
                      color: mutedInk,
                    }}
                  >
                    <span>Ask anything, @ to mention, / for actions</span>
                    <span style={{ color: '#ffffff', fontWeight: 650 }}>→</span>
                  </div>
                </div>
              </div>
            ) : previewMode === 'settings' ? (
              /* Live Transparent Antigravity Settings Preview! */
              <div
                style={{
                  flex: 1,
                  display: 'flex',
                  minHeight: 0,
                  background: config.enabled ? `rgba(${overlayRgb}, ${editorAlpha.toFixed(2)})` : '#1e1e1e',
                }}
              >
                <div
                  style={{
                    width: 132,
                    padding: '10px 8px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 4,
                    background: config.enabled ? 'transparent' : '#181818',
                    borderRight: '1px solid rgba(255,255,255,0.07)',
                  }}
                >
                  <div style={{ fontSize: 9.5, color: mutedInk, padding: '2px 6px' }}>Settings</div>
                  {['General', 'Appearance', 'Notifications', 'Models', 'Browser'].map((s, idx) => (
                    <div
                      key={s}
                      style={{
                        padding: '4px 8px',
                        borderRadius: 6,
                        fontSize: 10.5,
                        fontWeight: idx === 0 ? 650 : 500,
                        background: idx === 0 ? `rgba(${neonRgb}, 0.22)` : 'transparent',
                        color: idx === 0 ? '#fff' : mutedInk,
                      }}
                    >
                      {s}
                    </div>
                  ))}
                </div>

                <div style={{ flex: 1, padding: '12px 18px', display: 'flex', flexDirection: 'column', gap: 9 }}>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>Account</div>
                    <div style={{ fontSize: 10, color: mutedInk }}>Manage your plan, credentials, and general preferences.</div>
                  </div>
                  <div
                    style={{
                      padding: '8px 11px',
                      borderRadius: 9,
                      background: config.enabled ? `rgba(${overlayRgb}, ${Math.max(0.18, editorAlpha).toFixed(2)})` : '#252526',
                      border: '1px solid rgba(255,255,255,0.10)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                  >
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 650, color: '#fff' }}>Enable telemetry</div>
                      <div style={{ fontSize: 9.5, color: mutedInk }}>Toàn bộ thẻ cài đặt đều trong suốt nhìn xuyên qua video</div>
                    </div>
                    <div style={{ width: 28, height: 15, borderRadius: 99, background: '#0ea5e9', position: 'relative' }}>
                      <div style={{ width: 11, height: 11, borderRadius: '50%', background: '#fff', position: 'absolute', right: 2, top: 2 }} />
                    </div>
                  </div>
                  <div
                    style={{
                      padding: '8px 11px',
                      borderRadius: 9,
                      background: config.enabled ? `rgba(${overlayRgb}, ${Math.max(0.18, editorAlpha).toFixed(2)})` : '#252526',
                      border: '1px solid rgba(255,255,255,0.10)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                  >
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 650, color: '#fff' }}>Your plan: Google AI Pro</div>
                      <div style={{ fontSize: 9.5, color: mutedInk }}>Không còn mảng xám đục che hình nền nữa</div>
                    </div>
                    <span style={{ fontSize: 10, fontWeight: 650, padding: '3px 9px', borderRadius: 6, background: '#0284c7', color: '#fff', textShadow: 'none' }}>
                      Upgrade
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
                <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>
                  <div
                    style={{
                      width: 28,
                      background: config.enabled ? `rgba(${overlayRgb}, ${sidebarAlpha.toFixed(2)})` : '#18181b',
                      borderRight: config.enabled ? borderStyle : '1px solid rgba(255,255,255,0.08)',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      paddingTop: 8,
                      gap: 7,
                    }}
                  >
                    {['#38bdf8', '#c084fc', '#34d399', '#f472b6'].map((c, idx) => (
                      <div key={idx} style={{ width: 11, height: 11, borderRadius: 3, background: c, opacity: idx === 0 ? 1 : 0.72 }} />
                    ))}
                  </div>

                  <div
                    style={{
                      flex: 1,
                      padding: '10px 14px',
                      fontFamily: 'var(--font-mono)',
                      fontSize: 11,
                      lineHeight: 1.65,
                      background: config.enabled ? `rgba(${overlayRgb}, ${editorAlpha.toFixed(2)})` : '#1e1e24',
                      overflow: 'hidden',
                    }}
                  >
                    <div><span style={{ color: '#c084fc' }}>export async function</span> <span style={{ color: '#38bdf8' }}>syncAllViews</span>(theme: StudioTheme) {'{'}</div>
                    <div style={{ paddingLeft: 16 }}><span style={{ color: '#94a3b8' }}>// Đồng bộ IDE + Settings + Extensions + Terminal + Webviews</span></div>
                    <div style={{ paddingLeft: 16 }}><span style={{ color: '#c084fc' }}>await</span> cdp.<span style={{ color: '#fbbf24' }}>injectCrystalGlass</span>({'{'} theme: <span style={{ color: '#f472b6' }}>'{activeTheme?.name || 'Custom'}'</span> {'}'});</div>
                    <div style={{ paddingLeft: 16 }}><span style={{ color: '#c084fc' }}>return</span> {'{'} seamless: <span style={{ color: '#34d399' }}>true</span>, crossfade: <span style={{ color: '#fbbf24' }}>'dual-deck'</span> {'}'};</div>
                    <div>{'}'}</div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {config.enabled && showMascot && (
            <div
              className={`demo-mascot-wrap ${mascotAnim ? `anim-${mascotAnim}` : ''}`}
              style={{
                position: 'absolute',
                ...mascotPosStyle,
                width: mascotScaled,
                height: mascotScaled,
                opacity: (config.mascotOpacity ?? 96) / 100,
                zIndex: 22,
                cursor: 'pointer',
                filter: `drop-shadow(0 6px 16px rgba(${neonRgb}, 0.55))`,
              }}
              title="Bấm vào linh vật để thử tương tác"
              onClick={() => triggerMascotReaction(false)}
              onDoubleClick={() => triggerMascotReaction(true)}
            >
              {mascotSpeech && <div className="demo-mascot-bubble">{mascotSpeech}</div>}
              {sparkles.map((s) => (
                <span key={s.id} className="demo-sparkle" style={{ '--dx': `${s.dx}px`, '--dy': `${s.dy}px` }}>
                  {s.icon}
                </span>
              ))}
              {/\.(mp4|webm)$/i.test(mascot.filePath || '') ? (
                <video src={mascot.mediaUrl} autoPlay loop muted playsInline style={{ width: '100%', height: '100%', objectFit: 'contain', borderRadius: 10 }} />
              ) : (
                <img src={mascot.mediaUrl} alt={mascot.name} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
              )}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
