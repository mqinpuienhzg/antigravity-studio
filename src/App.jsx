import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Palette, RotateCcw, UploadCloud, X } from 'lucide-react';
import TopBar from './components/TopBar.jsx';
import Sidebar from './components/Sidebar.jsx';
import LiveDemoPreview from './components/LiveDemoPreview.jsx';
import SideSplitPreview from './components/SideSplitPreview.jsx';
import ThemeGallery from './components/ThemeGallery.jsx';
import WebBrowserTab from './components/WebBrowserTab.jsx';
import OnlineYoutubeTab from './components/OnlineYoutubeTab.jsx';
import CombosHistoryTab from './components/CombosHistoryTab.jsx';
import AutoRotateTab from './components/AutoRotateTab.jsx';
import TrashTab from './components/TrashTab.jsx';
import RightControls from './components/RightControls.jsx';
import UiBlocksTab from './components/UiBlocksTab.jsx';
import MascotsTab from './components/MascotsTab.jsx';
import SettingsTab from './components/SettingsTab.jsx';
import { hexToRgbStr } from './data/presets';

export default function App() {
  const [studio, setStudio] = useState(null);
  const [cdpStatus, setCdpStatus] = useState({ connected: false, chatCount: 0, ideCount: 0, webviewCount: 0 });
  const [desktopStatus, setDesktopStatus] = useState({ supported: true, active: false, paused: false, autoPaused: false, manualPaused: false });
  const [activeTab, setActiveTab] = useState('themes');
  const [previewMode, setPreviewMode] = useState('chat');
  const [rightPreviewOpen, setRightPreviewOpen] = useState(true);
  const [hoverTheme, setHoverTheme] = useState(null);
  const [busyAction, setBusyAction] = useState('');
  const [demoToast, setDemoToast] = useState('');
  const [globalToast, setGlobalToast] = useState('');
  const [draggingFiles, setDraggingFiles] = useState(false);
  const [mascotPulseKey, setMascotPulseKey] = useState(0);
  const [webDownloadProgress, setWebDownloadProgress] = useState(null);
  const [recentWebDownloads, setRecentWebDownloads] = useState([]);
  const [accentPrompt, setAccentPrompt] = useState(null);

  const patchTimerRef = useRef(null);
  const demoToastTimerRef = useRef(null);
  const globalToastTimerRef = useRef(null);
  const accentPromptTimerRef = useRef(null);

  const showDemoToast = useCallback((msg) => {
    setDemoToast(msg);
    clearTimeout(demoToastTimerRef.current);
    demoToastTimerRef.current = setTimeout(() => setDemoToast(''), 2400);
  }, []);

  const showGlobalToast = useCallback((msg) => {
    setGlobalToast(msg);
    clearTimeout(globalToastTimerRef.current);
    globalToastTimerRef.current = setTimeout(() => setGlobalToast(''), 3200);
  }, []);

  const triggerAccentPrompt = useCallback((theme, prevNeon, prevSecondary) => {
    if (!theme?.accent) return;
    const nextColor = theme.accent.toLowerCase();
    const curColor = String(prevNeon || '').toLowerCase();
    if (!nextColor || nextColor === curColor) return;
    clearTimeout(accentPromptTimerRef.current);
    setAccentPrompt({
      themeName: theme.name,
      nextColor: theme.accent,
      nextSecondary: theme.secondary || '#38bdf8',
      prevColor: prevNeon || '#a855f7',
      prevSecondary: prevSecondary || '#38bdf8',
      applied: false,
    });
    accentPromptTimerRef.current = setTimeout(() => setAccentPrompt(null), 10000);
  }, []);

  useEffect(() => {
    if (!window.studioAPI) return;
    window.studioAPI.getState().then((res) => {
      setStudio(res);
      if (res.cdpStatus) setCdpStatus(res.cdpStatus);
      if (res.desktopStatus) setDesktopStatus(res.desktopStatus);
    });
    const offCdp = window.studioAPI.onCdpStatus((status) => setCdpStatus(status));
    const offDesktop = window.studioAPI.onDesktopStatus?.((status) => setDesktopStatus(status));
    const offState = window.studioAPI.onStateUpdated((next) => setStudio((prev) => ({ ...prev, ...next })));
    const offWebProg = window.studioAPI.onWebDownloadProgress?.((prog) => {
      setWebDownloadProgress(prog);
      if (prog?.state === 'failed') {
        showGlobalToast(`Tải thất bại: ${prog.filename}`);
        setTimeout(() => setWebDownloadProgress(null), 2600);
      }
    });
    const offWebDone = window.studioAPI.onWebDownloadDone?.((done) => {
      setWebDownloadProgress(null);
      setRecentWebDownloads((prev) => [done, ...prev].slice(0, 8));
      showGlobalToast(
        done?.kind === 'mascot'
          ? `Đã tự nạp Linh thú mới: "${done.item?.name || done.filename}"`
          : `Đã tự nạp Chủ đề mới: "${done.item?.name || done.filename}"`
      );
    });
    return () => {
      offCdp?.();
      offDesktop?.();
      offState?.();
      offWebProg?.();
      offWebDone?.();
    };
  }, [showGlobalToast]);

  const handlePatchConfig = useCallback((patch, immediate = false) => {
    setStudio((prev) => {
      if (!prev) return prev;
      return { ...prev, config: { ...prev.config, ...patch } };
    });

    if (immediate) {
      clearTimeout(patchTimerRef.current);
      window.studioAPI?.updateConfig(patch).then((next) => {
        if (next) setStudio((prev) => ({ ...prev, ...next }));
      });
      return;
    }

    clearTimeout(patchTimerRef.current);
    patchTimerRef.current = setTimeout(() => {
      window.studioAPI?.updateConfig(patch).then((next) => {
        if (next) setStudio((prev) => ({ ...prev, ...next }));
      });
    }, 90);
  }, []);

  const handleSetUnified = useCallback(
    (theme) => {
      const prevNeon = studio?.config?.neonColor;
      const prevSec = studio?.config?.neonSecondary;
      handlePatchConfig(
        {
          unifiedFullWindow: true,
          chatThemeId: theme.id,
          ideThemeId: theme.id,
          enabled: true,
        },
        true
      );
      showDemoToast(`Đã chuyển sang "${theme.name}" (Đồng bộ toàn màn hình)`);
      triggerAccentPrompt(theme, prevNeon, prevSec);
    },
    [studio, handlePatchConfig, showDemoToast, triggerAccentPrompt]
  );

  const handleSetChat = useCallback(
    (theme) => {
      const prevNeon = studio?.config?.neonColor;
      const prevSec = studio?.config?.neonSecondary;
      setPreviewMode('chat');
      handlePatchConfig({ chatThemeId: theme.id, enabled: true }, true);
      showDemoToast(`Đã chuyển "${theme.name}" (Màn hình Chat)`);
      triggerAccentPrompt(theme, prevNeon, prevSec);
    },
    [studio, handlePatchConfig, showDemoToast, triggerAccentPrompt]
  );

  const handleSetIde = useCallback(
    (theme) => {
      const prevNeon = studio?.config?.neonColor;
      const prevSec = studio?.config?.neonSecondary;
      setPreviewMode('ide');
      handlePatchConfig({ ideThemeId: theme.id, enabled: true }, true);
      showDemoToast(`Đã chuyển "${theme.name}" (Màn hình IDE)`);
      triggerAccentPrompt(theme, prevNeon, prevSec);
    },
    [studio, handlePatchConfig, showDemoToast, triggerAccentPrompt]
  );

  const handleSetDesktop = useCallback(
    async (theme) => {
      const curCfg = studio?.config || {};
      const curDesktopId = curCfg.desktopSyncWithIde
        ? (curCfg.chatThemeId || curCfg.ideThemeId || curCfg.desktopThemeId)
        : curCfg.desktopThemeId;
      if (curCfg.desktopWallpaperEnabled && curDesktopId === theme.id) {
        const res = await window.studioAPI?.toggleDesktopWallpaper?.(false);
        if (res?.state) setStudio((prev) => ({ ...prev, ...res.state }));
        if (res?.status) setDesktopStatus(res.status);
        showGlobalToast('Đã tắt hình nền động Windows Desktop');
        return;
      }
      const res = await window.studioAPI?.setDesktopWallpaper?.(theme.id);
      if (res?.state) setStudio((prev) => ({ ...prev, ...res.state }));
      if (res?.status) setDesktopStatus(res.status);
      if (res?.ok) {
        showGlobalToast(`Đã đặt "${theme.name}" làm hình nền động Windows Desktop`);
      } else {
        showGlobalToast(`Lỗi đặt hình nền Desktop: ${res?.error || 'Không thể gắn WorkerW'}`);
      }
    },
    [studio, showGlobalToast]
  );

  const handleToggleDesktop = useCallback(
    async (nextEnable) => {
      const res = await window.studioAPI?.toggleDesktopWallpaper?.(nextEnable);
      if (res?.state) setStudio((prev) => ({ ...prev, ...res.state }));
      if (res?.status) setDesktopStatus(res.status);
      if (res?.ok) {
        showGlobalToast(
          res.status?.active
            ? `Đã bật hình nền động Windows Desktop (${res.status.themeName || 'Live'})`
            : 'Đã tắt hình nền động Desktop và khôi phục nền gốc Windows'
        );
      } else if (res?.error) {
        showGlobalToast(`Lỗi hình nền Desktop: ${res.error}`);
      }
    },
    [showGlobalToast]
  );

  const handleToggleDesktopPause = useCallback(async () => {
    const res = await window.studioAPI?.toggleDesktopPause?.();
    if (res?.status) {
      setDesktopStatus(res.status);
      showGlobalToast(res.status.manualPaused ? 'Đã tạm dừng video nền Desktop' : 'Đã tiếp tục chạy video nền Desktop');
    }
  }, [showGlobalToast]);

  const handleSelectMascot = useCallback(
    (m) => {
      handlePatchConfig({ mascotId: m.id, mascotEnabled: true, mascotInteractive: true }, true);
      setMascotPulseKey((k) => k + 1);
      showDemoToast(`Đã chọn linh thú "${m.name}"`);
    },
    [handlePatchConfig, showDemoToast]
  );

  const handleTogglePlaylist = useCallback(
    (themeId) => {
      if (!studio) return;
      const cur = studio.config.playlistIds || [];
      const exists = cur.includes(themeId);
      const next = exists ? cur.filter((id) => id !== themeId) : [...cur, themeId];
      handlePatchConfig({ playlistIds: next }, true);
      showGlobalToast(exists ? 'Đã bỏ chủ đề khỏi Playlist' : 'Đã ghim chủ đề vào Playlist');
    },
    [studio, handlePatchConfig, showGlobalToast]
  );

  const handleToggleUnified = useCallback(
    (nextUnified) => {
      if (!studio) return;
      handlePatchConfig(
        nextUnified
          ? { unifiedFullWindow: true, ideThemeId: studio.config.chatThemeId }
          : { unifiedFullWindow: false },
        true
      );
      showGlobalToast(
        nextUnified
          ? 'Đã bật chế độ Đồng bộ 1 nền xuyên suốt'
          : 'Đã bật chế độ Chat & IDE riêng biệt'
      );
    },
    [studio, handlePatchConfig, showGlobalToast]
  );

  const handleSaveCombo = useCallback(
    async (name) => {
      const res = await window.studioAPI?.saveCombo?.(name);
      if (res?.state) setStudio((prev) => ({ ...prev, ...res.state }));
      if (res?.ok) showGlobalToast(`Đã lưu combo "${res.combo?.name}"`);
    },
    [showGlobalToast]
  );

  const handleApplyCombo = useCallback(
    async (comboId) => {
      const res = await window.studioAPI?.applyCombo?.(comboId);
      if (res?.state) setStudio((prev) => ({ ...prev, ...res.state }));
      if (res?.ok) showGlobalToast(`Đã áp dụng combo "${res.combo?.name}"`);
    },
    [showGlobalToast]
  );

  const handleDeleteCombo = useCallback(
    async (comboId) => {
      const res = await window.studioAPI?.deleteCombo?.(comboId);
      if (res?.state) setStudio((prev) => ({ ...prev, ...res.state }));
      showGlobalToast('Đã xóa combo.');
    },
    [showGlobalToast]
  );

  const handleRandomize = useCallback(
    async (opts = { onlyVideo: true, syncAccent: true, randomMascot: false }) => {
      const res = await window.studioAPI?.randomizeTheme?.(opts);
      if (res?.state) setStudio((prev) => ({ ...prev, ...res.state }));
      if (res?.ok && res.theme) {
        showDemoToast(`Ngẫu nhiên: "${res.theme.name}"`);
        showGlobalToast(`Đã trộn sang "${res.theme.name}"`);
      }
    },
    [showDemoToast, showGlobalToast]
  );

  const handleApplyDownloaded = useCallback(
    (dl) => {
      if (dl?.state) setStudio((prev) => ({ ...prev, ...dl.state }));
      if (!dl?.item) return;
      if (dl.kind === 'mascot') handleSelectMascot(dl.item);
      else handleSetUnified(dl.item);
    },
    [handleSelectMascot, handleSetUnified]
  );

  const handleApplyNow = async () => {
    setBusyAction('apply');
    try {
      const res = await window.studioAPI.applyNow();
      if (res?.state) setStudio((prev) => ({ ...prev, ...res.state }));
      showGlobalToast(
        res?.count > 0
          ? `Đã áp dụng tức thì cho ${res.count} cửa sổ Antigravity`
          : 'Đã lưu cấu hình — mở Antigravity IDE để tự động tiêm theme.'
      );
    } finally {
      setBusyAction('');
    }
  };

  const handleDisableTheme = async () => {
    const res = await window.studioAPI.disableTheme();
    if (res?.state) setStudio((prev) => ({ ...prev, ...res.state }));
    showGlobalToast('Đã tắt tùy biến và khôi phục giao diện gốc.');
  };

  const handleRestartAntigravity = async () => {
    setBusyAction('restart');
    try {
      const res = await window.studioAPI.restartAntigravity();
      showGlobalToast(res?.message || 'Đã gửi lệnh khởi động lại Antigravity.');
    } finally {
      setBusyAction('');
    }
  };

  const handleCapture = async () => {
    const res = await window.studioAPI.capturePreview();
    if (res?.ok) showGlobalToast(`Đã lưu ảnh chụp tại ${res.filePath}`);
  };

  const handleImportFiles = async () => {
    const res = await window.studioAPI.importFiles();
    if (res?.state) setStudio((prev) => ({ ...prev, ...res.state }));
    if (res?.added > 0) showGlobalToast(`Đã thêm ${res.added} chủ đề mới vào kho`);
  };

  const handleScanFolder = async () => {
    const res = await window.studioAPI.scanFolder();
    if (res?.state) setStudio((prev) => ({ ...prev, ...res.state }));
    showGlobalToast(
      res?.added > 0
        ? `Đã quét và nhập ${res.added} video/ảnh từ thư mục`
        : 'Không tìm thấy ảnh/video mới nào trong thư mục.'
    );
  };

  const handleOpenExtraFolder = async () => {
    await window.studioAPI?.openExtraThemesFolder?.();
    showGlobalToast('Đã mở thư mục chủ đề mở rộng — thả video/ảnh vào rồi bấm Làm mới');
  };

  const handleRescanExtraFolder = async () => {
    const res = await window.studioAPI?.rescanExtraThemes?.();
    if (res?.state) setStudio((prev) => ({ ...prev, ...res.state }));
    showGlobalToast(`Đã làm mới thư mục mở rộng (${res?.count || 0} tệp)`);
  };

  const handleDeleteTheme = async (themeId) => {
    const res = await window.studioAPI.deleteTheme(themeId);
    if (res?.state) setStudio((prev) => ({ ...prev, ...res.state }));
    showGlobalToast('Đã chuyển chủ đề vào Thùng rác.');
  };

  const handleRestoreTrash = async (themeId) => {
    const res = await window.studioAPI?.restoreTrashTheme?.(themeId);
    if (res?.state) setStudio((prev) => ({ ...prev, ...res.state }));
    showGlobalToast('Đã khôi phục chủ đề về Thư viện.');
  };

  const handleDeleteTrashForever = async (themeId) => {
    const res = await window.studioAPI?.deleteTrashForever?.(themeId);
    if (res?.state) setStudio((prev) => ({ ...prev, ...res.state }));
    showGlobalToast('Đã xóa vĩnh viễn khỏi Thùng rác.');
  };

  const handleEmptyTrash = async () => {
    const res = await window.studioAPI?.emptyTrash?.();
    if (res?.state) setStudio((prev) => ({ ...prev, ...res.state }));
    showGlobalToast('Đã dọn sạch Thùng rác.');
  };

  const handleImportMascot = async () => {
    const res = await window.studioAPI.importMascot();
    if (res?.state) setStudio((prev) => ({ ...prev, ...res.state }));
    if (res?.ok) {
      setMascotPulseKey((k) => k + 1);
      showGlobalToast(`Đã thêm linh thú "${res.item.name}"`);
    }
  };

  const handleDeleteMascot = async (id) => {
    const res = await window.studioAPI.deleteMascot(id);
    if (res?.state) setStudio((prev) => ({ ...prev, ...res.state }));
  };

  const handleImportAvatar = async (role) => {
    const res = await window.studioAPI.importAvatar(role);
    if (res?.state) setStudio((prev) => ({ ...prev, ...res.state }));
    if (res?.ok) showGlobalToast(`Đã cập nhật Avatar ${role === 'agent' ? 'AI Agent' : 'Người dùng'}`);
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    setDraggingFiles(false);
    const files = Array.from(e.dataTransfer?.files || []);
    const paths = files.map((f) => window.studioAPI?.getPathForFile(f)).filter(Boolean);
    if (!paths.length) return;
    const res = await window.studioAPI.importPaths(paths);
    if (res?.state) setStudio((prev) => ({ ...prev, ...res.state }));
    if (res?.added > 0) showGlobalToast(`Đã kéo-thả thêm ${res.added} chủ đề mới`);
  };

  const config = studio?.config || {};
  const themes = studio?.themes || [];
  const trashThemes = studio?.trashThemes || [];
  const mascots = studio?.mascots || [];
  const avatars = studio?.avatars || [];
  const savedCombos = studio?.savedCombos || [];
  const themeHistory = studio?.themeHistory || [];

  const chatTheme = useMemo(
    () => themes.find((t) => t.id === config.chatThemeId) || themes[0] || null,
    [themes, config.chatThemeId]
  );
  const ideTheme = useMemo(
    () => themes.find((t) => t.id === config.ideThemeId) || themes[0] || null,
    [themes, config.ideThemeId]
  );
  const desktopThemeId = config.desktopSyncWithIde
    ? (config.chatThemeId || config.ideThemeId || config.desktopThemeId)
    : (config.desktopThemeId || config.chatThemeId || config.ideThemeId);
  const desktopTheme = useMemo(
    () => themes.find((t) => t.id === desktopThemeId) || themes[0] || null,
    [themes, desktopThemeId]
  );
  const activeAmbientTheme =
    hoverTheme ||
    (config.unifiedFullWindow !== false ? chatTheme || ideTheme : previewMode === 'ide' ? ideTheme : chatTheme);

  const activeMascot = useMemo(
    () => mascots.find((m) => m.id === config.mascotId) || mascots[0] || null,
    [mascots, config.mascotId]
  );
  const userAvatarUrl = useMemo(() => {
    const found = avatars.find((a) => a.id === config.userAvatarId);
    return found ? found.mediaUrl : chatTheme?.userAvatarUrl || '';
  }, [avatars, config.userAvatarId, chatTheme]);
  const agentAvatarUrl = useMemo(() => {
    const found = avatars.find((a) => a.id === config.agentAvatarId);
    return found ? found.mediaUrl : chatTheme?.agentAvatarUrl || '';
  }, [avatars, config.agentAvatarId, chatTheme]);

  const sidebarCounts = useMemo(() => ({
    all: themes.length,
    videos: themes.filter((t) => t.mediaType === 'video').length,
    images: themes.filter((t) => t.mediaType !== 'video' && t.mediaType !== 'gif').length,
    gifs: themes.filter((t) => t.mediaType === 'gif').length,
    mascots: mascots.length,
    combos: savedCombos.length,
    trash: trashThemes.length,
    history: themeHistory.length,
  }), [themes, mascots, savedCombos, trashThemes, themeHistory]);

  const accentHex = config.neonColor || activeAmbientTheme?.accent || '#a855f7';
  const accentSec = config.neonSecondary || activeAmbientTheme?.secondary || '#38bdf8';
  const accentRgb = hexToRgbStr(accentHex);

  if (!studio) {
    return (
      <div className="studio-shell" style={{ alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: '#a1abbe', fontWeight: 550, fontSize: 13 }}>Đang khởi chạy Antigravity Studio Rust...</div>
      </div>
    );
  }

  const isGalleryTab =
    activeTab === 'themes' ||
    activeTab === 'lib-images' ||
    activeTab === 'lib-videos' ||
    activeTab === 'lib-gifs';
  const galleryInitialFilter =
    activeTab === 'lib-images'
      ? 'images'
      : activeTab === 'lib-videos'
      ? 'videos'
      : activeTab === 'lib-gifs'
      ? 'gifs'
      : 'all';

  const isBrowserTab = activeTab === 'browser';
  const showSidePreview = rightPreviewOpen && !isBrowserTab;
  const hideDemo = showSidePreview || isBrowserTab || activeTab === 'settings' || activeTab === 'trash';

  return (
    <div
      className="studio-shell"
      style={{
        '--studio-accent': accentHex,
        '--studio-accent-2': accentSec,
        '--studio-accent-rgb': accentRgb,
      }}
      onDragOver={(e) => {
        e.preventDefault();
        if (!draggingFiles) setDraggingFiles(true);
      }}
      onDragLeave={(e) => {
        if (e.currentTarget === e.target) setDraggingFiles(false);
      }}
      onDrop={handleDrop}
    >
      {/* Ultra-Lightweight Blurred Atmospheric Backdrop (uses 20KB JPEG poster instead of redundant video decoder -> saves ~200MB RAM!) */}
      <div className="studio-ambient-bg">
        {config.enabled && (activeAmbientTheme?.posterUrl || activeAmbientTheme?.mediaUrl) ? (
          activeAmbientTheme.mediaType === 'video' && !activeAmbientTheme.posterUrl ? null : (
            <img src={activeAmbientTheme.posterUrl || activeAmbientTheme.mediaUrl} alt="" />
          )
        ) : null}
      </div>
      <div className="studio-ambient-scrim" />

      <div className="studio-foreground">
        <div className="studio-body">
          <Sidebar
            activeTab={activeTab}
            onSelectTab={setActiveTab}
            cdpStatus={cdpStatus}
            desktopStatus={desktopStatus}
            mediaPort={studio.mediaServerPort}
            appLogoUrl={studio.appLogoUrl}
            config={config}
            onToggleAutoInject={(en) => {
              handlePatchConfig({ autoApplyOnChange: en, enabled: en ? true : config.enabled }, true);
              showGlobalToast(en ? 'Đã bật tự động tiêm theme khi mở app' : 'Đã tắt tự động tiêm tức thì');
            }}
            counts={sidebarCounts}
          />

          <div className="studio-main-column">
            <TopBar
              cdpStatus={cdpStatus}
              desktopStatus={desktopStatus}
              desktopEnabled={Boolean(config.desktopWallpaperEnabled)}
              desktopTheme={desktopTheme}
              enabled={config.enabled}
              unifiedFullWindow={config.unifiedFullWindow !== false}
              rightPreviewOpen={rightPreviewOpen}
              chatTheme={chatTheme}
              ideTheme={ideTheme}
              busyAction={busyAction}
              onToggleUnified={handleToggleUnified}
              onToggleDesktop={() => handleToggleDesktop(!config.desktopWallpaperEnabled)}
              onToggleRightPreview={() => setRightPreviewOpen((v) => !v)}
              onImportFiles={handleImportFiles}
              onCapture={handleCapture}
              onApplyNow={handleApplyNow}
              onRestartAntigravity={handleRestartAntigravity}
              onDisableTheme={handleDisableTheme}
            />

            <div className={`studio-workspace ${showSidePreview ? 'has-side-preview' : ''}`}>
              <main className={`center-pane ${isBrowserTab ? 'center-pane-browser' : ''}`}>
                {!hideDemo && (
                  <LiveDemoPreview
                    config={config}
                    chatTheme={chatTheme}
                    ideTheme={ideTheme}
                    hoverTheme={hoverTheme}
                    mascot={activeMascot}
                    userAvatarUrl={userAvatarUrl}
                    agentAvatarUrl={agentAvatarUrl}
                    previewMode={previewMode}
                    onChangePreviewMode={setPreviewMode}
                    demoToast={demoToast}
                    mascotPulseKey={mascotPulseKey}
                  />
                )}

                {isGalleryTab && (
                  <ThemeGallery
                    themes={themes}
                    config={config}
                    desktopThemeId={desktopThemeId}
                    extraThemesDir={studio.extraThemesDir}
                    comboCount={savedCombos.length}
                    initialFilter={galleryInitialFilter}
                    onSetUnified={handleSetUnified}
                    onSetChat={handleSetChat}
                    onSetIde={handleSetIde}
                    onSetDesktop={handleSetDesktop}
                    onHoverTheme={setHoverTheme}
                    onTogglePlaylist={handleTogglePlaylist}
                    onImportFiles={handleImportFiles}
                    onScanFolder={handleScanFolder}
                    onOpenExtraFolder={handleOpenExtraFolder}
                    onRescanExtraFolder={handleRescanExtraFolder}
                    onQuickSaveCombo={() =>
                      handleSaveCombo(
                        `${(chatTheme || ideTheme)?.name || 'Combo'} · ${new Date().toLocaleTimeString('vi-VN', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}`
                      )
                    }
                    onOpenCombos={() => setActiveTab('combos')}
                    onDeleteTheme={handleDeleteTheme}
                  />
                )}

                {isBrowserTab && (
                  <WebBrowserTab
                    downloadProgress={webDownloadProgress}
                    recentDownloads={recentWebDownloads}
                    onApplyDownloaded={handleApplyDownloaded}
                    onOpenExtraFolder={handleOpenExtraFolder}
                    onOpenDemo={() => setActiveTab('themes')}
                    onShowToast={showGlobalToast}
                  />
                )}

                {activeTab === 'online' && (
                  <OnlineYoutubeTab
                    onlineBins={studio.onlineBins}
                    onDownloaded={(nextState, theme, applyTarget) => {
                      if (nextState) setStudio((prev) => ({ ...prev, ...nextState }));
                      if (applyTarget === 'ide') setPreviewMode('ide');
                      else setPreviewMode('chat');
                      if (theme) showDemoToast(`Đã tải & áp dụng "${theme.name}"`);
                    }}
                    onShowToast={showGlobalToast}
                  />
                )}

                {(activeTab === 'combos' || activeTab === 'history' || activeTab === 'randomizer') && (
                  <CombosHistoryTab
                    savedCombos={savedCombos}
                    themeHistory={themeHistory}
                    activeTheme={chatTheme || ideTheme}
                    onSaveCombo={handleSaveCombo}
                    onApplyCombo={handleApplyCombo}
                    onDeleteCombo={handleDeleteCombo}
                    onRandomize={handleRandomize}
                    onSelectHistoryTheme={(th) =>
                      config.unifiedFullWindow !== false ? handleSetUnified(th) : handleSetChat(th)
                    }
                  />
                )}

                {activeTab === 'auto-rotate' && (
                  <AutoRotateTab
                    config={config}
                    themes={themes}
                    onPatchConfig={handlePatchConfig}
                    onTogglePlaylist={handleTogglePlaylist}
                    onNextPlaylist={async () => {
                      const next = await window.studioAPI.nextPlaylist();
                      if (next) setStudio((prev) => ({ ...prev, ...next }));
                      showGlobalToast('Đã chuyển sang chủ đề tiếp theo');
                    }}
                  />
                )}

                {activeTab === 'trash' && (
                  <TrashTab
                    trashThemes={trashThemes}
                    onRestore={handleRestoreTrash}
                    onDeleteForever={handleDeleteTrashForever}
                    onEmptyTrash={handleEmptyTrash}
                  />
                )}

                {activeTab === 'ui-blocks' && (
                  <UiBlocksTab config={config} onPatchConfig={handlePatchConfig} />
                )}

                {activeTab === 'mascots' && (
                  <MascotsTab
                    config={config}
                    mascots={mascots}
                    avatars={avatars}
                    onPatchConfig={handlePatchConfig}
                    onSelectMascot={handleSelectMascot}
                    onTestMascot={() => setMascotPulseKey((k) => k + 1)}
                    onImportMascot={handleImportMascot}
                    onDeleteMascot={handleDeleteMascot}
                    onImportAvatar={handleImportAvatar}
                  />
                )}

                {activeTab === 'settings' && (
                  <SettingsTab
                    config={config}
                    cdpStatus={cdpStatus}
                    mediaPort={studio.mediaServerPort}
                    extraThemesDir={studio.extraThemesDir}
                    onPatchConfig={handlePatchConfig}
                    onOpenExtraFolder={handleOpenExtraFolder}
                    onPatchShortcuts={async () => {
                      const res = await window.studioAPI.patchShortcuts();
                      showGlobalToast(res?.message || 'Đã khóa cờ CDP vĩnh viễn.');
                    }}
                    onRestartAntigravity={handleRestartAntigravity}
                    onExportBackup={async () => {
                      const res = await window.studioAPI.exportBackup();
                      if (res?.ok) showGlobalToast(`Đã xuất bản sao lưu tại ${res.filePath}`);
                    }}
                    onImportBackup={async () => {
                      const res = await window.studioAPI.importBackup();
                      if (res?.ok && res.state) {
                        setStudio((prev) => ({ ...prev, ...res.state }));
                        showGlobalToast('Đã khôi phục cấu hình từ bản sao lưu');
                      } else if (res?.error) {
                        showGlobalToast('Lỗi khôi phục: ' + res.error);
                      }
                    }}
                    onResetConfig={async () => {
                      const next = await window.studioAPI.resetConfig();
                      if (next) setStudio((prev) => ({ ...prev, ...next }));
                      showGlobalToast('Đã đặt lại toàn bộ cấu hình về mặc định.');
                    }}
                    onToggleStartup={async (en) => {
                      const res = await window.studioAPI.toggleStartup(en);
                      if (res?.ok) {
                        handlePatchConfig({ autoStartWindows: en }, true);
                        showGlobalToast(en ? 'Đã bật tự khởi chạy cùng Windows' : 'Đã tắt tự khởi chạy');
                      }
                    }}
                  />
                )}
              </main>

              {/* Hide Right Inspector automatically on Embedded Web Browser tab (Exact 1:1 Reference Video behavior!) */}
              {!isBrowserTab && (
                <RightControls
                  config={config}
                  chatTheme={chatTheme}
                  ideTheme={ideTheme}
                  desktopTheme={desktopTheme}
                  desktopStatus={desktopStatus}
                  onPatchConfig={handlePatchConfig}
                  onToggleDesktop={handleToggleDesktop}
                  onSetDesktopFromIde={() => {
                    const cur = chatTheme || ideTheme;
                    if (cur) handleSetDesktop(cur);
                  }}
                  onToggleDesktopPause={handleToggleDesktopPause}
                  onNextPlaylist={async () => {
                    const next = await window.studioAPI.nextPlaylist();
                    if (next) setStudio((prev) => ({ ...prev, ...next }));
                    showGlobalToast('Đã chuyển sang chủ đề tiếp theo');
                  }}
                  onQuickRandomize={() => handleRandomize({ onlyVideo: true, syncAccent: true, randomMascot: false })}
                  onResetQuick={() => {
                    handlePatchConfig(
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
                    showGlobalToast('Đã đặt lại độ mờ về chuẩn Clear Liquid Glass');
                  }}
                />
              )}

              {/* Right Side-by-Side Live Preview (Exact Video Split Stack: IDE on Top + Chat & Interactive Mascot on Bottom!) */}
              {showSidePreview && (
                <SideSplitPreview
                  config={config}
                  chatTheme={chatTheme}
                  ideTheme={ideTheme}
                  hoverTheme={hoverTheme}
                  mascot={activeMascot}
                  userAvatarUrl={userAvatarUrl}
                  agentAvatarUrl={agentAvatarUrl}
                  demoToast={demoToast}
                  mascotPulseKey={mascotPulseKey}
                  onClose={() => setRightPreviewOpen(false)}
                />
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Exact Reference-Video Smart Auto-Accent Floating Prompt Card */}
      {accentPrompt && (
        <div className="accent-prompt-floating">
          <div className="accent-prompt-icon" style={{ borderColor: accentPrompt.nextColor, color: accentPrompt.nextColor }}>
            <Palette size={15} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#fff', lineHeight: 1.35 }}>
              Phát hiện tông màu chủ đạo mới ({accentPrompt.nextColor}) từ &ldquo;{accentPrompt.themeName}&rdquo;.
            </div>
            <div style={{ fontSize: 11, color: 'var(--ink-secondary)', marginTop: 2 }}>
              Bạn muốn tự động đồng bộ màu viền & thanh trên cùng theo chủ đề mới hay giữ nguyên?
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
            <button
              type="button"
              className="btn btn-apply-hero btn-sm"
              onClick={() => {
                handlePatchConfig(
                  { neonColor: accentPrompt.nextColor, neonSecondary: accentPrompt.nextSecondary },
                  true
                );
                clearTimeout(accentPromptTimerRef.current);
                setAccentPrompt((p) => (p ? { ...p, applied: true } : null));
                accentPromptTimerRef.current = setTimeout(() => setAccentPrompt(null), 6000);
                showGlobalToast(`Đã đồng bộ màu chủ đạo ${accentPrompt.nextColor}`);
              }}
            >
              Đồng bộ màu mới
            </button>
            <button type="button" className="btn btn-sm" onClick={() => setAccentPrompt(null)}>
              Giữ nguyên cũ
            </button>
            {accentPrompt.applied && (
              <button
                type="button"
                className="btn btn-danger btn-sm"
                onClick={() => {
                  handlePatchConfig(
                    { neonColor: accentPrompt.prevColor, neonSecondary: accentPrompt.prevSecondary },
                    true
                  );
                  setAccentPrompt(null);
                  showGlobalToast('Đã hoàn tác màu chủ đạo cũ');
                }}
              >
                <RotateCcw size={11} />
                <span>Hoàn tác</span>
              </button>
            )}
            <button type="button" className="win-btn" style={{ width: 22, height: 22 }} onClick={() => setAccentPrompt(null)}>
              <X size={12} />
            </button>
          </div>
        </div>
      )}

      {draggingFiles && (
        <div className="drop-overlay">
          <div className="drop-box">
            <UploadCloud size={40} color="var(--studio-accent)" />
            <div style={{ fontSize: 15, fontWeight: 650 }}>Thả video (.mp4, .webm, .gif) hoặc ảnh 2K/4K vào đây</div>
            <div style={{ fontSize: 12, color: 'var(--ink-secondary)' }}>
              Antigravity Studio sẽ tự động phân loại và thêm vào Thư viện
            </div>
          </div>
        </div>
      )}

      {globalToast && <div className="global-toast">{globalToast}</div>}
    </div>
  );
}
