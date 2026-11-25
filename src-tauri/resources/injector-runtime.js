function runtimeInjector(STATE) {
  var cfg = STATE.config || {};

  function hexToRgb(hex) {
    var m = String(hex || '#8b5cf6').trim().replace('#', '');
    var full = m.length === 3 ? m.split('').map(function(c) { return c + c; }).join('') : m;
    var n = parseInt(full, 16);
    if (!Number.isFinite(n)) return '139, 92, 246';
    return ((n >> 16) & 255) + ', ' + ((n >> 8) & 255) + ', ' + (n & 255);
  }

  function cleanupPrevious(keepMediaCache) {
    if (window.__AGY_STUDIO_AC__) {
      try { window.__AGY_STUDIO_AC__.abort(); } catch (_) {}
      window.__AGY_STUDIO_AC__ = null;
    }
    if (window.__AGY_STUDIO_RO__) {
      try { window.__AGY_STUDIO_RO__.disconnect(); } catch (_) {}
      window.__AGY_STUDIO_RO__ = null;
    }
    if (window.__AGY_STUDIO_MO__) {
      try { window.__AGY_STUDIO_MO__.disconnect(); } catch (_) {}
      window.__AGY_STUDIO_MO__ = null;
    }
    if (window.__AGY_STUDIO_INTERVAL__) {
      clearInterval(window.__AGY_STUDIO_INTERVAL__);
      window.__AGY_STUDIO_INTERVAL__ = null;
    }
    if (window.__AGY_VIDEO_TIMER__) {
      clearInterval(window.__AGY_VIDEO_TIMER__);
      window.__AGY_VIDEO_TIMER__ = null;
    }
    if (window.__AGY_FADE_TIMEOUT__) {
      clearTimeout(window.__AGY_FADE_TIMEOUT__);
      window.__AGY_FADE_TIMEOUT__ = null;
    }
    if (!keepMediaCache && window.__AGY_STUDIO_BLOBS__) {
      var vals = Object.values(window.__AGY_STUDIO_BLOBS__);
      for (var i = 0; i < vals.length; i++) {
        try { URL.revokeObjectURL(vals[i]); } catch (_) {}
      }
      window.__AGY_STUDIO_BLOBS__ = {};
    }
  }

  window.__AGY_STUDIO_CLEANUP__ = function() {
    window.__AGY_STUDIO_RUN_ID__ = (window.__AGY_STUDIO_RUN_ID__ || 0) + 1;
    cleanupPrevious(false);
    ['agy-studio-style', 'agy-studio-fonts', 'agy-studio-bg-layer', 'agy-studio-mascot'].forEach(function(id) {
      document.querySelectorAll('#' + id).forEach(function(el) {
        try {
          el.querySelectorAll('video').forEach(function(v) { v.pause(); v.removeAttribute('src'); v.load(); });
        } catch (_) {}
        el.remove();
      });
    });
    if (window.__AGY_STUDIO_WELCOME_ORIG__) {
      window.__AGY_STUDIO_WELCOME_ORIG__.forEach(function(orig, node) {
        try {
          if (node.isConnected) node.nodeValue = orig;
          if (node.parentElement) node.parentElement.removeAttribute('data-agy-studio-welcome');
        } catch (_) {}
      });
      window.__AGY_STUDIO_WELCOME_ORIG__.clear();
    }
    var ideTitleEl = document.querySelector('.antigravity-welcome-header-title');
    if (ideTitleEl && ideTitleEl.dataset.agyOrigTitle) {
      ideTitleEl.textContent = ideTitleEl.dataset.agyOrigTitle;
      delete ideTitleEl.dataset.agyOrigTitle;
    }
  };

  if (!cfg.enabled) {
    window.__AGY_STUDIO_CLEANUP__();
    return { ok: true, disabled: true };
  }

  var isWorkbench = !!document.querySelector('.monaco-workbench') || location.protocol === 'vscode-file:';
  var hasChatShell = !!document.querySelector('.agy-shell');
  var isLocalApp = !isWorkbench && (location.hostname === '127.0.0.1' || location.hostname === 'localhost');
  var isChat = hasChatShell || isLocalApp;
  var isChatSubview = isLocalApp && !hasChatShell && window.self !== window.top;
  var isWebview = !isWorkbench && !isChat && location.protocol === 'vscode-webview:';
  var targetKind = isWorkbench ? 'ide' : (isChat ? 'chat' : (isWebview ? 'webview' : 'other'));

  if (targetKind === 'other') {
    return { ok: true, skipped: true, url: location.href };
  }
  if (targetKind === 'chat' && cfg.applyToChat === false) {
    window.__AGY_STUDIO_CLEANUP__();
    return { ok: true, target: 'chat', disabledForTarget: true };
  }
  if ((targetKind === 'ide' || targetKind === 'webview') && cfg.applyToIde === false) {
    window.__AGY_STUDIO_CLEANUP__();
    return { ok: true, target: targetKind, disabledForTarget: true };
  }

  var legacyStyle = document.getElementById('antigravity-custom-theme-active');
  if (legacyStyle) legacyStyle.remove();

  cleanupPrevious(true);
  var runId = (window.__AGY_STUDIO_RUN_ID__ = (window.__AGY_STUDIO_RUN_ID__ || 0) + 1);
  var ac = new AbortController();
  window.__AGY_STUDIO_AC__ = ac;
  window.__AGY_STUDIO_BLOBS__ = window.__AGY_STUDIO_BLOBS__ || {};

  function isStaleRun() {
    return window.__AGY_STUDIO_RUN_ID__ !== runId || ac.signal.aborted;
  }

  function pruneUnusedBlobs(keepRawUrls) {
    if (!window.__AGY_STUDIO_BLOBS__) return;
    var keepSet = new Set((keepRawUrls || []).filter(Boolean));
    Object.keys(window.__AGY_STUDIO_BLOBS__).forEach(function(k) {
      if (!keepSet.has(k)) {
        try { URL.revokeObjectURL(window.__AGY_STUDIO_BLOBS__[k]); } catch (_) {}
        delete window.__AGY_STUDIO_BLOBS__[k];
      }
    });
  }

  // Load crisp modern UI, Ultra-Legible Vietnamese/English (Lexend/Inter/Be Vietnam Pro), Display Hero & Code Google Fonts
  var fontsHref = 'https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@400;500;600;700&family=Cinzel:wght@600;700;800&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&family=Lexend:wght@400;500;600;700&family=Orbitron:wght@600;700;800&family=Plus+Jakarta+Sans:wght@400;500;600;700&family=Space+Grotesk:wght@400;500;600;700&display=swap';
  var fontLink = document.getElementById('agy-studio-fonts');
  if (!fontLink) {
    fontLink = document.createElement('link');
    fontLink.id = 'agy-studio-fonts';
    fontLink.rel = 'stylesheet';
    fontLink.href = fontsHref;
    document.head.appendChild(fontLink);
  } else if (fontLink.href !== fontsHref) {
    fontLink.href = fontsHref;
  }

  var uiFontMap = {
    'be_vietnam': "'Be Vietnam Pro', 'Segoe UI Variable', 'Segoe UI', system-ui, sans-serif",
    'lexend': "'Lexend', 'Be Vietnam Pro', 'Segoe UI', sans-serif",
    'inter': "'Inter', 'Be Vietnam Pro', 'Segoe UI', sans-serif",
    'jakarta': "'Plus Jakarta Sans', 'Be Vietnam Pro', 'Segoe UI', sans-serif",
    'space': "'Space Grotesk', 'Be Vietnam Pro', 'Segoe UI', sans-serif",
    'system': "'Segoe UI Variable', 'Segoe UI', system-ui, sans-serif"
  };
  var uiFontFamily = uiFontMap[cfg.uiFont || 'be_vietnam'] || uiFontMap.be_vietnam;
  var chatFontSize = Math.max(12, Math.min(18, Number(cfg.chatFontSize) || 14));
  var contrastMode = cfg.textContrastMode || 'crisp';

  var heroFontMap = {
    'orbitron': "'Orbitron', 'Space Grotesk', 'Be Vietnam Pro', sans-serif",
    'cinzel': "'Cinzel', 'Be Vietnam Pro', Georgia, serif",
    'space': "'Space Grotesk', 'Be Vietnam Pro', sans-serif",
    'be_vietnam': "'Be Vietnam Pro', 'Segoe UI', sans-serif",
    'mono': "'JetBrains Mono', 'Cascadia Code', Consolas, monospace"
  };
  var heroFontFamily = heroFontMap[cfg.ideWelcomeFont || 'orbitron'] || heroFontMap.orbitron;
  var heroFontSize = Math.max(16, Math.min(44, Number(cfg.ideWelcomeFontSize) || 26));
  var ideWelcomeStyle = cfg.ideWelcomeStyle || 'luxury_bottom';

  var isEmbeddedChat = targetKind === 'chat' && window.self !== window.top;
  var sameThemeOnBoth = Boolean(STATE.chatTheme && STATE.ideTheme && STATE.chatTheme.id === STATE.ideTheme.id);
  var unifiedSeamless = (cfg.unifiedFullWindow !== false || sameThemeOnBoth) && cfg.applyToIde !== false;
  var activeTheme = unifiedSeamless
    ? (STATE.chatTheme || STATE.ideTheme)
    : (targetKind === 'ide' ? STATE.ideTheme : STATE.chatTheme);

  var isLight = Boolean(cfg.isLightMode);
  var neonHex = cfg.neonColor || (activeTheme && activeTheme.accent) || '#a855f7';
  var neonSec = cfg.neonSecondary || (activeTheme && activeTheme.secondary) || '#38bdf8';
  var neonRgb = hexToRgb(neonHex);
  var neonSecRgb = hexToRgb(neonSec);
  var glowFactor = Math.max(0, Math.min(1, (Number(cfg.neonIntensity !== undefined ? cfg.neonIntensity : 50)) / 100));
  var overlayRgb = isLight ? '244, 247, 255' : ((activeTheme && activeTheme.overlayRgb) || '7, 10, 22');

  var blurPx = Math.max(0, Math.min(28, Number(cfg.wallpaperBlur) || 0));
  var uiBlurPx = Math.max(0, Math.min(20, Number(cfg.uiPanelBlur) || 0));
  var panelBackdropCss = uiBlurPx > 0 ? ('blur(' + uiBlurPx + 'px) saturate(1.25)') : 'none';
  var dimAlpha = Math.max(0, Math.min(0.92, (Number(cfg.dimming !== undefined ? cfg.dimming : 14)) / 100));
  var sidebarAlpha = Math.max(0, Math.min(0.92, (Number(cfg.sidebarOpacity !== undefined ? cfg.sidebarOpacity : 4)) / 100));
  var chatBoxAlpha = Math.max(0, Math.min(0.92, (Number(cfg.chatBoxOpacity !== undefined ? cfg.chatBoxOpacity : 14)) / 100));
  var editorAlpha = Math.max(0, Math.min(0.92, (Number(cfg.editorOpacity !== undefined ? cfg.editorOpacity : 24)) / 100));
  var terminalAlpha = Math.max(0, Math.min(0.92, (Number(cfg.terminalOpacity !== undefined ? cfg.terminalOpacity : Math.min(24, sidebarAlpha * 100 + 8))) / 100));
  var settingsAlpha = Math.max(0, Math.min(0.92, (Number(cfg.settingsOpacity !== undefined ? cfg.settingsOpacity : Math.max(22, editorAlpha * 100))) / 100));
  var cornerRad = Math.max(4, Math.min(24, Number(cfg.cornerRadius !== undefined ? cfg.cornerRadius : 14)));

  var borderMode = cfg.borderStyle || 'subtle';
  var chromeBorder = borderMode === 'none'
    ? 'transparent'
    : borderMode === 'neon'
    ? ('rgba(' + neonRgb + ', ' + (0.22 * glowFactor + 0.06).toFixed(2) + ')')
    : (isLight ? 'rgba(15, 23, 42, 0.07)' : 'rgba(255, 255, 255, 0.045)');

  var cardBorder = borderMode === 'none'
    ? 'transparent'
    : borderMode === 'neon'
    ? ('rgba(' + neonRgb + ', ' + (0.26 * glowFactor + 0.08).toFixed(2) + ')')
    : (isLight ? 'rgba(15, 23, 42, 0.09)' : 'rgba(255, 255, 255, 0.075)');

  var focusBorder = borderMode === 'none'
    ? 'rgba(' + neonRgb + ', 0.28)'
    : ('rgba(' + neonRgb + ', ' + (0.48 * glowFactor + 0.18).toFixed(2) + ')');

  /* Multi-direction tight subtitle-grade dark contour halo — 100% readable even directly over pure white anime moonlight! */
  var crispTextHalo = isLight
    ? '0 1px 2px rgba(255, 255, 255, 0.92), 0 0 6px rgba(255, 255, 255, 0.8)'
    : contrastMode === 'outline'
    ? '1px 1px 0 rgba(0, 0, 0, 0.96), -1px -1px 0 rgba(0, 0, 0, 0.96), 1px -1px 0 rgba(0, 0, 0, 0.96), -1px 1px 0 rgba(0, 0, 0, 0.96), 0 2px 6px rgba(0, 0, 0, 0.96), 0 0 12px rgba(0, 0, 0, 0.85)'
    : contrastMode === 'soft'
    ? '0 1px 3px rgba(0, 0, 0, 0.9), 0 0 8px rgba(0, 0, 0, 0.65)'
    : '0 1px 1.5px rgba(0, 0, 0, 0.98), 0 -1px 1.5px rgba(0, 0, 0, 0.88), 1px 0 1.5px rgba(0, 0, 0, 0.92), -1px 0 1.5px rgba(0, 0, 0, 0.92), 0 2px 9px rgba(0, 0, 0, 0.88)';
  var chatBodyWeight = contrastMode === 'soft' ? '450' : '500';

  // Eye-Comfort Typography Palette Engine
  var paletteKey = cfg.textPalette || 'alabaster';
  var txtBody = isLight ? '#0f172a' : '#edf2f7';
  var txtStrong = isLight ? '#020617' : '#f8fafc';
  var txtMuted = isLight ? '#475569' : '#a8b8d0';
  var txtCode = isLight ? '#0369a1' : '#bae6fd';
  var codeBg = isLight ? 'rgba(14, 165, 233, 0.10)' : 'rgba(15, 23, 42, 0.56)';
  var codeBorder = isLight ? 'rgba(14, 165, 233, 0.22)' : 'rgba(186, 230, 253, 0.16)';
  var txtLink = isLight ? '#0284c7' : '#7dd3fc';

  if (!isLight) {
    if (paletteKey === 'warm_cream') {
      txtBody = '#f2ece1';
      txtStrong = '#fffaf0';
      txtMuted = '#c4b8a5';
      txtCode = '#fde68a';
      codeBg = 'rgba(28, 22, 16, 0.62)';
      codeBorder = 'rgba(253, 230, 138, 0.18)';
      txtLink = '#fdba74';
    } else if (paletteKey === 'ice_blue') {
      txtBody = '#e6f3ff';
      txtStrong = '#f0f9ff';
      txtMuted = '#9bc0e0';
      txtCode = '#67e8f9';
      codeBg = 'rgba(8, 22, 36, 0.62)';
      codeBorder = 'rgba(103, 232, 249, 0.18)';
      txtLink = '#38bdf8';
    } else if (paletteKey === 'custom') {
      txtBody = cfg.customTextColor || '#edf2f7';
      txtStrong = '#ffffff';
      txtCode = cfg.customCodeColor || '#bae6fd';
      txtLink = cfg.customCodeColor || '#7dd3fc';
    }
  }

  function resolveCspSafeUrl(rawUrl, attempt) {
    var tries = attempt || 0;
    if (!rawUrl) return Promise.resolve('');
    // Cache local media-server URLs as in-memory blob: URLs on BOTH Workbench AND Chat so videos stay smooth 60fps even if Studio restarts!
    var shouldBlob = isWorkbench || rawUrl.indexOf('http://127.0.0.1:') === 0;
    if (!shouldBlob) return Promise.resolve(rawUrl);
    if (window.__AGY_STUDIO_BLOBS__[rawUrl]) {
      return Promise.resolve(window.__AGY_STUDIO_BLOBS__[rawUrl]);
    }
    return fetch(rawUrl)
      .then(function(resp) {
        if (!resp.ok) throw new Error('HTTP ' + resp.status);
        return resp.blob().then(function(blob) {
          if (!blob || blob.size === 0) throw new Error('Empty blob');
          var blobUrl = URL.createObjectURL(blob);
          window.__AGY_STUDIO_BLOBS__[rawUrl] = blobUrl;
          return blobUrl;
        });
      })
      .catch(function() {
        if (tries < 3) {
          var delay = tries === 0 ? 260 : tries === 1 ? 650 : 1200;
          return new Promise(function(resolve) {
            setTimeout(function() {
              resolve(resolveCspSafeUrl(rawUrl, tries + 1));
            }, delay);
          });
        }
        return '';
      });
  }

  // Exact sub-pixel and zoom-compensated full-window panorama mapping across IDE & Chat iframe!
  function applyUnifiedCanvasGeometry(layout) {
    var inner = document.getElementById('agy-studio-bg-stage');
    if (!inner) return;
    if (isEmbeddedChat && unifiedSeamless && layout && layout.parentW > 0 && layout.parentH > 0) {
      var sx = layout.frameW > 20 ? (window.innerWidth / layout.frameW) : 1;
      var sy = layout.frameH > 20 ? (window.innerHeight / layout.frameH) : 1;
      // Only apply zoom compensation when X and Y ratios agree (prevents stale 1-frame stretch during maximize/restore!)
      var uniformScale = Math.abs(sx - sy) <= 0.04 ? ((sx + sy) * 0.5) : 1;
      inner.style.width = (layout.parentW * uniformScale).toFixed(2) + 'px';
      inner.style.height = (layout.parentH * uniformScale).toFixed(2) + 'px';
      inner.style.left = (-layout.offsetX * uniformScale).toFixed(2) + 'px';
      inner.style.top = (-layout.offsetY * uniformScale).toFixed(2) + 'px';
    } else {
      inner.style.width = '100%';
      inner.style.height = '100%';
      inner.style.left = '0px';
      inner.style.top = '0px';
    }
  }

  // Gentle PLL Phase-Lock: keeps IDE & Chat videos locked in phase via tiny +/-4% speed nudges — ZERO mid-loop decoder seeks!
  function syncVideoFrameClock(allowHardSeek) {
    var deck = window.__AGY_VIDEO_DECK__;
    if (!deck || deck.fading || !deck.decks || !deck.decks.length) return;
    var v = deck.decks[deck.activeIdx];
    if (!v || v.paused || !v.duration || !Number.isFinite(v.duration) || v.duration <= 1.2) return;
    var baseSpd = Math.max(0.25, Math.min(2.5, Number(cfg.videoSpeed) || 1));
    var fadeSec = Math.min(1.2, Math.max(0.4, v.duration * 0.14));
    var leadMargin = 0.22;
    var cycleDur = Math.max(1.2, v.duration - fadeSec - leadMargin);
    var targetT = ((Date.now() / 1000) * baseSpd) % cycleDur;
    // Do not disturb right near handoff boundary
    if (v.currentTime > cycleDur - 0.35 || v.currentTime < 0.35) {
      if (v.playbackRate !== baseSpd) v.playbackRate = baseSpd;
      return;
    }
    var err = targetT - v.currentTime;
    if (err > cycleDur * 0.5) err -= cycleDur;
    if (err < -cycleDur * 0.5) err += cycleDur;
    if (allowHardSeek && Math.abs(err) > 1.25) {
      try { v.currentTime = targetT; } catch (_) {}
      v.playbackRate = baseSpd;
    } else if (Math.abs(err) > 0.03) {
      var adj = Math.max(-0.045, Math.min(0.045, err * 0.14));
      v.playbackRate = Number((baseSpd * (1 + adj)).toFixed(4));
    } else if (v.playbackRate !== baseSpd) {
      v.playbackRate = baseSpd;
    }
  }

  window.__AGY_STUDIO_SYNC_LAYOUT__ = function(layout) {
    STATE.ideLayout = layout;
    applyUnifiedCanvasGeometry(layout);
    syncVideoFrameClock(false);
  };

  function reportIdeLayoutToBridge(force) {
    if (!isWorkbench || typeof window.agyStudioLayoutSync !== 'function') return;
    var f = document.querySelector('iframe.webview.ready') || document.querySelector('iframe.webview');
    var r = f ? f.getBoundingClientRect() : null;
    var payload = {
      parentW: window.innerWidth,
      parentH: window.innerHeight,
      offsetX: r ? Math.round(r.left) : 0,
      offsetY: r ? Math.round(r.top) : 0,
      frameW: r ? Math.round(r.width) : 0,
      frameH: r ? Math.round(r.height) : 0
    };
    var sig = payload.parentW + ':' + payload.parentH + ':' + payload.offsetX + ':' + payload.offsetY + ':' + payload.frameW + ':' + payload.frameH;
    if (!force && window.__AGY_LAST_LAYOUT_SIG__ === sig) return;
    window.__AGY_LAST_LAYOUT_SIG__ = sig;
    try { window.agyStudioLayoutSync(JSON.stringify(payload)); } catch (_) {}
  }

  function scheduleLayoutResyncBurst() {
    reportIdeLayoutToBridge(false);
    [50, 160, 360].forEach(function(ms) {
      setTimeout(function() { reportIdeLayoutToBridge(false); }, ms);
    });
  }

  function mountBackgroundLayer() {
    // Pure 1-Video Pass-Through Architecture:
    // Webview wrappers, embedded subviews (Antigravity Settings), AND embedded Chat in unified full-window mode
    // let Workbench's single 60fps video shine straight through with ZERO resize/maximize/zoom misalignment,
    // ZERO frame drift, and 50% lower GPU decode load! (Split mode & standalone Chat still mount their own video.)
    if (targetKind === 'webview' || isChatSubview || (isEmbeddedChat && unifiedSeamless)) {
      window.__AGY_VIDEO_DECK__ = null;
      var oldBg = document.getElementById('agy-studio-bg-layer');
      if (oldBg) {
        try {
          oldBg.querySelectorAll('video').forEach(function(v) { v.pause(); v.removeAttribute('src'); v.load(); });
        } catch (_) {}
        oldBg.remove();
      }
      return Promise.resolve();
    }
    var host = isWorkbench
      ? (document.querySelector('.monaco-workbench') || document.body)
      : (document.querySelector('.agy-shell') || document.body);
    if (!host) return Promise.resolve();

    var layer = document.getElementById('agy-studio-bg-layer');
    if (!layer) {
      layer = document.createElement('div');
      layer.id = 'agy-studio-bg-layer';
      layer.style.cssText = 'position:fixed;inset:0;z-index:0;pointer-events:none;overflow:hidden;contain:strict;';
      host.insertBefore(layer, host.firstChild);
    } else if (layer.parentElement !== host) {
      // Cold-boot preload may have attached layer to document.body before .monaco-workbench/.agy-shell hydrated — reparent cleanly!
      host.insertBefore(layer, host.firstChild);
    }

    var rawUrl = activeTheme && activeTheme.mediaUrl ? activeTheme.mediaUrl : '';
    var isVideo = Boolean(activeTheme && activeTheme.mediaType === 'video');

    return resolveCspSafeUrl(rawUrl).then(function(resolvedUrl) {
      if (isStaleRun()) return;
      var pureBg = (activeTheme && activeTheme.pureBg) || '';
      var mediaFailed = Boolean(rawUrl && !resolvedUrl);
      var lowRamSingleDeck = cfg.smartGpuPowerSaving !== false;
      var mediaKey = mediaFailed
        ? ('failed:' + rawUrl)
        : ((isVideo ? (lowRamSingleDeck ? 'vid1:' : 'vid2:') : 'img:') + resolvedUrl + ':' + pureBg);
      var fit = cfg.videoObjectFit === 'contain' ? 'contain' : 'cover';
      var filterStr = blurPx > 0 ? ('blur(' + blurPx + 'px) scale(' + (1 + blurPx * 0.004).toFixed(3) + ')') : 'none';

      if (mediaFailed) {
        layer.dataset.mediaFailed = '1';
      } else {
        delete layer.dataset.mediaFailed;
      }

      // If existing video deck errored or stalled at readyState 0 after 5s, force clean remount instead of keeping stale key
      if (isVideo && layer.dataset.mediaKey === mediaKey) {
        var existingV = document.getElementById('agy-studio-bg-video');
        if (!existingV || existingV.error || (existingV.readyState === 0 && (Date.now() - (window.__AGY_MOUNT_TS__ || 0)) > 5500)) {
          layer.dataset.mediaKey = '';
        }
      }

      if (layer.dataset.mediaKey !== mediaKey) {
        try {
          layer.querySelectorAll('video').forEach(function(oldV) {
            oldV.pause();
            oldV.removeAttribute('src');
            oldV.load();
          });
        } catch (_) {}
        while (layer.firstChild) layer.removeChild(layer.firstChild);
        layer.dataset.mediaKey = mediaKey;
        window.__AGY_MOUNT_TS__ = Date.now();

        var stage = document.createElement('div');
        stage.id = 'agy-studio-bg-stage';
        stage.style.cssText = 'position:absolute;left:0;top:0;width:100%;height:100%;overflow:hidden;pointer-events:none;';
        layer.appendChild(stage);

        if (resolvedUrl && isVideo) {
          var volInit = (isEmbeddedChat && unifiedSeamless) ? 0 : Math.max(0, Math.min(1, (Number(cfg.videoVolume) || 0) / 100));
          var spdInit = Math.max(0.25, Math.min(2.5, Number(cfg.videoSpeed) || 1));
          var makeDeck = function(id, initialOpacity, zIdx, nativeLoop) {
            var v = document.createElement('video');
            v.id = id;
            v.src = resolvedUrl;
            v.preload = 'auto';
            v.loop = Boolean(nativeLoop);
            v.playsInline = true;
            v.muted = volInit === 0;
            v.volume = volInit;
            v.playbackRate = spdInit;
            v.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;object-fit:' + fit + ';object-position:center center;filter:' + filterStr + ';opacity:' + initialOpacity + ';z-index:' + zIdx + ';transform:translateZ(0);pointer-events:none;';
            return v;
          };

          var handleDeckError = function() {
            if (window.__AGY_STUDIO_BLOBS__ && window.__AGY_STUDIO_BLOBS__[rawUrl]) {
              try { URL.revokeObjectURL(window.__AGY_STUDIO_BLOBS__[rawUrl]); } catch (_) {}
              delete window.__AGY_STUDIO_BLOBS__[rawUrl];
            }
            layer.dataset.mediaFailed = '1';
            layer.dataset.mediaKey = '';
          };

          if (lowRamSingleDeck) {
            /* Single-Deck Eco Loop: 1 hardware decoder instead of 2 -> cuts video RAM & GPU VRAM by 50%! */
            var vidSingle = makeDeck('agy-studio-bg-video', '1', '1', true);
            stage.appendChild(vidSingle);
            window.__AGY_VIDEO_DECK__ = {
              decks: [vidSingle],
              activeIdx: 0,
              fading: false,
              single: true,
            };
            vidSingle.addEventListener('error', handleDeckError, { signal: ac.signal });
            vidSingle.play().catch(function() {
              vidSingle.muted = true;
              vidSingle.play().catch(function() {});
            });
          } else {
            var vidA = makeDeck('agy-studio-bg-video', '1', '1', false);
            var vidB = makeDeck('agy-studio-bg-video-b', '0', '0', false);
            stage.appendChild(vidA);
            stage.appendChild(vidB);

            window.__AGY_VIDEO_DECK__ = {
              decks: [vidA, vidB],
              activeIdx: 0,
              fading: false,
              single: false,
            };

            vidA.addEventListener('error', handleDeckError, { signal: ac.signal });
            vidB.addEventListener('error', handleDeckError, { signal: ac.signal });

            vidA.addEventListener('loadedmetadata', function() {
              if (vidA.duration && Number.isFinite(vidA.duration) && vidA.duration > 1.5) {
                var fSec = Math.min(1.2, Math.max(0.4, vidA.duration * 0.14));
                var cyc = Math.max(1.2, vidA.duration - fSec - 0.22);
                try { vidA.currentTime = ((Date.now() / 1000) * spdInit) % cyc; } catch (_) {}
              }
            });
            vidB.addEventListener('loadeddata', function() {
              try { vidB.pause(); vidB.currentTime = 0; } catch (_) {}
            });
            vidB.load();

            vidA.play().catch(function() {
              vidA.muted = true;
              vidA.play().catch(function() {});
            });
          }
        } else if (resolvedUrl) {
          window.__AGY_VIDEO_DECK__ = null;
          var img = document.createElement('img');
          img.id = 'agy-studio-bg-img';
          img.src = resolvedUrl;
          img.alt = '';
          img.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;object-fit:' + fit + ';object-position:center center;filter:' + filterStr + ';image-rendering:high-quality;transform:translateZ(0);';
          img.addEventListener('error', function() {
            if (window.__AGY_STUDIO_BLOBS__ && window.__AGY_STUDIO_BLOBS__[rawUrl]) {
              try { URL.revokeObjectURL(window.__AGY_STUDIO_BLOBS__[rawUrl]); } catch (_) {}
              delete window.__AGY_STUDIO_BLOBS__[rawUrl];
            }
            layer.dataset.mediaFailed = '1';
            layer.dataset.mediaKey = '';
          }, { signal: ac.signal });
          stage.appendChild(img);
        } else {
          window.__AGY_VIDEO_DECK__ = null;
          var pure = document.createElement('div');
          pure.id = 'agy-studio-bg-pure';
          pure.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;background:' + (pureBg || ('radial-gradient(circle at 75% 25%, rgba(' + neonRgb + ', 0.22), transparent 55%), linear-gradient(155deg, #070a18 0%, #0b0e1e 100%)')) + ';';
          stage.appendChild(pure);
        }

        var scrim = document.createElement('div');
        scrim.id = 'agy-studio-bg-scrim';
        scrim.style.cssText = 'position:absolute;inset:0;z-index:3;pointer-events:none;';
        stage.appendChild(scrim);
      }

      applyUnifiedCanvasGeometry(STATE.ideLayout);

      var deck = window.__AGY_VIDEO_DECK__;
      if (deck && deck.decks && deck.decks.length >= 1) {
        var vol = (isEmbeddedChat && unifiedSeamless) ? 0 : Math.max(0, Math.min(1, (Number(cfg.videoVolume) || 0) / 100));
        var spd = Math.max(0.25, Math.min(2.5, Number(cfg.videoSpeed) || 1));
        for (var di = 0; di < deck.decks.length; di++) {
          var dv = deck.decks[di];
          dv.style.objectFit = fit;
          dv.style.filter = filterStr;
          dv.muted = vol === 0;
          dv.volume = vol;
          dv.playbackRate = spd;
        }

        if (deck.decks.length === 1) {
          var sv = deck.decks[0];
          if (sv && sv.paused && !document.hidden) {
            sv.play().catch(function() { sv.muted = true; sv.play().catch(function() {}); });
          }
          var syncSinglePlay = function() {
            if (!sv || !sv.isConnected) return;
            if (document.hidden) {
              if (!sv.paused) sv.pause();
            } else if (sv.paused) {
              sv.play().catch(function() { sv.muted = true; sv.play().catch(function() {}); });
            }
          };
          document.addEventListener('visibilitychange', syncSinglePlay, { signal: ac.signal });
          window.addEventListener('focus', syncSinglePlay, { signal: ac.signal });
        } else if (deck.decks.length === 2) {

        // Bulletproof Playback-Clock-Driven Dual-Deck Crossfade Monitor (110ms tick — immune to timer throttling & slider re-injects!)
        var tickSeamlessCrossfade = function() {
          var dObj = window.__AGY_VIDEO_DECK__;
          if (!dObj || !dObj.decks || dObj.decks.length !== 2) return;
          var front = dObj.decks[dObj.activeIdx];
          var back = dObj.decks[1 - dObj.activeIdx];
          if (!front || !back || !front.duration || !Number.isFinite(front.duration) || front.duration <= 1.2) return;

          var fadeSec = Math.min(1.2, Math.max(0.4, front.duration * 0.14));

          if (dObj.fading) {
            if (back.paused && !document.hidden) {
              back.play().catch(function() { back.muted = true; back.play().catch(function() {}); });
            }
            if (back.currentTime >= fadeSec + 0.05 || (front.ended && back.currentTime >= 0.35)) {
              dObj.activeIdx = 1 - dObj.activeIdx;
              dObj.fading = false;
              back.style.transition = 'none';
              back.style.opacity = '1';
              back.style.zIndex = '1';
              front.style.transition = 'none';
              front.style.opacity = '0';
              front.style.zIndex = '0';
              try { front.pause(); front.currentTime = 0; } catch (_) {}
            }
            return;
          }

          if (front.paused) {
            // Auto-resume if cold-boot autoplay stalled before window became visible/ready
            if (!document.hidden && front.readyState >= 2) {
              front.play().catch(function() {
                front.muted = true;
                front.play().catch(function() {});
              });
            }
            return;
          }
          var triggerAt = front.duration - fadeSec - 0.25;
          if (front.currentTime < triggerAt) return;

          dObj.fading = true;
          back.style.transition = 'none';
          back.style.opacity = '0';
          back.style.zIndex = '2';
          front.style.zIndex = '1';
          back.playbackRate = spd;
          if (back.currentTime > 0.08) {
            try { back.currentTime = 0; } catch (_) {}
          }
          back.play().catch(function() {
            back.muted = true;
            back.play().catch(function() {});
          });

          // Force layout reflow so opacity transition 0 -> 1 always animates cleanly
          void back.offsetWidth;
          back.style.transition = 'opacity ' + fadeSec.toFixed(2) + 's linear';
          back.style.opacity = '1';
        };

        if (window.__AGY_VIDEO_TIMER__) clearInterval(window.__AGY_VIDEO_TIMER__);
        window.__AGY_VIDEO_TIMER__ = setInterval(tickSeamlessCrossfade, 100);

        // Safety fallback if a deck ever fires 'ended' (e.g. after system suspend)
        deck.decks.forEach(function(dv, idx) {
          dv.addEventListener('ended', function() {
            if (!window.__AGY_VIDEO_DECK__) return;
            if (window.__AGY_VIDEO_DECK__.activeIdx === idx && !window.__AGY_VIDEO_DECK__.fading) {
              try { dv.currentTime = 0; dv.play().catch(function() {}); } catch (_) {}
            }
          }, { signal: ac.signal });
        });

        var syncPlayState = function() {
          var dObj = window.__AGY_VIDEO_DECK__;
          if (!dObj) return;
          var activeV = dObj.decks[dObj.activeIdx];
          var idleV = dObj.decks[1 - dObj.activeIdx];
          if (!cfg.smartGpuPowerSaving) {
            if (activeV && activeV.paused) activeV.play().catch(function() {});
            return;
          }
          if (document.hidden) {
            if (activeV && !activeV.paused) activeV.pause();
            if (idleV && !idleV.paused) idleV.pause();
          } else {
            if (activeV && activeV.paused) {
              if (activeV.duration && activeV.duration > 1.5) {
                var fSec = Math.min(1.2, Math.max(0.4, activeV.duration * 0.14));
                var cyc = Math.max(1.2, activeV.duration - fSec - 0.22);
                try { activeV.currentTime = ((Date.now() / 1000) * spd) % cyc; } catch (_) {}
              }
              activeV.play().catch(function() {});
            }
          }
        };
        document.addEventListener('visibilitychange', syncPlayState, { signal: ac.signal });
        window.addEventListener('focus', syncPlayState, { signal: ac.signal });
        }
      }
      var curImg = document.getElementById('agy-studio-bg-img');
      if (curImg) {
        curImg.style.objectFit = fit;
        curImg.style.filter = filterStr;
      }
      var curScrim = document.getElementById('agy-studio-bg-scrim');
      if (curScrim) {
        curScrim.style.background =
          'radial-gradient(ellipse at 50% 45%, rgba(' + overlayRgb + ', ' + (dimAlpha * 0.72).toFixed(3) + ') 0%, rgba(' + overlayRgb + ', ' + Math.min(0.92, dimAlpha * 1.15).toFixed(3) + ') 100%)';
      }
    });
  }

  function removeAllMascots() {
    document.querySelectorAll('#agy-studio-mascot').forEach(function(el) { el.remove(); });
  }

  function mountMascot() {
    if (targetKind === 'webview' || isChatSubview) {
      removeAllMascots();
      return Promise.resolve();
    }
    var skipEmbeddedDuplicate = isEmbeddedChat && cfg.mascotTarget === 'both' && cfg.applyToIde !== false;
    var allowTarget = !skipEmbeddedDuplicate && (cfg.mascotTarget === 'both' || cfg.mascotTarget === targetKind);
    if (!cfg.mascotEnabled || !allowTarget || !STATE.mascot || !STATE.mascot.mediaUrl) {
      removeAllMascots();
      return Promise.resolve();
    }
    return resolveCspSafeUrl(STATE.mascot.mediaUrl).then(function(resolvedUrl) {
      if (isStaleRun()) return;
      if (!resolvedUrl) {
        removeAllMascots();
        return;
      }

      // Deduplicate any stray/zombie #agy-studio-mascot nodes so ONLY 1 live interactive mascot ever exists!
      var allExisting = document.querySelectorAll('#agy-studio-mascot');
      var box = allExisting.length ? allExisting[0] : null;
      for (var ei = 1; ei < allExisting.length; ei++) {
        allExisting[ei].remove();
      }
      if (!box) {
        box = document.createElement('div');
        box.id = 'agy-studio-mascot';
        document.body.appendChild(box);
      }

      var interactive = cfg.mascotInteractive !== false;
      var size = Math.max(44, Math.min(240, Number(cfg.mascotSize) || 124));
      var opacity = Math.max(0.15, Math.min(1, (Number(cfg.mascotOpacity) || 96) / 100));
      var mascotAnimMode = cfg.mascotAnim || 'float';
      var mascotGlow = cfg.mascotGlow !== false;
      var mascotFlip = Boolean(cfg.mascotFlip);
      var idleAnimCss = mascotAnimMode === 'none'
        ? 'none'
        : mascotAnimMode === 'breathe'
        ? 'agyMascotHumanBreathe 3.8s ease-in-out infinite'
        : mascotAnimMode === 'bounce'
        ? 'agyMascotIdleBounce 2.8s ease-in-out infinite'
        : 'agyMascotHumanIdle 4.2s ease-in-out infinite';

      var savedPosKey = 'agy_studio_mascot_pct_' + targetKind;
      var curPreset = cfg.mascotPosition || 'bottom-right';
      var savedPct = null;
      if (interactive) {
        try {
          var parsedPos = JSON.parse(localStorage.getItem(savedPosKey) || 'null');
          // Keep user's dragged position across theme/slider refreshes; only reset if they picked a DIFFERENT preset!
          if (parsedPos && Number.isFinite(parsedPos.xPct) && Number.isFinite(parsedPos.yPct)) {
            if (!parsedPos.preset || parsedPos.preset === curPreset || curPreset === 'custom') {
              savedPct = parsedPos;
            } else {
              localStorage.removeItem(savedPosKey);
            }
          }
        } catch (_) {}
      }

      function computePresetPosCss() {
        if (savedPct && Number.isFinite(savedPct.xPct) && Number.isFinite(savedPct.yPct)) {
          var pxL = Math.max(6, Math.min(window.innerWidth - size - 6, Math.round(savedPct.xPct * window.innerWidth)));
          var pxT = Math.max(36, Math.min(window.innerHeight - size - 6, Math.round(savedPct.yPct * window.innerHeight)));
          return 'left:' + pxL + 'px;top:' + pxT + 'px;right:auto;bottom:auto;';
        }
        if (curPreset === 'bottom-left') return 'bottom:38px;left:58px;right:auto;top:auto;';
        if (curPreset === 'top-right') return 'top:54px;right:20px;left:auto;bottom:auto;';
        if (curPreset === 'composer') return 'bottom:118px;right:22px;left:auto;top:auto;';
        return 'bottom:164px;right:16px;left:auto;top:auto;';
      }

      var dropFilter = mascotGlow
        ? ('drop-shadow(0 8px 20px rgba(0, 0, 0, 0.56)) drop-shadow(0 0 12px rgba(' + neonRgb + ', 0.44))')
        : 'drop-shadow(0 8px 18px rgba(0, 0, 0, 0.54))';

      box.style.cssText =
        'position:fixed;' + computePresetPosCss() +
        'width:' + size + 'px;height:' + size + 'px;z-index:2147483000;' +
        'pointer-events:' + (interactive ? 'auto' : 'none') + ';' +
        'cursor:' + (interactive ? 'grab' : 'default') + ';' +
        'user-select:none;-webkit-user-select:none;touch-action:none;opacity:' + opacity + ';' +
        'filter:' + dropFilter + ';perspective:600px;transition:filter 0.25s ease;';
      box.title = interactive ? 'Xoa đầu / Bấm tương tác • Nháy đúp xoay vòng • Kéo thả đi khắp màn hình' : '';

      var phys = box.querySelector('.agy-mascot-physics');
      var inner = box.querySelector('.agy-mascot-sprite');
      var isVidMascot = /\.(mp4|webm)(\?|$)/i.test(STATE.mascot.filePath || '');

      if (!phys || !inner || box.dataset.src !== resolvedUrl) {
        while (box.firstChild) box.removeChild(box.firstChild);
        box.dataset.src = resolvedUrl;

        phys = document.createElement('div');
        phys.className = 'agy-mascot-physics';
        phys.style.cssText = 'width:100%;height:100%;position:relative;transform-origin:50% 84%;transition:transform 0.24s cubic-bezier(0.22, 1, 0.36, 1);will-change:transform;';

        inner = document.createElement('div');
        inner.className = 'agy-mascot-sprite';
        inner.style.cssText = 'width:100%;height:100%;position:relative;display:flex;align-items:center;justify-content:center;transform-origin:50% 88%;animation:' + idleAnimCss + ';';

        var blush = document.createElement('div');
        blush.className = 'agy-mascot-blush';
        blush.style.cssText = 'position:absolute;inset:12% 16% 36% 16%;border-radius:50%;pointer-events:none;opacity:0;background:radial-gradient(circle, rgba(251, 113, 133, 0.34) 0%, rgba(244, 114, 182, 0.14) 55%, transparent 78%);filter:blur(6px);transition:opacity 0.28s ease;z-index:3;';

        if (isVidMascot) {
          var v = document.createElement('video');
          v.src = resolvedUrl;
          v.autoplay = true;
          v.loop = true;
          v.muted = true;
          v.playsInline = true;
          v.draggable = false;
          v.style.cssText = 'width:100%;height:100%;object-fit:contain;border-radius:16px;pointer-events:none;transform:' + (mascotFlip ? 'scaleX(-1)' : 'none') + ';';
          inner.appendChild(v);
        } else {
          var im = document.createElement('img');
          im.src = resolvedUrl;
          im.alt = '';
          im.draggable = false;
          im.style.cssText = 'width:100%;height:100%;object-fit:contain;pointer-events:none;transform:' + (mascotFlip ? 'scaleX(-1)' : 'none') + ';';
          inner.appendChild(im);
        }
        inner.appendChild(blush);
        phys.appendChild(inner);
        box.appendChild(phys);
      } else {
        inner.style.animation = idleAnimCss;
        var mediaEl = inner.querySelector('img, video');
        if (mediaEl) mediaEl.style.transform = mascotFlip ? 'scaleX(-1)' : 'none';
      }

      if (!interactive) return;

      // Re-clamp dragged mascot smoothly on window resize so it never goes off-screen!
      window.addEventListener('resize', function() {
        if (!box.isConnected || !savedPct) return;
        var pxL = Math.max(6, Math.min(window.innerWidth - size - 6, Math.round(savedPct.xPct * window.innerWidth)));
        var pxT = Math.max(36, Math.min(window.innerHeight - size - 6, Math.round(savedPct.yPct * window.innerHeight)));
        box.style.left = pxL + 'px';
        box.style.top = pxT + 'px';
        box.style.right = 'auto';
        box.style.bottom = 'auto';
      }, { signal: ac.signal });

      var headpatActions = [
        { anim: 'agyMascotHeadpat', dur: 1120, blush: true, icons: ['🥰', '✨', '💕', '🌸'], glow: 'rgba(251, 146, 178, 0.85)', quote: 'Xoa đầu em thế này... thích quá đi mất~ 🥰✨' },
        { anim: 'agyMascotHeadpat', dur: 1120, blush: true, icons: ['💕', '🌸', '✨', '💗'], glow: 'rgba(244, 114, 182, 0.86)', quote: 'Ưm~ tay anh ấm quá, xoa thêm chút nữa đi~ 💕' },
      ];
      var teaseLowerActions = [
        { anim: 'agyMascotStepBackTease', dur: 960, blush: true, icons: ['😳', '💢', '💗', '✨'], glow: 'rgba(251, 113, 133, 0.90)', quote: 'Á! Chạm đâu đấy, hư quá rồi nha~ 😳💢' },
        { anim: 'agyMascotStepBackTease', dur: 960, blush: true, icons: ['🙈', '💗', '🌸'], glow: 'rgba(244, 114, 182, 0.88)', quote: 'Này này, định chọc em giật mình hả? Hứ~ 🙈💗' },
      ];
      var charmActions = [
        { anim: 'agyMascotHumanStartle', dur: 1020, blush: true, icons: ['💓', '🌸', '✨'], glow: 'rgba(244, 114, 182, 0.86)', quote: 'Ơ kìa! Chạm bất ngờ làm tim em nhảy thót lên đấy~ 💓' },
        { anim: 'agyMascotBlushLeanIn', dur: 1140, blush: true, icons: ['💕', '✨', '🌟'], glow: 'rgba(244, 114, 182, 0.82)', quote: 'Ghé sát lại chút... anh đang viết dòng code gì bí mật thế? 👀💗' },
        { anim: 'agyMascotBlowKissReal', dur: 1060, blush: true, icons: ['💋', '💖', '💕', '✨'], glow: 'rgba(251, 113, 133, 0.90)', quote: 'Gửi anh một nụ hôn gió lấy hên fix bug nha~ 💋✨' },
        { anim: 'agyMascotPlayfulSway', dur: 1180, blush: false, icons: ['💖', '🌸', '✨'], glow: 'rgba(244, 114, 182, 0.82)', quote: 'Nhìn em kỹ thế... em ngại đến đỏ mặt rồi đó~ 💖' },
        { anim: 'agyMascotShyDuck', dur: 980, blush: true, icons: ['😳', '💗', '🌸', '✨'], glow: 'rgba(251, 146, 178, 0.88)', quote: 'Ấn em hoài à... ngại chết đi được ấy~ 😳💗' },
        { anim: 'agyMascotHeartBeat', dur: 960, blush: true, icons: ['💓', '💖', '💗', '✨'], glow: 'rgba(236, 72, 153, 0.90)', quote: 'Thình thịch... chạm khẽ thế thôi mà em rung động rồi~ 💓' },
        { anim: 'agyMascotGlanceTurn', dur: 1160, blush: false, icons: ['🦋', '✨', '🌸', '💫'], glow: 'rgba(192, 132, 252, 0.86)', quote: 'Quay lại nhìn anh một chút nè~ Tập trung code nhé! 🦋✨' },
        { anim: 'agyMascotWaltzReal', dur: 1200, blush: false, icons: ['💎', '🌟', '🌸', '💕'], glow: 'rgba(167, 139, 250, 0.86)', quote: 'Nghỉ tay một nhịp thư giãn cùng em đi nào~ 🦋🌸' },
      ];

      function nextCharmAction(relY) {
        var now = Date.now();
        var clicks = (window.__AGY_MASCOT_CLICKS__ = (window.__AGY_MASCOT_CLICKS__ || []).filter(function(ts) { return now - ts < 2600; }));
        clicks.push(now);
        if (clicks.length >= 4) {
          window.__AGY_MASCOT_CLICKS__ = [];
          return { anim: 'agyMascotFlustered', dur: 1040, blush: true, icons: ['😳', '💓', '💗', '✨', '🌸'], glow: 'rgba(251, 113, 133, 0.96)', quote: 'Ấn liên tục thế... em bối rối thật đấy nha~ 😳💓' };
        }
        if (relY < 0.34) {
          return headpatActions[Math.floor(Math.random() * headpatActions.length)];
        }
        if (relY > 0.72) {
          return teaseLowerActions[Math.floor(Math.random() * teaseLowerActions.length)];
        }
        var deck = window.__AGY_MASCOT_DECK__;
        if (!Array.isArray(deck) || !deck.length) {
          deck = [];
          for (var ci = 0; ci < charmActions.length; ci++) deck.push(ci);
          for (var si = deck.length - 1; si > 0; si--) {
            var sj = Math.floor(Math.random() * (si + 1));
            var tmp = deck[si]; deck[si] = deck[sj]; deck[sj] = tmp;
          }
          if (deck.length > 1 && deck[deck.length - 1] === window.__AGY_MASCOT_LAST__) {
            var swapTmp = deck[0]; deck[0] = deck[deck.length - 1]; deck[deck.length - 1] = swapTmp;
          }
          window.__AGY_MASCOT_DECK__ = deck;
        }
        var idx = deck.pop();
        window.__AGY_MASCOT_LAST__ = idx;
        return charmActions[idx];
      }

      function spawnParticles(count, customIcons, originX, originY) {
        var icons = Array.isArray(customIcons) && customIcons.length ? customIcons : ['✨', '💖', '🌸', '💋', '🦋'];
        var ox = Number.isFinite(originX) ? originX : 50;
        var oy = Number.isFinite(originY) ? originY : 24;
        for (var i = 0; i < count; i++) {
          var pt = document.createElement('span');
          pt.textContent = icons[i % icons.length];
          var dx = Math.round((Math.random() - 0.5) * 116);
          var dy = -Math.round(42 + Math.random() * 68);
          var rot = Math.round((Math.random() - 0.5) * 44);
          pt.style.cssText =
            'position:absolute;left:' + ox + '%;top:' + oy + '%;font-size:' + (13 + (i % 3) * 2.5) + 'px;pointer-events:none;z-index:9600;' +
            '--dx:' + dx + 'px;--dy:' + dy + 'px;--rot:' + rot + 'deg;animation:agyParticlePop ' + (0.88 + (i % 3) * 0.16).toFixed(2) + 's cubic-bezier(0.22, 1, 0.36, 1) forwards;';
          box.appendChild(pt);
          (function(node) {
            setTimeout(function() { if (node.parentNode) node.remove(); }, 1350);
          })(pt);
        }
      }

      function showBubble(text) {
        var oldB = box.querySelector('.agy-mascot-bubble');
        if (oldB) oldB.remove();
        var b = document.createElement('div');
        b.className = 'agy-mascot-bubble';
        b.textContent = text;
        var rect = box.getBoundingClientRect();
        var alignRight = rect.left > window.innerWidth * 0.52;
        var placeBelow = rect.top < 86;
        b.style.cssText =
          'position:absolute;' + (placeBelow ? 'top:calc(100% + 10px);' : 'bottom:calc(100% + 10px);') + (alignRight ? 'right:0;' : 'left:0;') +
          'max-width:246px;width:max-content;padding:8px 13px;border-radius:14px;' +
          'font-family:' + uiFontFamily + ';' +
          'background:linear-gradient(155deg, rgba(24, 18, 40, 0.88), rgba(10, 12, 24, 0.90));backdrop-filter:blur(10px) saturate(150%);color:#ffffff;font-size:12px;font-weight:600;line-height:1.4;' +
          'border:1px solid rgba(255, 255, 255, 0.24);' +
          'box-shadow:inset 0 1px 1px rgba(255,255,255,0.28), 0 10px 28px rgba(0,0,0,0.52), 0 0 16px rgba(244, 114, 182, 0.24);' +
          'pointer-events:none;z-index:9610;animation:agyBubbleIn 0.26s cubic-bezier(0.22, 1, 0.36, 1);';
        box.appendChild(b);
        clearTimeout(box._bubbleTimer);
        box._bubbleTimer = setTimeout(function() {
          if (b.parentNode) b.remove();
        }, 3200);
      }

      function triggerAnim(animName, durMs, glowColor, showBlush) {
        var sp = box.querySelector('.agy-mascot-sprite');
        var bl = box.querySelector('.agy-mascot-blush');
        if (!sp) return;
        sp.style.animation = 'none';
        void sp.offsetWidth;
        sp.style.animation = animName + ' ' + durMs + 'ms cubic-bezier(0.22, 1, 0.36, 1)';
        if (glowColor) {
          box.style.filter = 'drop-shadow(0 8px 22px rgba(0,0,0,0.6)) drop-shadow(0 0 22px ' + glowColor + ')';
        }
        if (bl && showBlush) {
          bl.style.opacity = '1';
        }
        clearTimeout(box._animTimer);
        box._animTimer = setTimeout(function() {
          sp.style.animation = idleAnimCss;
          box.style.filter = dropFilter;
          if (bl) bl.style.opacity = '0';
        }, durMs + 60);
      }

      var dragState = { down: false, moved: false, startX: 0, startY: 0, origL: 0, origT: 0, lastX: 0, lastT: 0, tilt: 0 };

      // Organic eye-line gaze & subtle natural lean toward cursor on hover!
      box.addEventListener('pointermove', function(e) {
        if (!dragState.down) {
          var r = box.getBoundingClientRect();
          var nx = ((e.clientX - r.left) / Math.max(1, r.width) - 0.5) * 2;  // -1..1
          var ny = ((e.clientY - r.top) / Math.max(1, r.height) - 0.5) * 2;  // -1..1
          var leanZ = (nx * 4.2).toFixed(2);
          var tiltY = (nx * 11).toFixed(2);
          var tiltX = (-ny * 7).toFixed(2);
          var shiftX = (nx * 3.5).toFixed(2);
          phys.style.transition = 'transform 0.16s ease-out';
          phys.style.transform = 'translate3d(' + shiftX + 'px, -3px, 0) rotateY(' + tiltY + 'deg) rotateX(' + tiltX + 'deg) rotateZ(' + leanZ + 'deg) scale(1.045)';
          return;
        }
        var dx = e.clientX - dragState.startX;
        var dy = e.clientY - dragState.startY;
        if (!dragState.moved && Math.hypot(dx, dy) > 5) {
          dragState.moved = true;
          phys.style.transition = 'transform 0.08s linear';
        }
        if (dragState.moved) {
          var nextL = Math.max(6, Math.min(window.innerWidth - size - 6, Math.round(dragState.origL + dx)));
          var nextT = Math.max(36, Math.min(window.innerHeight - size - 6, Math.round(dragState.origT + dy)));
          box.style.left = nextL + 'px';
          box.style.top = nextT + 'px';
          box.style.right = 'auto';
          box.style.bottom = 'auto';
          // Natural inertial pendulum sway while carried!
          var vx = e.clientX - dragState.lastX;
          dragState.lastX = e.clientX;
          dragState.tilt = Math.max(-16, Math.min(16, dragState.tilt * 0.65 + vx * 0.55));
          phys.style.transform = 'translate3d(0, -6px, 0) rotateZ(' + dragState.tilt.toFixed(2) + 'deg) scale(1.06)';
        }
      }, { signal: ac.signal });

      box.addEventListener('pointerleave', function() {
        if (!dragState.down) {
          phys.style.transition = 'transform 0.36s cubic-bezier(0.22, 1, 0.36, 1)';
          phys.style.transform = 'none';
        }
      }, { signal: ac.signal });

      box.addEventListener('pointerdown', function(e) {
        if (e.button !== 0) return;
        e.preventDefault();
        e.stopPropagation();
        var rect = box.getBoundingClientRect();
        dragState.down = true;
        dragState.moved = false;
        dragState.startX = e.clientX;
        dragState.startY = e.clientY;
        dragState.lastX = e.clientX;
        dragState.tilt = 0;
        dragState.origL = rect.left;
        dragState.origT = rect.top;
        box.style.cursor = 'grabbing';
        phys.style.transition = 'transform 0.12s ease-out';
        phys.style.transform = 'scale(0.96, 1.03) translateY(2px)';
        try { box.setPointerCapture(e.pointerId); } catch (_) {}
      }, { signal: ac.signal });

      var finishPointer = function(e, cancelled) {
        if (!dragState.down) return;
        dragState.down = false;
        box.style.cursor = 'grab';
        try { box.releasePointerCapture(e.pointerId); } catch (_) {}
        phys.style.transition = 'transform 0.38s cubic-bezier(0.22, 1, 0.36, 1)';
        phys.style.transform = 'none';
        if (cancelled) return;

        var rect = box.getBoundingClientRect();
        if (dragState.moved) {
          savedPct = {
            xPct: rect.left / Math.max(1, window.innerWidth),
            yPct: rect.top / Math.max(1, window.innerHeight),
            preset: curPreset,
          };
          try { localStorage.setItem(savedPosKey, JSON.stringify(savedPct)); } catch (_) {}
          triggerAnim('agyMascotLandSoft', 520, 'rgba(' + neonRgb + ', 0.72)', false);
          spawnParticles(4, ['✨', '🌸', '💫'], 50, 70);
          showBubble('Đặt em ở đây nhìn mê quá đi~ ✨');
        } else {
          var relX = Math.max(10, Math.min(90, Math.round(((e.clientX - rect.left) / Math.max(1, rect.width)) * 100)));
          var relY = (e.clientY - rect.top) / Math.max(1, rect.height);
          var act = nextCharmAction(relY);
          triggerAnim(act.anim, act.dur, act.glow, act.blush);
          spawnParticles(7, act.icons, relX, Math.round(relY * 80));
          showBubble(act.quote);
        }
      };

      box.addEventListener('pointerup', function(e) { finishPointer(e, false); }, { signal: ac.signal });
      box.addEventListener('pointercancel', function(e) { finishPointer(e, true); }, { signal: ac.signal });

      box.addEventListener('dblclick', function(e) {
        e.preventDefault();
        e.stopPropagation();
        triggerAnim('agyMascotHumanEncore', 1240, 'rgba(244, 114, 182, 0.96)', true);
        spawnParticles(12, ['💋', '💖', '🦋', '✨', '🌸', '💎'], 50, 30);
        showBubble('Đặc quyền riêng cho Đại Đế nè~ Siêu năng lượng +100% 💋💖');
      }, { signal: ac.signal });
    });
  }

  function buildAndInjectCss() {
    return Promise.all([
      resolveCspSafeUrl(STATE.userAvatarUrl || ''),
      resolveCspSafeUrl(STATE.agentAvatarUrl || ''),
      resolveCspSafeUrl(STATE.appLogoUrl || ''),
    ]).then(function(res) {
      if (isStaleRun()) return;
      var userAvUrl = res[0];
      var agentAvUrl = res[1];
      var appLogoUrl = res[2];

      // Exact theme-matched WCO color (identical formula to electron/main.cjs) so native Windows WCO blends seamlessly!
      var ovParts = String(isLight ? '240, 244, 252' : overlayRgb).split(',').map(function(x) { return parseInt(x.trim(), 10) || 12; });
      var neParts = String(neonRgb).split(',').map(function(x) { return parseInt(x.trim(), 10) || 129; });
      var wcoMix = isLight ? 0.08 : 0.14;
      var wcoR = Math.round(ovParts[0] * (1 - wcoMix) + neParts[0] * wcoMix);
      var wcoG = Math.round(ovParts[1] * (1 - wcoMix) + neParts[1] * wcoMix);
      var wcoB = Math.round(ovParts[2] * (1 - wcoMix) + neParts[2] * wcoMix);
      var wcoRgbStr = wcoR + ', ' + wcoG + ', ' + wcoB;

      var appIconStyle = cfg.appIconStyle || 'glow';
      var activityBarStyle = cfg.activityBarStyle || 'colorful_glow';
      var tabsChromeStyle = cfg.tabsChromeStyle || 'floating_pills';
      var statusBarStyle = cfg.statusBarStyle || 'glass_pills';

      var subtleGlow = borderMode === 'neon'
        ? ('0 0 ' + Math.round(14 * glowFactor) + 'px rgba(' + neonRgb + ', ' + (0.20 * glowFactor).toFixed(2) + ')')
        : 'none';

      var bubbleBg = cfg.bubbleStyle === 'double_gold'
        ? 'linear-gradient(145deg, rgba(40, 28, 16, ' + Math.min(0.86, Math.max(0.36, chatBoxAlpha + 0.16)).toFixed(2) + '), rgba(22, 16, 12, ' + Math.min(0.90, Math.max(0.42, chatBoxAlpha + 0.22)).toFixed(2) + '))'
        : cfg.bubbleStyle === 'crystal'
        ? 'rgba(' + overlayRgb + ', ' + Math.min(0.84, Math.max(contrastMode === 'outline' ? 0.14 : 0.34, chatBoxAlpha + 0.22)).toFixed(2) + ')'
        : 'rgba(' + overlayRgb + ', ' + Math.min(0.88, Math.max(0.38, chatBoxAlpha + 0.24)).toFixed(2) + ')';

      var frameBg = borderMode === 'none'
        ? 'transparent'
        : cfg.bubbleStyle === 'double_gold'
        ? 'linear-gradient(135deg, rgba(251, 191, 36, 0.55), rgba(245, 158, 11, 0.28))'
        : borderMode === 'neon'
        ? 'linear-gradient(135deg, rgba(' + neonRgb + ', 0.45), rgba(' + neonSecRgb + ', 0.35))'
        : 'rgba(255, 255, 255, 0.14)';

      var composerFrame = borderMode === 'none'
        ? 'transparent'
        : cfg.composerStyle === 'double_gold'
        ? 'linear-gradient(135deg, rgba(251, 191, 36, 0.50), rgba(245, 158, 11, 0.24))'
        : borderMode === 'neon'
        ? 'linear-gradient(135deg, rgba(' + neonRgb + ', 0.42), rgba(' + neonSecRgb + ', 0.30))'
        : 'rgba(255, 255, 255, 0.16)';

      var composerBg = cfg.composerStyle === 'glass'
        ? 'linear-gradient(155deg, rgba(255, 255, 255, 0.08) 0%, rgba(' + overlayRgb + ', ' + Math.min(0.65, Math.max(0.08, chatBoxAlpha + 0.08)).toFixed(2) + ') 55%, rgba(255, 255, 255, 0.04) 100%)'
        : 'rgba(' + overlayRgb + ', ' + Math.min(0.74, Math.max(0.14, chatBoxAlpha + 0.14)).toFixed(2) + ')';

      /* True Clear Optical Liquid Glass tokens — ZERO milky white haze, crystal see-through with crisp specular bevels! */
      var lgClearBg = 'linear-gradient(155deg, rgba(255, 255, 255, 0.085) 0%, rgba(10, 14, 28, 0.04) 50%, rgba(255, 255, 255, 0.05) 100%)';
      var lgAccentBg = 'linear-gradient(155deg, rgba(' + neonRgb + ', 0.14) 0%, rgba(10, 14, 28, 0.04) 52%, rgba(' + neonSecRgb + ', 0.10) 100%)';
      var lgRimShadow = 'inset 0 1px 1px rgba(255, 255, 255, 0.36), inset 0 -1px 1px rgba(' + neonRgb + ', 0.22), 0 8px 24px rgba(0, 0, 0, 0.22)';
      var lgHoverShadow = 'inset 0 1px 2px rgba(255, 255, 255, 0.52), inset 0 -1px 2px rgba(' + neonSecRgb + ', 0.36), 0 10px 28px rgba(0, 0, 0, 0.30), 0 0 18px rgba(' + neonRgb + ', 0.28)';

      var avSize = Math.max(22, Math.min(54, Number(cfg.avatarSize) || 36));
      var avRadius = Math.max(0, Math.min(50, Number(cfg.avatarRadius !== undefined ? cfg.avatarRadius : 50)));

      var styleEl = document.getElementById('agy-studio-style');
      if (!styleEl) {
        styleEl = document.createElement('style');
        styleEl.id = 'agy-studio-style';
        document.head.appendChild(styleEl);
      }

      var rules = [
        /* Organic Live2D-inspired human-like breathing, physics landing, headpat & 10 interactive reactions */
        '@keyframes agyMascotHumanIdle { 0%,100% { transform: translateY(0px) scale(1, 1) rotate(0deg); } 30% { transform: translateY(-3px) scale(1.016, 0.992) rotate(0.9deg); } 65% { transform: translateY(-5px) scale(0.994, 1.015) rotate(-0.8deg); } }',
        '@keyframes agyMascotHumanBreathe { 0%,100% { transform: scale(1, 1) translateY(0px); } 45% { transform: scale(1.028, 0.982) translateY(1.5px); } 75% { transform: scale(0.995, 1.012) translateY(-1px); } }',
        '@keyframes agyMascotIdleBounce { 0%,100% { transform: translateY(0) scale(1, 1); } 42% { transform: translateY(-8px) scale(0.98, 1.03); } 70% { transform: translateY(2px) scale(1.03, 0.96); } }',
        '@keyframes agyMascotLandSoft { 0% { transform: translateY(-8px) scale(0.96, 1.05); } 36% { transform: translateY(4px) scale(1.07, 0.92); } 68% { transform: translateY(-2px) scale(0.99, 1.02); } 100% { transform: translateY(0) scale(1, 1); } }',
        '@keyframes agyMascotHeadpat { 0% { transform: scale(1, 1) rotate(0deg); } 22% { transform: translateY(5px) scale(1.06, 0.93) rotate(-5deg); } 48% { transform: translateY(3px) scale(1.04, 0.96) rotate(4.5deg); } 74% { transform: translateY(2px) scale(1.02, 0.98) rotate(-2.5deg); } 100% { transform: scale(1, 1) rotate(0deg); } }',
        '@keyframes agyMascotStepBackTease { 0% { transform: translate(0, 0) scale(1); } 18% { transform: translate(-8px, -11px) rotate(-9deg) scale(0.95, 1.07); } 45% { transform: translate(4px, 2px) rotate(5deg) scale(1.04, 0.96); } 72% { transform: translate(-3px, -2px) rotate(-3deg) scale(1.01); } 100% { transform: translate(0, 0) scale(1); } }',
        '@keyframes agyMascotHumanStartle { 0% { transform: scale(1, 1) translateY(0); } 16% { transform: scale(0.94, 1.08) translateY(-12px) rotate(-6deg); } 40% { transform: scale(1.06, 0.94) translateY(3px) rotate(4deg); } 66% { transform: scale(1.02, 1.01) translateY(-4px) rotate(-2deg); } 100% { transform: scale(1, 1) translateY(0); } }',
        '@keyframes agyMascotBlushLeanIn { 0% { transform: perspective(560px) scale(1) rotateX(0deg) rotate(0deg); } 30% { transform: perspective(560px) scale(1.13) translateY(-6px) rotateX(6deg) rotate(5deg); } 64% { transform: perspective(560px) scale(1.16) translateY(-8px) rotateX(8deg) rotate(-3.5deg); } 86% { transform: perspective(560px) scale(1.04) translateY(-2px) rotate(1.5deg); } 100% { transform: perspective(560px) scale(1) rotateX(0deg) rotate(0deg); } }',
        '@keyframes agyMascotBlowKissReal { 0% { transform: scale(1) rotate(0deg); } 22% { transform: translateY(3px) scale(1.03, 0.96) rotate(-4deg); } 50% { transform: translateY(-11px) scale(1.15, 1.12) rotate(5deg) skewX(-2deg); } 76% { transform: translateY(-5px) scale(1.06) rotate(-2deg); } 100% { transform: scale(1) rotate(0deg); } }',
        '@keyframes agyMascotPlayfulSway { 0% { transform: translateX(0) rotate(0deg) scale(1); } 24% { transform: translateX(-6px) rotate(-6.5deg) skewX(-2.5deg) scale(1.04, 0.98); } 54% { transform: translateX(7px) rotate(6.5deg) skewX(2.5deg) scale(1.07, 1.02) translateY(-5px); } 80% { transform: translateX(-3px) rotate(-2.5deg) scale(1.02); } 100% { transform: translateX(0) rotate(0deg) scale(1); } }',
        '@keyframes agyMascotShyDuck { 0% { transform: scale(1) rotate(0deg); } 20% { transform: translateY(6px) scale(1.05, 0.92) rotate(-6deg); } 46% { transform: translateY(4px) scale(1.02, 0.96) rotate(5deg); } 72% { transform: translateY(2px) scale(1.03, 0.97) rotate(-3deg); } 100% { transform: scale(1) rotate(0deg); } }',
        '@keyframes agyMascotHeartBeat { 0% { transform: scale(1); } 15% { transform: scale(1.10, 1.07) translateY(-5px) rotate(-2deg); } 30% { transform: scale(0.99, 1.01) translateY(0); } 50% { transform: scale(1.14, 1.10) translateY(-8px) rotate(3deg); } 70% { transform: scale(1.02, 0.98) translateY(1px); } 100% { transform: scale(1); } }',
        '@keyframes agyMascotGlanceTurn { 0% { transform: perspective(560px) rotateY(0deg) translateY(0) scale(1); } 32% { transform: perspective(560px) rotateY(34deg) translateY(-8px) rotateZ(-4deg) scale(1.07); } 65% { transform: perspective(560px) rotateY(-28deg) translateY(-10px) rotateZ(4deg) scale(1.09); } 86% { transform: perspective(560px) rotateY(8deg) translateY(-2px) scale(1.03); } 100% { transform: perspective(560px) rotateY(0deg) translateY(0) scale(1); } }',
        '@keyframes agyMascotWaltzReal { 0% { transform: translate(0, 0) rotate(0deg) scale(1); } 28% { transform: translate(-10px, -11px) rotate(-5.5deg) scale(1.05); } 62% { transform: translate(10px, -14px) rotate(6deg) scale(1.08); } 84% { transform: translate(-2px, -3px) rotate(-1.5deg) scale(1.02); } 100% { transform: translate(0, 0) rotate(0deg) scale(1); } }',
        '@keyframes agyMascotFlustered { 0%,100% { transform: translateX(0) rotate(0deg) scale(1); } 15% { transform: translateX(-5px) rotate(-6deg) scale(1.06, 0.96); } 30% { transform: translateX(5px) rotate(6deg) scale(1.06, 0.96); } 48% { transform: translateX(-4px) rotate(-5deg) translateY(-4px) scale(1.08); } 66% { transform: translateX(4px) rotate(4deg) translateY(-2px) scale(1.05); } 84% { transform: translateX(-2px) rotate(-2deg) scale(1.02); } }',
        '@keyframes agyMascotHumanEncore { 0% { transform: perspective(580px) rotateY(0deg) scale(1) translateY(0); } 26% { transform: perspective(580px) rotateY(180deg) scale(1.13) translateY(-14px) rotateZ(-4deg); } 62% { transform: perspective(580px) rotateY(360deg) scale(1.15) translateY(-11px) rotateZ(4deg); } 84% { transform: perspective(580px) rotateY(360deg) scale(1.04, 0.96) translateY(3px); } 100% { transform: perspective(580px) rotateY(360deg) scale(1) translateY(0); } }',
        '@keyframes agyParticlePop { 0% { opacity: 0; transform: translate(-50%, 4px) scale(0.45) rotate(0deg); } 18% { opacity: 1; } 100% { opacity: 0; transform: translate(calc(-50% + var(--dx)), var(--dy)) scale(1.25) rotate(var(--rot, 15deg)); } }',
        '@keyframes agyBubbleIn { 0% { opacity: 0; transform: translateY(7px) scale(0.90); } 100% { opacity: 1; transform: translateY(0) scale(1); } }',
        '#agy-studio-mascot:hover .agy-mascot-sprite { filter: brightness(1.07) saturate(1.08); }',
        '::-webkit-scrollbar { width: 7px !important; height: 7px !important; }',
        '::-webkit-scrollbar-track { background: transparent !important; }',
        '::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.16) !important; border-radius: 999px !important; }',
        '::-webkit-scrollbar-thumb:hover { background: rgba(' + neonRgb + ', 0.48) !important; }'
      ];

      if (targetKind === 'webview') {
        var wvCardAlpha = Math.min(0.56, Math.max(0.18, editorAlpha + 0.04)).toFixed(2);
        var wvCssRules = [
          ':root, html, body { background: transparent !important; background-color: transparent !important; background-image: none !important; font-family: ' + uiFontFamily + ' !important; --vscode-editor-background: transparent !important; --vscode-sideBar-background: transparent !important; --vscode-panel-background: transparent !important; --vscode-editorWidget-background: rgba(' + overlayRgb + ', 0.72) !important; --vscode-input-background: rgba(' + overlayRgb + ', 0.45) !important; }',
          'iframe, iframe#active-frame, iframe#jetski-frame { background: transparent !important; background-color: transparent !important; }',
          /* Make Antigravity Chat boot splash ("Google Antigravity for VS Code · Still connecting...") 100% transparent glass — ZERO black slab during startup! */
          '#loading-indicator, .loading-container, #error-state, .error-container { background: transparent !important; background-color: transparent !important; background-image: none !important; }',
          '.bg-background, .bg-sidebar, .bg-sidebar-background, .bg-editor-background, .bg-ide-editor-background { background: transparent !important; background-color: transparent !important; }',
          '.bg-card, .bg-muted, .bg-secondary { background: rgba(' + overlayRgb + ', ' + wvCardAlpha + ') !important; border: 1px solid rgba(255, 255, 255, 0.10) !important; border-radius: 10px !important; }',
          'body :is(h1, h2, h3, h4, p, li, label, span, a, td, th) { text-shadow: ' + crispTextHalo + ' !important; }',
          'pre, code { background: rgba(6, 10, 22, 0.64) !important; border-color: rgba(255, 255, 255, 0.12) !important; text-shadow: none !important; }'
        ];
        rules.push.apply(rules, wvCssRules);
        var wvFullCss = wvCssRules.join('\n');

        var injectIntoSameOriginChildFrames = function(rootDoc) {
          if (!rootDoc) return;
          var frames = rootDoc.querySelectorAll('iframe');
          for (var fi = 0; fi < frames.length; fi++) {
            (function(fr) {
              var patchFrame = function() {
                try {
                  var cdoc = fr.contentDocument;
                  if (!cdoc || !cdoc.head) return;
                  var cst = cdoc.getElementById('agy-studio-style');
                  if (!cst) {
                    cst = cdoc.createElement('style');
                    cst.id = 'agy-studio-style';
                    cdoc.head.appendChild(cst);
                  }
                  if (cst.textContent !== wvFullCss) cst.textContent = wvFullCss;
                  injectIntoSameOriginChildFrames(cdoc);
                } catch (_) {}
              };
              patchFrame();
              fr.addEventListener('load', patchFrame, { signal: ac.signal });
            })(frames[fi]);
          }
        };
        injectIntoSameOriginChildFrames(document);
        var wvMo = new MutationObserver(function() { injectIntoSameOriginChildFrames(document); });
        if (document.body) wvMo.observe(document.body, { childList: true, subtree: true });
        window.__AGY_STUDIO_MO__ = wvMo;
      }

      if (targetKind === 'chat') {
        var subCardAlpha = Math.min(0.88, Math.max(0.08, settingsAlpha)).toFixed(2);
        var subSideAlpha = Math.min(0.82, Math.max(0.04, settingsAlpha * 0.65)).toFixed(2);
        rules.push(
          'html, body, #root, .agy-shell { font-family: ' + uiFontFamily + ' !important; background: transparent !important; background-color: transparent !important; background-image: none !important; color-scheme: normal !important; -webkit-font-smoothing: antialiased !important; text-rendering: optimizeLegibility !important; }',
          /* Universal crystal glass for standalone embedded views (Antigravity Settings /settings-standalone, Onboarding, Models, Browser, Account, etc. — NO .agy-shell wrapper!) */
          'body.theme-standalone, body.theme-standalone #root, body.theme-standalone .bg-background, body.theme-standalone .bg-editor-background, body.theme-standalone .bg-ide-editor-background { background: transparent !important; background-color: transparent !important; background-image: none !important; }',
          'body:not(:has(.agy-shell)) .bg-sidebar, body:not(:has(.agy-shell)) .bg-sidebar-background, body:not(:has(.agy-shell)) aside { background: rgba(' + overlayRgb + ', ' + subSideAlpha + ') !important; background-color: rgba(' + overlayRgb + ', ' + subSideAlpha + ') !important; backdrop-filter: ' + panelBackdropCss + ' !important; border-right: 1px solid rgba(255, 255, 255, 0.08) !important; }',
          'body:not(:has(.agy-shell)) .bg-card, body:not(:has(.agy-shell)) .bg-muted { background: rgba(' + overlayRgb + ', ' + subCardAlpha + ') !important; background-color: rgba(' + overlayRgb + ', ' + subCardAlpha + ') !important; backdrop-filter: ' + panelBackdropCss + ' !important; border: 1px solid rgba(255, 255, 255, 0.10) !important; }',
          'body:not(:has(.agy-shell)) .bg-secondary, body:not(:has(.agy-shell)) button.bg-secondary { background: rgba(' + overlayRgb + ', ' + Math.min(0.88, settingsAlpha + 0.14).toFixed(2) + ') !important; border: 1px solid rgba(255, 255, 255, 0.14) !important; color: ' + txtStrong + ' !important; }',
          'body:not(:has(.agy-shell)) :is(h1, h2, h3, h4, p, span, label, a, li, button) { text-shadow: ' + crispTextHalo + ' !important; }',
          'body:not(:has(.agy-shell)) .text-muted-foreground, body:not(:has(.agy-shell)) .text-secondary-foreground { color: ' + (isLight ? '#334155' : '#dce8f9') + ' !important; text-shadow: ' + crispTextHalo + ' !important; }',
          'body:not(:has(.agy-shell)) .text-foreground { color: ' + txtStrong + ' !important; text-shadow: ' + crispTextHalo + ' !important; }',
          '.agy-shell > *:not(#agy-studio-bg-layer) { position: relative !important; z-index: 2 !important; }',
          /* Global crisp readability across ALL Chat UI elements — fixes faint grey timestamps (6h ago), Working, icons, and labels over bright moonlight! */
          '.agy-shell .text-muted-foreground, .agy-shell .text-secondary-foreground { color: ' + (isLight ? '#334155' : '#dce8f9') + ' !important; font-weight: 500 !important; text-shadow: ' + crispTextHalo + ' !important; }',
          '.agy-shell .text-foreground, .agy-shell time, .agy-shell small { color: ' + txtStrong + ' !important; text-shadow: ' + crispTextHalo + ' !important; }',
          '.agy-shell svg { filter: ' + (isLight ? 'none' : 'drop-shadow(0 1px 2px rgba(0, 0, 0, 0.92))') + ' !important; }',
          /* Smooth top & bottom alpha mask on Chat scroll viewport — ZERO text collision under header & ZERO #181818 black fade bar! */
          '.agy-shell .overflow-y-auto { will-change: scroll-position; -webkit-mask-image: linear-gradient(to bottom, transparent 0px, #000 18px, #000 calc(100% - 14px), transparent 100%) !important; mask-image: linear-gradient(to bottom, transparent 0px, #000 18px, #000 calc(100% - 14px), transparent 100%) !important; }',
          '.agy-sheet, .agy-inset-shell, .browser-hole-opaque, [data-main-content-body="true"], [data-side-panel-body="true"], [class*="agy-inset-shell"], [class*="--shell-canvas"], .agy-shell .bg-background { background: transparent !important; background-color: transparent !important; background-image: none !important; }',
          /* Crystal translucent glass for VISIBLE Chat Settings modal & Radix dialogs ONLY — NEVER bleed shadow from closed off-screen left/right slide drawers! */
          '.agy-shell .settings-modal-container, .agy-shell [role="dialog"]:not(.surface-opaque):not(.pointer-events-none):not([aria-hidden="true"]):not([data-state="closed"]), [data-radix-popper-content-wrapper] [role="dialog"] { background: rgba(' + overlayRgb + ', ' + Math.min(0.88, Math.max(0.18, settingsAlpha + 0.12)).toFixed(2) + ') !important; backdrop-filter: ' + panelBackdropCss + ' !important; border: 1px solid rgba(255, 255, 255, 0.14) !important; border-radius: 14px !important; box-shadow: 0 18px 50px rgba(0, 0, 0, 0.58) !important; }',
          /* KILL the 50px vertical dark shadow bar bleeding along the left edge of Chat from the collapsed off-screen sidebar drawer! */
          '.agy-shell .surface-opaque.pointer-events-none, .agy-shell [role="dialog"].pointer-events-none, .agy-shell .surface-opaque[aria-hidden="true"], .agy-shell .surface-opaque[class*="-translate-x"], .agy-shell .surface-opaque[class*="translate-x-full"] { box-shadow: none !important; border: none !important; border-color: transparent !important; }',
          '.agy-shell .surface-opaque:not(.pointer-events-none) { background: rgba(' + overlayRgb + ', ' + Math.min(0.86, Math.max(0.24, settingsAlpha + 0.16)).toFixed(2) + ') !important; backdrop-filter: blur(14px) saturate(140%) !important; }',
          '.agy-shell .settings-modal-container .bg-background, .agy-shell .settings-modal-container .bg-sidebar, .agy-shell .settings-modal-container .bg-sidebar-background { background: transparent !important; }',
          '.agy-shell .settings-modal-container .bg-card, .agy-shell .settings-modal-container .bg-muted { background: rgba(' + overlayRgb + ', 0.34) !important; border: 1px solid rgba(255, 255, 255, 0.10) !important; border-radius: 10px !important; }',
          /* KILL hidden #181818 top/bottom scroll gradient fade bars right above Composer & below Chat Header! */
          '.agy-shell div.pointer-events-none.absolute[class*="bottom-0"], .agy-shell div.pointer-events-none.absolute[class*="top-0"] { background: transparent !important; background-color: transparent !important; background-image: none !important; }',
          'body[data-has-browser-hole="true"] .agy-shell[data-agy-studio-hole="1"] #agy-studio-bg-layer { clip-path: var(--agy-studio-hole-clip, none) !important; }',

          '.agy-shell aside, .agy-shell [data-sidebar="true"], .agy-shell .bg-sidebar:not(.surface-opaque) { background: rgba(' + overlayRgb + ', ' + sidebarAlpha.toFixed(2) + ') !important; border-right: 1px solid ' + chromeBorder + ' !important; backdrop-filter: none !important; }',
          '.agy-shell .bg-sidebar:not(.surface-opaque) .bg-sidebar:not(.surface-opaque), .agy-shell [data-sidebar="true"] .bg-sidebar:not(.surface-opaque) { background: transparent !important; border: none !important; }',
          /* Ultra-clean 100% seamless Chat Titlebar — ZERO horizontal dark strip & ZERO border line! */
          '.agy-shell [class*="@container/titlebar"] { background: ' + (sidebarAlpha > 0.02 ? ('rgba(' + overlayRgb + ', ' + sidebarAlpha.toFixed(2) + ')') : 'transparent') + ' !important; background-image: none !important; border-bottom: ' + (borderMode === 'none' ? 'none' : ('1px solid ' + chromeBorder)) + ' !important; backdrop-filter: none !important; }',
          '.agy-shell [class*="@container/titlebar"] [data-testid="breadcrumb-segment"], .agy-shell [class*="@container/titlebar"] span, .agy-shell [class*="@container/titlebar"] button { font-family: ' + uiFontFamily + ' !important; font-weight: 650 !important; color: ' + txtStrong + ' !important; text-shadow: ' + crispTextHalo + ' !important; }',
          '.agy-shell .bg-sidebar a:hover, .agy-shell .bg-sidebar [class*="group/headerbtn"]:hover { background: rgba(255, 255, 255, 0.08) !important; }',

          /* Crystal-Sheer Agent Response synced seamlessly with Center wallpaper + Subtitle-Grade Razor-Sharp Text Contour! */
          '.agy-shell [data-testid="agent-response"] { background: ' + (chatBoxAlpha <= 0.01 ? 'transparent' : ('rgba(' + overlayRgb + ', ' + chatBoxAlpha.toFixed(2) + ')')) + ' !important; border: ' + (chatBoxAlpha <= 0.14 || borderMode === 'none' ? 'none' : ('1px solid ' + cardBorder)) + ' !important; border-radius: ' + cornerRad + 'px !important; padding: ' + (chatBoxAlpha <= 0.01 ? '6px 4px' : '11px 15px') + ' !important; box-shadow: ' + (chatBoxAlpha <= 0.01 ? 'none' : subtleGlow) + ' !important; backdrop-filter: none !important; color: ' + txtStrong + ' !important; font-size: ' + chatFontSize + 'px !important; font-weight: ' + chatBodyWeight + ' !important; line-height: 1.66 !important; letter-spacing: 0.008em !important; font-family: ' + uiFontFamily + ' !important; text-shadow: ' + crispTextHalo + ' !important; }',
          /* Crystal Clear Liquid Glass Review / Secondary pills (ZERO milky fog!) */
          '.agy-shell button.bg-secondary, .agy-shell .bg-secondary, .agy-shell .bg-muted:not(.surface-composer-card) { background: ' + lgClearBg + ' !important; backdrop-filter: blur(4px) saturate(160%) !important; border: 1px solid rgba(255, 255, 255, 0.22) !important; box-shadow: ' + lgRimShadow + ' !important; border-radius: 10px !important; color: ' + txtStrong + ' !important; font-weight: 600 !important; text-shadow: ' + crispTextHalo + ' !important; }',
          '.agy-shell button.bg-secondary:hover, .agy-shell .bg-secondary:hover { background: ' + lgAccentBg + ' !important; border-color: rgba(' + neonRgb + ', 0.52) !important; box-shadow: ' + lgHoverShadow + ' !important; }',
          '.agy-shell [data-testid="agent-response"] :is(p, li, ol, ul, td, th, blockquote, span, em, i) { color: ' + txtBody + ' !important; font-weight: ' + chatBodyWeight + ' !important; text-shadow: ' + crispTextHalo + ' !important; }',
          '.agy-shell [data-testid="agent-response"] :is(h1, h2, h3, h4, strong, b) { color: #ffffff !important; font-weight: 700 !important; text-shadow: ' + crispTextHalo + ' !important; }',
          '.agy-shell [data-testid="agent-response"] :is(.text-muted-foreground, .text-secondary-foreground, time, small) { color: ' + (isLight ? '#334155' : '#dce8f9') + ' !important; font-weight: 500 !important; text-shadow: ' + crispTextHalo + ' !important; }',
          '.agy-shell [data-testid="agent-response"] a { color: ' + txtLink + ' !important; font-weight: 600 !important; text-decoration-color: rgba(125, 211, 252, 0.55) !important; text-shadow: ' + crispTextHalo + ' !important; }',
          '.agy-shell [data-testid="agent-response"] a:hover { color: #ffffff !important; }',
          '.agy-shell [data-testid="agent-response"] :not(pre) > code { font-family: "JetBrains Mono", "Cascadia Code", Consolas, monospace !important; background: rgba(6, 10, 22, 0.66) !important; color: ' + txtCode + ' !important; border: 1px solid ' + codeBorder + ' !important; border-radius: 6px !important; padding: 1.5px 6px !important; font-weight: 600 !important; text-shadow: none !important; }',
          '.agy-shell [data-testid="agent-response"] pre { font-family: "JetBrains Mono", "Cascadia Code", Consolas, monospace !important; background: rgba(6, 10, 22, 0.74) !important; border: 1px solid ' + chromeBorder + ' !important; border-radius: 10px !important; text-shadow: none !important; }',

          'body:not([data-has-browser-hole="true"]) .agy-shell [data-side-panel-body="true"]:not([data-has-browser-hole="true"]):not(:has([data-browser-hole]:not([data-browser-hole="false"]))) { background: rgba(' + overlayRgb + ', ' + Math.min(0.72, chatBoxAlpha + 0.08).toFixed(2) + ') !important; border-left: 1px solid ' + chromeBorder + ' !important; backdrop-filter: none !important; }',

          '.agy-user-bubble-frame { background: transparent !important; border-radius: ' + cornerRad + 'px !important; padding: 0 !important; box-shadow: none !important; }',
          '.agy-user-bubble { background: ' + lgClearBg + ' !important; backdrop-filter: blur(4px) saturate(160%) !important; border: 1px solid rgba(255, 255, 255, 0.22) !important; box-shadow: ' + lgRimShadow + ' !important; border-radius: ' + Math.max(8, cornerRad) + 'px !important; color: #ffffff !important; font-size: ' + chatFontSize + 'px !important; font-weight: 550 !important; text-shadow: ' + crispTextHalo + ' !important; }',
          '.agy-user-bubble * { color: #ffffff !important; font-weight: 550 !important; text-shadow: ' + crispTextHalo + ' !important; }',

          '.surface-composer { background: transparent !important; border-radius: ' + (cornerRad + 2) + 'px !important; padding: 0 !important; box-shadow: none !important; transition: box-shadow 0.2s ease !important; }',
          '.surface-composer-card { background: ' + composerBg + ' !important; backdrop-filter: blur(5px) saturate(165%) brightness(1.04) !important; border-radius: ' + cornerRad + 'px !important; border: 1px solid rgba(255, 255, 255, 0.24) !important; box-shadow: ' + lgRimShadow + ' !important; transition: border-color 0.2s ease, box-shadow 0.2s ease !important; }',
          '.surface-composer:focus-within .surface-composer-card { border-color: rgba(' + neonRgb + ', 0.56) !important; box-shadow: ' + lgHoverShadow + ' !important; }',
          '.surface-composer textarea, .surface-composer [contenteditable], .surface-composer button, .surface-composer span { color: #ffffff !important; font-family: ' + uiFontFamily + ' !important; font-weight: 500 !important; text-shadow: ' + crispTextHalo + ' !important; }',
          /* Crisp Composer Placeholder ("Ask anything, @ to mention, / for actions") */
          '.surface-composer p.pointer-events-none { color: #e2ecff !important; opacity: 0.88 !important; font-weight: 500 !important; text-shadow: ' + crispTextHalo + ' !important; }',
          '.surface-composer [data-testid="project-selector-trigger"], .surface-composer [data-testid="branch-pill-trigger"], .surface-composer [aria-label="Select Environment"] { background: rgba(' + overlayRgb + ', 0.48) !important; color: #ffffff !important; border: 1px solid rgba(255, 255, 255, 0.18) !important; border-radius: 9999px !important; font-weight: 600 !important; }',
          '.agy-button-custom.border.border-border { background: rgba(' + overlayRgb + ', 0.38) !important; border-color: rgba(255, 255, 255, 0.18) !important; color: #ffffff !important; text-shadow: ' + crispTextHalo + ' !important; }',
          '.agy-shell [role="menu"], [data-radix-popper-content-wrapper] [role="menu"], .agy-overlay.surface-glass, .agy-shell .agy-overlay.bg-card { background: rgba(' + overlayRgb + ', 0.82) !important; background-color: rgba(' + overlayRgb + ', 0.82) !important; backdrop-filter: blur(18px) saturate(135%) !important; border: 1px solid rgba(255, 255, 255, 0.16) !important; border-radius: 12px !important; box-shadow: 0 14px 36px rgba(0,0,0,0.58) !important; }',
          '[data-agy-studio-welcome="1"] { color: #ffffff !important; text-shadow: ' + crispTextHalo + ' !important; }'
        );

        if (userAvUrl) {
          rules.push(
            '.agy-shell [data-testid="user-message"] { position: relative !important; padding-right: ' + (avSize + 10) + 'px !important; }',
            '.agy-shell [data-testid="user-message"]::after { content: ""; position: absolute; right: 0; bottom: 6px; width: ' + avSize + 'px; height: ' + avSize + 'px; border-radius: ' + avRadius + '%; background-image: url("' + userAvUrl + '"); background-size: cover; background-position: center; border: 1.5px solid rgba(255,255,255,0.35); box-shadow: 0 3px 12px rgba(0,0,0,0.4); pointer-events: none; }'
          );
        }
        if (agentAvUrl) {
          rules.push(
            '.agy-shell [data-testid="agent-response"] { position: relative !important; padding-left: ' + (avSize + 20) + 'px !important; min-height: ' + (avSize + 18) + 'px !important; }',
            '.agy-shell [data-testid="agent-response"]::before { content: ""; position: absolute; top: 14px; left: 14px; width: ' + avSize + 'px; height: ' + avSize + 'px; border-radius: ' + avRadius + '%; background-image: url("' + agentAvUrl + '"); background-size: cover; background-position: center; border: 1.5px solid rgba(255,255,255,0.3); box-shadow: 0 3px 12px rgba(0,0,0,0.4); pointer-events: none; }'
          );
        }
      }

      if (targetKind === 'ide') {
        var titlebarTopAlpha = Math.min(0.75, sidebarAlpha + 0.08).toFixed(2);
        var titlebarBotAlpha = Math.max(0, sidebarAlpha).toFixed(2);
        var surfaceCardAlpha = Math.min(0.86, Math.max(0.08, settingsAlpha)).toFixed(2);
        var popupGlassAlpha = Math.min(0.90, Math.max(0.55, settingsAlpha + 0.36)).toFixed(2);

        rules.push(
          /* ====== GLOBAL --vscode-* SURFACE VARIABLES (MAKES EVERY BUILT-IN SCREEN TRANSPARENT AUTOMATICALLY!) ====== */
          ':root, .monaco-workbench {' +
            '--vscode-editor-background: transparent !important;' +
            '--vscode-sideBar-background: transparent !important;' +
            '--vscode-sideBarSectionHeader-background: transparent !important;' +
            '--vscode-panel-background: transparent !important;' +
            '--vscode-terminal-background: transparent !important;' +
            '--vscode-editorPane-background: transparent !important;' +
            '--vscode-editorGroup-emptyBackground: transparent !important;' +
            '--vscode-editorGroupHeader-tabsBackground: transparent !important;' +
            '--vscode-editorGroupHeader-noTabsBackground: transparent !important;' +
            '--vscode-tab-activeBackground: transparent !important;' +
            '--vscode-tab-inactiveBackground: transparent !important;' +
            '--vscode-breadcrumb-background: transparent !important;' +
            '--vscode-editorGutter-background: transparent !important;' +
            '--vscode-activityBar-background: transparent !important;' +
            '--vscode-statusBar-background: transparent !important;' +
            '--vscode-titleBar-activeBackground: transparent !important;' +
            '--vscode-titleBar-inactiveBackground: transparent !important;' +
            '--vscode-welcomePage-background: transparent !important;' +
            '--vscode-welcomePage-tileBackground: rgba(' + overlayRgb + ', ' + surfaceCardAlpha + ') !important;' +
            '--vscode-welcomePage-tileHoverBackground: rgba(' + neonRgb + ', 0.20) !important;' +
            '--vscode-notebook-editorBackground: transparent !important;' +
            '--vscode-notebook-cellEditorBackground: rgba(' + overlayRgb + ', ' + surfaceCardAlpha + ') !important;' +
            '--vscode-settings-focusedRowBackground: rgba(' + neonRgb + ', 0.14) !important;' +
            '--vscode-settings-rowHoverBackground: rgba(255, 255, 255, 0.06) !important;' +
            '--vscode-settings-textInputBackground: rgba(' + overlayRgb + ', 0.44) !important;' +
            '--vscode-settings-numberInputBackground: rgba(' + overlayRgb + ', 0.44) !important;' +
            '--vscode-settings-dropdownBackground: rgba(' + overlayRgb + ', 0.56) !important;' +
            '--vscode-settings-checkboxBackground: rgba(' + overlayRgb + ', 0.44) !important;' +
            '--vscode-settings-textInputBorder: rgba(255, 255, 255, 0.16) !important;' +
            '--vscode-settings-numberInputBorder: rgba(255, 255, 255, 0.16) !important;' +
            '--vscode-settings-dropdownBorder: rgba(255, 255, 255, 0.16) !important;' +
            '--vscode-input-background: rgba(' + overlayRgb + ', 0.44) !important;' +
            '--vscode-dropdown-background: rgba(' + overlayRgb + ', 0.72) !important;' +
            '--vscode-editorWidget-background: rgba(' + overlayRgb + ', ' + popupGlassAlpha + ') !important;' +
            '--vscode-quickInput-background: rgba(' + overlayRgb + ', ' + popupGlassAlpha + ') !important;' +
            '--vscode-notifications-background: rgba(' + overlayRgb + ', ' + popupGlassAlpha + ') !important;' +
            '--vscode-menu-background: rgba(' + overlayRgb + ', 0.86) !important;' +
            '--vscode-list-hoverBackground: rgba(255, 255, 255, 0.07) !important;' +
            '--vscode-list-activeSelectionBackground: rgba(' + neonRgb + ', 0.20) !important;' +
            '--vscode-list-inactiveSelectionBackground: rgba(' + neonRgb + ', 0.12) !important;' +
            '--vscode-focusBorder: transparent !important;' +
            '--vscode-contrastBorder: transparent !important;' +
            '--vscode-contrastActiveBorder: transparent !important;' +
            '--vscode-list-focusOutline: transparent !important;' +
            '--vscode-list-focusAndSelectionOutline: transparent !important;' +
          '}',
          /* KILL harsh VS Code blue focus wireframe outline around Explorer / Sidebar panes! */
          '.monaco-workbench .part.sidebar :focus, .monaco-workbench .part.activitybar :focus, .monaco-workbench .monaco-pane-view .pane :focus, .monaco-workbench .monaco-list:focus, .monaco-workbench .pane-body:focus { outline: none !important; outline-color: transparent !important; box-shadow: none !important; }',
          /* Global sleek UI font across Workbench chrome — ALWAYS protect Codicon icon font so NO tofu glyph ever appears! */
          '.monaco-workbench { background: transparent !important; background-color: transparent !important; color: ' + txtBody + ' !important; font-family: ' + uiFontFamily + ' !important; }',
          '.monaco-workbench .codicon, .monaco-workbench [class*="codicon-"] { font-family: codicon !important; }',
          '.monaco-workbench > *:not(#agy-studio-bg-layer) { z-index: 2; }',

          /* ====== ALL BUILT-IN ANTIGRAVITY & VS CODE VIEWS: SETTINGS, ACCOUNT, MODELS, PLUGINS, EXTENSIONS, KEYBINDINGS, ONBOARDING, TERMINAL, POPUPS! ====== */
          /* 1. Antigravity Settings / Account / Models / Browser / Conversations / Customizations (Tailwind surfaces in workbench.desktop.main.css!) */
          '.monaco-workbench .bg-background, .monaco-workbench .bg-sidebar-background, .monaco-workbench .bg-editor-background, .monaco-workbench .bg-ide-editor-background { background: transparent !important; background-color: transparent !important; }',
          '.monaco-workbench .bg-card, .monaco-workbench .bg-muted { background: rgba(' + overlayRgb + ', ' + surfaceCardAlpha + ') !important; background-color: rgba(' + overlayRgb + ', ' + surfaceCardAlpha + ') !important; border: 1px solid rgba(255, 255, 255, 0.10) !important; border-radius: 10px !important; }',
          '.monaco-workbench .bg-secondary { background: rgba(' + overlayRgb + ', 0.34) !important; background-color: rgba(' + overlayRgb + ', 0.34) !important; border: 1px solid rgba(255, 255, 255, 0.14) !important; }',
          '.monaco-workbench .bg-editorWidget-background { background: rgba(' + overlayRgb + ', 0.52) !important; background-color: rgba(' + overlayRgb + ', 0.52) !important; border: 1px solid rgba(255, 255, 255, 0.10) !important; }',
          '.monaco-workbench .editor-instance :is(h1, h2, h3, h4, p, label, span, a, dt, dd, li) { text-shadow: ' + crispTextHalo + ' !important; }',
          '.monaco-workbench .editor-instance .text-muted-foreground, .monaco-workbench .editor-instance .text-secondary-foreground { color: ' + (isLight ? '#334155' : '#d2e0f5') + ' !important; text-shadow: ' + crispTextHalo + ' !important; }',

          /* 2. VS Code Native Settings, Keybindings, Extensions Marketplace, Getting Started / Onboarding, Notebooks, Search & Diff Editors */
          '.monaco-workbench .settings-editor, .monaco-workbench .settings-editor > .settings-header, .monaco-workbench .settings-editor > .settings-body, .monaco-workbench .settings-editor .settings-toc-wrapper, .monaco-workbench .settings-editor .settings-tree-container, .monaco-workbench .settings-editor .monaco-list, .monaco-workbench .settings-editor .monaco-list-rows, .monaco-workbench .settings-editor .monaco-scrollable-element, .monaco-workbench .settings-editor .setting-item-contents,' +
          '.monaco-workbench .keybindings-editor, .monaco-workbench .keybindings-editor > .keybindings-header, .monaco-workbench .keybindings-editor > .keybindings-body, .monaco-workbench .keybindings-editor .monaco-table, .monaco-workbench .keybindings-editor .monaco-list, .monaco-workbench .keybindings-editor .monaco-list-rows,' +
          '.monaco-workbench .extension-editor, .monaco-workbench .extension-editor > .header, .monaco-workbench .extension-editor > .body, .monaco-workbench .extension-editor .navbar, .monaco-workbench .extension-editor .content, .monaco-workbench .extensions-list, .monaco-workbench .extension-list-item,' +
          '.monaco-workbench .gettingStartedContainer, .monaco-workbench .gettingStartedContainer .gettingStarted, .monaco-workbench .gettingStartedContainer .gettingStartedSlideCategories, .monaco-workbench .gettingStartedContainer .gettingStartedSlideDetails, .monaco-workbench .antigravity-onboarding-checklist-container,' +
          '.monaco-workbench .notebook-editor, .monaco-workbench .notebookOverlay, .monaco-workbench .cell-list-container, .monaco-workbench .search-editor, .monaco-workbench .monaco-diff-editor, .monaco-workbench .monaco-diff-editor .editor { background: transparent !important; background-color: transparent !important; }',
          '.monaco-workbench .gettingStartedContainer .getting-started-category, .monaco-workbench .gettingStartedContainer .button-link, .monaco-workbench .antigravity-onboarding-item { background: rgba(' + overlayRgb + ', ' + surfaceCardAlpha + ') !important; border: 1px solid rgba(255, 255, 255, 0.10) !important; border-radius: 10px !important; }',
          '.monaco-workbench .settings-editor .setting-item-contents.focused, .monaco-workbench .settings-editor .setting-item-contents:hover { background: rgba(' + overlayRgb + ', 0.28) !important; border-radius: 8px !important; }',
          '.monaco-workbench .settings-editor .monaco-select-box, .monaco-workbench .settings-editor .monaco-inputbox, .monaco-workbench .settings-editor .monaco-custom-toggle { background: rgba(' + overlayRgb + ', 0.44) !important; border: 1px solid rgba(255, 255, 255, 0.16) !important; border-radius: 7px !important; }',

          /* 3. Integrated Terminal, Output, Problems & Debug Console (Bottom Panel — 100% crystal transparent over video!) */
          '.monaco-workbench .part.panel .composite.title, .monaco-workbench .part.panel .pane, .monaco-workbench .part.panel .pane-body, .monaco-workbench .part.panel .split-view-view, .monaco-workbench .part.panel .monaco-split-view2, .monaco-workbench .part.panel .terminal-groups-container, .monaco-workbench .part.panel .terminal-split-pane, .monaco-workbench .part.panel .terminal-outer-container, .monaco-workbench .part.panel .terminal-wrapper, .monaco-workbench .part.panel .terminal, .monaco-workbench .part.panel .xterm, .monaco-workbench .part.panel .xterm-viewport, .monaco-workbench .part.panel .xterm-screen, .monaco-workbench .part.panel .xterm-rows, .monaco-workbench .part.panel .xterm-helper-textarea, .monaco-workbench .part.panel canvas.xterm-link-layer, .monaco-workbench .part.panel .monaco-list, .monaco-workbench .part.panel .monaco-list-rows, .monaco-workbench .part.panel .monaco-editor, .monaco-workbench .part.panel .monaco-editor-background, .monaco-workbench .part.panel .markers-panel-container, .monaco-workbench .part.panel .repl { background: transparent !important; background-color: transparent !important; }',
          '.monaco-workbench .part.panel .xterm-rows span { text-shadow: ' + crispTextHalo + ' !important; }',

          /* 4. Elevated Smoked Crystal Glass for Command Palette, Dialogs, Notifications, Hover, Suggest & Find Widgets */
          '.monaco-workbench .quick-input-widget { background: rgba(' + overlayRgb + ', ' + Math.max(0.76, Number(popupGlassAlpha)).toFixed(2) + ') !important; backdrop-filter: blur(18px) saturate(130%) !important; border: 1px solid rgba(255, 255, 255, 0.16) !important; border-radius: 12px !important; box-shadow: 0 22px 60px rgba(0, 0, 0, 0.65) !important; }',
          '.monaco-workbench .quick-input-list .monaco-list, .monaco-workbench .quick-input-list .monaco-list-rows { background: transparent !important; }',
          '.monaco-workbench .monaco-dialog-box, .monaco-workbench .notifications-toasts .notification-toast, .monaco-workbench .notifications-center, .monaco-workbench .monaco-hover, .monaco-workbench .suggest-widget, .monaco-workbench .find-widget, .monaco-workbench .editor-widget.find-widget { background: rgba(' + overlayRgb + ', ' + Math.min(0.78, Math.max(0.58, settingsAlpha + 0.36)).toFixed(2) + ') !important; backdrop-filter: blur(18px) saturate(135%) !important; border: 1px solid rgba(255, 255, 255, 0.16) !important; border-radius: 12px !important; box-shadow: 0 14px 40px rgba(0, 0, 0, 0.56) !important; }',
          /* Transparent inner rows on VS Code Notification Toasts so they never paint opaque #252526 over the glass toast! */
          '.monaco-workbench .notifications-toasts .notification-toast .notifications-list-container, .monaco-workbench .notifications-toasts .notification-toast .monaco-list, .monaco-workbench .notifications-toasts .notification-toast .monaco-list-rows, .monaco-workbench .notifications-toasts .notification-toast .monaco-list-row, .monaco-workbench .notifications-toasts .notification-toast .notification-list-item, .monaco-workbench .notifications-center .monaco-list, .monaco-workbench .notifications-center .monaco-list-rows, .monaco-workbench .notifications-center .monaco-list-row, .monaco-workbench .notifications-center .notifications-center-header { background: transparent !important; background-color: transparent !important; }',

          /* ====== CRYSTAL SEAMLESS TOP TITLEBAR — 100% INVISIBLE BAR WHEN SIDEBAR OPACITY IS 0%! ====== */
          '.monaco-workbench .part.titlebar { background: ' + (sidebarAlpha <= 0.01 ? 'transparent' : ('linear-gradient(180deg, rgba(' + overlayRgb + ', ' + Math.min(0.75, sidebarAlpha + 0.03).toFixed(2) + '), rgba(' + overlayRgb + ', ' + sidebarAlpha.toFixed(2) + '))')) + ' !important; background-image: ' + (sidebarAlpha <= 0.01 ? 'none' : ('linear-gradient(180deg, rgba(' + overlayRgb + ', ' + Math.min(0.75, sidebarAlpha + 0.03).toFixed(2) + '), rgba(' + overlayRgb + ', ' + sidebarAlpha.toFixed(2) + '))')) + ' !important; border-bottom: ' + (sidebarAlpha <= 0.01 || borderMode === 'none' ? 'none' : ('1px solid ' + chromeBorder)) + ' !important; box-shadow: none !important; }',
          '.monaco-workbench .part.titlebar .titlebar-right .action-item.menu-entry { background: transparent !important; }',
          /* When custom window controls (window.controlsStyle: "custom") are active: 100% transparent glass buttons with sleek hover pills! */
          '.monaco-workbench .part.titlebar .window-controls-container { background: transparent !important; display: flex !important; align-items: center !important; padding-right: 4px !important; gap: 2px !important; }',
          '.monaco-workbench .part.titlebar .window-controls-container .window-icon { border-radius: 7px !important; height: 26px !important; line-height: 26px !important; width: 38px !important; margin: 4px 1px !important; color: ' + txtStrong + ' !important; background: transparent !important; text-shadow: ' + crispTextHalo + ' !important; transition: all 0.16s ease !important; }',
          '.monaco-workbench .part.titlebar .window-controls-container .window-icon:hover { background: rgba(' + neonRgb + ', 0.24) !important; color: #ffffff !important; box-shadow: inset 0 0 0 1px rgba(' + neonRgb + ', 0.4) !important; }',
          '.monaco-workbench .part.titlebar .window-controls-container .window-icon.window-close:hover { background: rgba(239, 68, 68, 0.85) !important; color: #ffffff !important; box-shadow: 0 0 12px rgba(239, 68, 68, 0.45) !important; }',
          /* Top-right titlebar layout/search/settings buttons sleek glass hover pills */
          '.monaco-workbench .part.titlebar .titlebar-right .action-toolbar-container .action-label { border-radius: 7px !important; color: ' + txtStrong + ' !important; filter: drop-shadow(0 1px 3px rgba(0,0,0,0.85)) !important; transition: all 0.16s ease !important; }',
          '.monaco-workbench .part.titlebar .titlebar-right .action-toolbar-container .action-label:hover { background: rgba(' + neonRgb + ', 0.24) !important; color: #ffffff !important; box-shadow: inset 0 0 0 1px rgba(' + neonRgb + ', 0.36) !important; }',

          /* ====== MENUBAR (ZERO TOFU GLYPH ON MORE BUTTON!) & GRADIENT WINDOW TITLE ====== */
          '.monaco-workbench .part.titlebar .menubar { gap: 2px !important; }',
          '.monaco-workbench .part.titlebar .menubar .menubar-menu-button { border-radius: 7px !important; padding: 0 8px !important; margin: 4px 1px !important; height: 26px !important; transition: all 0.16s ease !important; }',
          '.monaco-workbench .part.titlebar .menubar .menubar-menu-button .menubar-menu-title:not(.codicon) { font-family: ' + uiFontFamily + ' !important; font-size: 12px !important; font-weight: 600 !important; letter-spacing: 0.015em !important; color: ' + txtStrong + ' !important; text-shadow: ' + crispTextHalo + ' !important; transition: color 0.16s ease !important; }',
          '.monaco-workbench .part.titlebar .menubar .menubar-menu-button .menubar-menu-title.codicon { font-family: codicon !important; font-size: 15px !important; color: ' + txtStrong + ' !important; text-shadow: ' + crispTextHalo + ' !important; }',
          '.monaco-workbench .part.titlebar .menubar .menubar-menu-button:hover, .monaco-workbench .part.titlebar .menubar .menubar-menu-button.open { background: rgba(' + neonRgb + ', 0.26) !important; box-shadow: inset 0 0 0 1px rgba(' + neonRgb + ', 0.44), 0 0 12px rgba(' + neonRgb + ', 0.28) !important; }',
          '.monaco-workbench .part.titlebar .menubar .menubar-menu-button:hover .menubar-menu-title, .monaco-workbench .part.titlebar .menubar .menubar-menu-button.open .menubar-menu-title { color: #ffffff !important; }',
          '.monaco-workbench .part.titlebar .window-title { font-family: ' + uiFontFamily + ' !important; font-size: 12.5px !important; font-weight: 700 !important; letter-spacing: 0.03em !important; background: linear-gradient(90deg, ' + txtStrong + ' 0%, ' + txtLink + ' 55%, ' + neonHex + ' 100%) !important; -webkit-background-clip: text !important; background-clip: text !important; -webkit-text-fill-color: transparent !important; filter: drop-shadow(0 1px 4px rgba(0,0,0,0.85)) !important; }'
        );

        /* ====== IMAGE 2 PART A: TOP-LEFT APP LOGO (REMOVE OPAQUE #202124 SQUARE!) ====== */
        if (appIconStyle === 'hidden') {
          rules.push('.monaco-workbench .part.titlebar .window-appicon { display: none !important; }');
        } else if (appLogoUrl) {
          if (appIconStyle === 'badge') {
            rules.push(
              '.monaco-workbench .part.titlebar .window-appicon { background-image: url("' + appLogoUrl + '") !important; background-size: 16px 16px !important; background-position: center !important; background-repeat: no-repeat !important; width: 26px !important; height: 26px !important; min-width: 26px !important; margin: 4px 6px 4px 7px !important; border-radius: 8px !important; background-color: rgba(' + overlayRgb + ', 0.52) !important; border: 1px solid rgba(' + neonRgb + ', 0.48) !important; box-shadow: 0 0 12px rgba(' + neonRgb + ', 0.30) !important; transition: all 0.18s ease !important; }',
              '.monaco-workbench .part.titlebar .window-appicon:hover { background-color: rgba(' + neonRgb + ', 0.22) !important; transform: scale(1.06) !important; }'
            );
          } else if (appIconStyle === 'clean') {
            rules.push(
              '.monaco-workbench .part.titlebar .window-appicon { background-image: url("' + appLogoUrl + '") !important; background-size: 19px 19px !important; background-position: center !important; background-repeat: no-repeat !important; background-color: transparent !important; filter: drop-shadow(0 1px 4px rgba(0,0,0,0.55)) !important; }'
            );
          } else {
            /* Default: glow — transparent official Antigravity logo with neon aura! */
            rules.push(
              '.monaco-workbench .part.titlebar .window-appicon { background-image: url("' + appLogoUrl + '") !important; background-size: 20px 20px !important; background-position: center !important; background-repeat: no-repeat !important; background-color: transparent !important; filter: drop-shadow(0 0 8px rgba(' + neonRgb + ', 0.72)) drop-shadow(0 1px 3px rgba(0,0,0,0.6)) !important; transition: transform 0.18s ease, filter 0.18s ease !important; }',
              '.monaco-workbench .part.titlebar .window-appicon:hover { transform: scale(1.1) !important; filter: drop-shadow(0 0 12px rgba(' + neonSecRgb + ', 0.9)) !important; }'
            );
          }
        }

        /* ====== 100% UNIFORM CRYSTAL GLASS CODE EDITOR (ZERO OPAQUE BOXES!) ====== */
        rules.push(
          '.monaco-workbench .part.editor, .monaco-workbench .part.editor > .content, .monaco-workbench .editor-group-container.empty, .monaco-workbench .editor-group-container.empty > .editor-container, .monaco-workbench .part.editor .content .empty { background: transparent !important; background-color: transparent !important; border: none !important; }',
          '.monaco-workbench .editor-group-container:not(.empty) { background: rgba(' + overlayRgb + ', ' + editorAlpha.toFixed(2) + ') !important; background-color: rgba(' + overlayRgb + ', ' + editorAlpha.toFixed(2) + ') !important; }',
          '.monaco-workbench .editor-group-container:not(.empty) .editor-container, .monaco-workbench .editor-group-container:not(.empty) .monaco-editor, .monaco-workbench .editor-group-container:not(.empty) .monaco-editor-background, .monaco-workbench .editor-group-container:not(.empty) .monaco-editor .margin, .monaco-workbench .editor-group-container:not(.empty) .monaco-editor .overflow-guard, .monaco-workbench .editor-group-container:not(.empty) .monaco-editor .monaco-scrollable-element, .monaco-workbench .editor-group-container:not(.empty) .monaco-editor .inputarea.ime-input, .monaco-workbench .editor-group-container:not(.empty) .monaco-editor .decorationsOverviewRuler, .monaco-workbench .breadcrumbs-below-tabs, .monaco-workbench .breadcrumbs-control, .monaco-workbench .monaco-breadcrumbs, .monaco-workbench .tabs-and-actions-container { background: transparent !important; background-color: transparent !important; }',
          /* Sticky scroll clean soft tint */
          '.monaco-workbench .monaco-editor .sticky-widget { background: rgba(' + overlayRgb + ', ' + Math.min(0.74, editorAlpha + 0.18).toFixed(2) + ') !important; border-bottom: 1px solid ' + chromeBorder + ' !important; box-shadow: none !important; }',
          '.monaco-workbench .monaco-editor .sticky-widget .sticky-line-content, .monaco-workbench .monaco-editor .sticky-widget .sticky-line-number { background: transparent !important; }',
          /* Hide opaque dark Minimap column & overview ruler until hover */
          '.monaco-workbench .monaco-editor .minimap { opacity: 0 !important; background: transparent !important; mix-blend-mode: normal !important; filter: none !important; transition: opacity 0.22s ease !important; }',
          '.monaco-workbench .monaco-editor .minimap:hover { opacity: 0.72 !important; }',
          '.monaco-workbench .monaco-editor .minimap-shadow-visible, .monaco-workbench .monaco-editor .scroll-decoration { box-shadow: none !important; display: none !important; }',
          '.monaco-workbench .monaco-editor .decorationsOverviewRuler { opacity: 0 !important; pointer-events: none !important; }',
          '.monaco-workbench .tab-border-top-container, .monaco-workbench .tab-border-bottom-container { display: none !important; }',
          '.monaco-workbench .monaco-editor .view-overlays .current-line, .monaco-workbench .monaco-editor .margin-view-overlays .current-line-margin { background: rgba(255, 255, 255, 0.045) !important; border: none !important; box-shadow: none !important; }',
          '.monaco-workbench .monaco-editor .lines-content .cigr, .monaco-workbench .monaco-editor .lines-content .cigra { box-shadow: 1px 0 0 0 rgba(255, 255, 255, 0.055) inset !important; }',
          '.monaco-workbench .monaco-editor .scrollbar { opacity: 0 !important; transition: opacity 0.2s ease !important; background: transparent !important; }',
          '.monaco-workbench .monaco-editor .scrollbar:hover, .monaco-workbench .monaco-editor .scrollbar.visible { opacity: 0.75 !important; }',
          '.monaco-workbench .monaco-editor .scrollbar .slider { background: rgba(255, 255, 255, 0.18) !important; border-radius: 999px !important; }',
          '.monaco-workbench .context-view .monaco-menu, .monaco-workbench .breadcrumbs-picker, .monaco-workbench .breadcrumbs-picker .monaco-list { background: rgba(10, 14, 28, 0.92) !important; border: 1px solid rgba(255, 255, 255, 0.12) !important; border-radius: 10px !important; box-shadow: 0 12px 32px rgba(0,0,0,0.55) !important; }',
          '.monaco-workbench .monaco-editor .view-lines, .monaco-workbench .monaco-editor .margin-view-overlays { font-family: "JetBrains Mono", "Cascadia Code", Consolas, monospace !important; text-shadow: ' + (isLight ? 'none' : '0 1px 3px rgba(0, 0, 0, 0.88)') + ' !important; }',
          /* 100% SEAMLESS Auxiliarybar (Chat host) — ZERO stacked borders on aux / content / pane-body / iframe.webview! */
          '.monaco-workbench .part.auxiliarybar, .monaco-workbench .part.auxiliarybar > .content, .monaco-workbench .part.auxiliarybar .pane-body, .monaco-workbench .part.auxiliarybar .pane, .monaco-workbench iframe.webview { background: transparent !important; background-color: transparent !important; border: none !important; border-left: none !important; border-right: none !important; outline: none !important; box-shadow: none !important; }',
          /* ====== IMAGE 3 UPGRADE: CUSTOM LUXURY WELCOME HERO SCREEN (.antigravity-welcome-container) ====== */
          '.monaco-workbench .antigravity-welcome-container { background: transparent !important; border: none !important; box-shadow: none !important; }',
          '.monaco-workbench .antigravity-welcome-container::before { display: none !important; }',
          '.monaco-workbench .editor-group-container.empty > .antigravity-welcome-container { display: flex !important; flex-direction: column !important; align-items: center !important; width: 100% !important; max-width: 100% !important; box-sizing: border-box !important; }',
          '.monaco-workbench .antigravity-welcome-container .antigravity-welcome-container { width: auto !important; height: auto !important; margin: 0 !important; padding: 0 !important; flex: 0 0 auto !important; }',
          '.monaco-workbench .antigravity-welcome-header { display: flex !important; flex-direction: column !important; align-items: center !important; gap: 10px !important; margin-bottom: 16px !important; }',
          (appLogoUrl
            ? '.monaco-workbench .antigravity-welcome-header .jetski-logo { width: 42px !important; height: 42px !important; background-image: url("' + appLogoUrl + '") !important; background-size: contain !important; background-repeat: no-repeat !important; background-position: center !important; -webkit-mask: none !important; mask: none !important; background-color: transparent !important; filter: drop-shadow(0 0 14px rgba(' + neonRgb + ', 0.85)) drop-shadow(0 2px 6px rgba(0,0,0,0.85)) !important; }'
            : '.monaco-workbench .antigravity-welcome-header .jetski-logo { width: 42px !important; height: 42px !important; filter: drop-shadow(0 0 14px rgba(' + neonRgb + ', 0.85)) !important; }'),
          '.monaco-workbench .antigravity-welcome-header-title { font-family: ' + heroFontFamily + ' !important; font-size: ' + heroFontSize + 'px !important; font-weight: 800 !important; letter-spacing: 0.08em !important; line-height: 1.2 !important; background: linear-gradient(95deg, #ffffff 0%, #e0f2fe 45%, ' + txtLink + ' 78%, ' + neonHex + ' 100%) !important; -webkit-background-clip: text !important; background-clip: text !important; -webkit-text-fill-color: transparent !important; filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.98)) drop-shadow(0 3px 14px rgba(0, 0, 0, 0.92)) drop-shadow(0 0 18px rgba(' + neonRgb + ', 0.55)) !important; text-align: center !important; }',
          /* True Clear Crystal Liquid Glass Welcome Pills — 100% see-through optical lens, ZERO milky white cloudiness! */
          '.monaco-workbench .antigravity-welcome-buttons-container { width: auto !important; max-width: 440px !important; }',
          '.monaco-workbench .antigravity-welcome-buttons { display: flex !important; flex-direction: row !important; flex-wrap: wrap !important; justify-content: center !important; align-items: center !important; gap: 12px !important; }',
          '.monaco-workbench .antigravity-welcome-buttons .monaco-button { grid-column: auto !important; width: auto !important; min-width: 154px !important; height: 39px !important; padding: 0 20px !important; border-radius: 999px !important; display: inline-flex !important; align-items: center !important; justify-content: center !important; gap: 8px !important; font-family: ' + uiFontFamily + ' !important; font-size: 12.5px !important; font-weight: 700 !important; letter-spacing: 0.02em !important; color: #ffffff !important; text-shadow: ' + crispTextHalo + ' !important; backdrop-filter: blur(4px) saturate(165%) brightness(1.06) !important; transition: transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease, background 0.18s ease !important; }',
          '.monaco-workbench .antigravity-welcome-buttons .monaco-button.primary { background: ' + lgAccentBg + ' !important; border: 1px solid rgba(255, 255, 255, 0.30) !important; box-shadow: inset 0 1px 1.5px rgba(255, 255, 255, 0.42), inset 0 -1px 1.5px rgba(' + neonRgb + ', 0.38), 0 8px 24px rgba(0, 0, 0, 0.24) !important; }',
          '.monaco-workbench .antigravity-welcome-buttons .monaco-button:not(.primary) { background: ' + lgClearBg + ' !important; border: 1px solid rgba(255, 255, 255, 0.24) !important; box-shadow: ' + lgRimShadow + ' !important; }',
          '.monaco-workbench .antigravity-welcome-buttons .monaco-button:hover { transform: translateY(-2px) !important; background: ' + lgAccentBg + ' !important; border-color: rgba(' + neonSecRgb + ', 0.62) !important; box-shadow: ' + lgHoverShadow + ' !important; }',
          (ideWelcomeStyle === 'luxury_bottom'
            ? '.monaco-workbench .editor-group-container.empty > .antigravity-welcome-container { justify-content: flex-end !important; padding-bottom: 48px !important; }'
            : ideWelcomeStyle === 'floating_card'
            ? '.monaco-workbench .editor-group-container.empty > .antigravity-welcome-container { justify-content: center !important; } .monaco-workbench .editor-group-container.empty > .antigravity-welcome-container > .antigravity-welcome-header, .monaco-workbench .editor-group-container.empty > .antigravity-welcome-container > .antigravity-welcome-container { background: ' + lgClearBg + ' !important; backdrop-filter: blur(6px) saturate(160%) !important; padding: 18px 28px !important; border-radius: 20px !important; border: 1px solid rgba(255, 255, 255, 0.24) !important; box-shadow: ' + lgRimShadow + ' !important; }'
            : ideWelcomeStyle === 'cyber_hud'
            ? '.monaco-workbench .editor-group-container.empty > .antigravity-welcome-container { justify-content: flex-end !important; padding-bottom: 46px !important; } .monaco-workbench .antigravity-welcome-header-title { text-transform: uppercase !important; letter-spacing: 0.16em !important; } .monaco-workbench .antigravity-welcome-buttons .monaco-button { border-radius: 10px !important; border-color: rgba(' + neonRgb + ', 0.55) !important; }'
            : '.monaco-workbench .editor-group-container.empty > .antigravity-welcome-container { justify-content: flex-end !important; padding-bottom: 36px !important; opacity: 0.42 !important; transition: opacity 0.25s ease !important; } .monaco-workbench .editor-group-container.empty > .antigravity-welcome-container:hover { opacity: 1 !important; }'),
          /* Clear Optical Liquid Glass Sidebar Buttons (Open Folder, Create Java Project, Configure Tests — 100% see-through!) */
          '.monaco-workbench .part.sidebar .monaco-button { font-family: ' + uiFontFamily + ' !important; font-weight: 650 !important; background: ' + lgClearBg + ' !important; backdrop-filter: blur(4px) saturate(165%) brightness(1.05) !important; color: #ffffff !important; border: 1px solid rgba(255, 255, 255, 0.24) !important; border-radius: 12px !important; box-shadow: ' + lgRimShadow + ' !important; text-shadow: ' + crispTextHalo + ' !important; transition: transform 0.16s ease, border-color 0.16s ease, box-shadow 0.16s ease, background 0.16s ease !important; }',
          '.monaco-workbench .part.sidebar .monaco-button.monaco-text-button { background: ' + lgClearBg + ' !important; border: 1px solid rgba(255, 255, 255, 0.26) !important; color: #ffffff !important; box-shadow: inset 0 1px 1.5px rgba(255, 255, 255, 0.40), inset 0 -1px 1.5px rgba(' + neonRgb + ', 0.26), 0 6px 20px rgba(0, 0, 0, 0.20) !important; }',
          '.monaco-workbench .part.sidebar .monaco-button:hover { transform: translateY(-1px) !important; background: ' + lgAccentBg + ' !important; border-color: rgba(' + neonSecRgb + ', 0.58) !important; box-shadow: ' + lgHoverShadow + ' !important; }',
          /* ULTRA-TRANSPARENT LEFT SIDEBAR & DEDICATED TERMINAL/BOTTOM PANEL OPACITY + crisp text halo */
          '.monaco-workbench .part.sidebar { background: rgba(' + overlayRgb + ', ' + sidebarAlpha.toFixed(2) + ') !important; backdrop-filter: ' + panelBackdropCss + ' !important; border-color: ' + chromeBorder + ' !important; color: ' + txtStrong + ' !important; text-shadow: ' + crispTextHalo + ' !important; }',
          '.monaco-workbench .part.panel { background: rgba(' + overlayRgb + ', ' + terminalAlpha.toFixed(2) + ') !important; backdrop-filter: ' + panelBackdropCss + ' !important; border-color: ' + chromeBorder + ' !important; color: ' + txtStrong + ' !important; text-shadow: ' + crispTextHalo + ' !important; }',
          '.monaco-workbench .part.sidebar > .title, .monaco-workbench .part.panel > .title, .monaco-workbench .part.sidebar .composite.title, .monaco-workbench .part.panel .composite.title, .monaco-workbench .part.auxiliarybar > .composite.title { background: transparent !important; background-color: transparent !important; border-bottom: ' + (borderMode === 'none' || sidebarAlpha <= 0.01 ? 'none' : ('1px solid ' + chromeBorder)) + ' !important; box-shadow: none !important; }',
          '.monaco-workbench .part.sidebar > .title .title-label h2, .monaco-workbench .part.panel > .title .title-label h2 { font-family: ' + uiFontFamily + ' !important; font-weight: 700 !important; letter-spacing: 0.04em !important; color: ' + txtStrong + ' !important; text-shadow: ' + crispTextHalo + ' !important; }',
          '.monaco-workbench .part.sidebar .monaco-list, .monaco-workbench .part.sidebar .monaco-list-rows, .monaco-workbench .part.sidebar .pane, .monaco-workbench .part.sidebar .pane-body, .monaco-workbench .part.sidebar .pane-header, .monaco-workbench .part.panel .monaco-list { background: transparent !important; background-color: transparent !important; color: ' + txtStrong + ' !important; text-shadow: ' + crispTextHalo + ' !important; }',
          '.monaco-workbench .part.sidebar .pane-header { border-top: 1px solid ' + chromeBorder + ' !important; }',
          '.monaco-workbench .part.sidebar a { color: ' + txtLink + ' !important; text-shadow: ' + crispTextHalo + ' !important; }',
          '.monaco-workbench .part.sidebar .welcome-view-content p { color: ' + txtBody + ' !important; text-shadow: ' + crispTextHalo + ' !important; }'
        );

        /* ====== IMAGE 2 PART B: ULTRA-TRANSPARENT CUSTOMIZABLE ACTIVITY BAR (ZERO DARK INNER RING/BOX!) ====== */
        rules.push(
          '.monaco-workbench .part.activitybar { background: rgba(' + overlayRgb + ', ' + sidebarAlpha.toFixed(2) + ') !important; border-right: 1px solid ' + chromeBorder + ' !important; }',
          '.monaco-workbench .part.activitybar .badge .badge-content { background: linear-gradient(135deg, ' + neonHex + ', ' + neonSec + ') !important; color: #ffffff !important; border: none !important; box-shadow: 0 2px 8px rgba(' + neonRgb + ', 0.55) !important; font-weight: 700 !important; }',
          '.monaco-workbench .part.activitybar .action-item { position: relative !important; transition: all 0.18s ease !important; outline: none !important; }',
          '.monaco-workbench .part.activitybar .action-item .action-label { transition: all 0.18s cubic-bezier(0.22, 1, 0.36, 1) !important; background: transparent !important; background-color: transparent !important; }',
          '.monaco-workbench .part.activitybar .action-item .active-item-indicator { pointer-events: none !important; background: transparent !important; }',
          /* ANNIHILATE stock VS Code dark grey inner box/ring (var(--vscode-toolbar-hoverBackground)) on checked, focus, hover, AND composite headers! */
          '.monaco-workbench .part.activitybar.activitybar > .content :not(.monaco-menu) > .monaco-action-bar .action-item .active-item-indicator::before, .monaco-workbench .part.activitybar.activitybar > .content :not(.monaco-menu) > .monaco-action-bar .action-item:focus .active-item-indicator::before, .monaco-workbench .part.activitybar.activitybar > .content :not(.monaco-menu) > .monaco-action-bar .action-item:hover .active-item-indicator::before, .monaco-workbench .part.activitybar.activitybar > .content :not(.monaco-menu) > .monaco-action-bar .action-item.checked .active-item-indicator::before { background: transparent !important; background-color: transparent !important; border: none !important; box-shadow: none !important; outline: none !important; }',
          '.monaco-workbench .part.activitybar.activitybar > .content :not(.monaco-menu) > .monaco-action-bar .action-item:not(.checked) .active-item-indicator::before { display: none !important; }',
          '.monaco-workbench .part.activitybar.activitybar > .content :not(.monaco-menu) > .monaco-action-bar .action-item.checked .active-item-indicator::before { display: block !important; left: 0px !important; top: 9px !important; width: 3px !important; height: calc(100% - 18px) !important; background: linear-gradient(180deg, ' + neonHex + ', ' + neonSec + ') !important; border-radius: 0 4px 4px 0 !important; box-shadow: 0 0 10px rgba(' + neonRgb + ', 0.92) !important; }',
          '.monaco-workbench .pane-composite-part > .title > .composite-bar-container > .composite-bar > .monaco-action-bar .action-item .active-item-indicator::before { background-color: transparent !important; }'
        );

        if (activityBarStyle === 'colorful_glow') {
          rules.push(
            '.monaco-workbench .part.activitybar .action-item { margin: 2px 3px !important; border-radius: 10px !important; width: calc(100% - 6px) !important; }',
            '.monaco-workbench .part.activitybar.activitybar > .content :not(.monaco-menu) > .monaco-action-bar .action-item .action-label.codicon { width: 100% !important; opacity: 0.92 !important; filter: drop-shadow(0 1px 4px rgba(0,0,0,0.75)) !important; }',
            '.monaco-workbench .part.activitybar.activitybar > .content :not(.monaco-menu) > .monaco-action-bar .action-item .codicon-explorer-view-icon, .monaco-workbench .part.activitybar.activitybar > .content :not(.monaco-menu) > .monaco-action-bar .action-item:hover .codicon-explorer-view-icon, .monaco-workbench .part.activitybar.activitybar > .content :not(.monaco-menu) > .monaco-action-bar .action-item:focus .codicon-explorer-view-icon { color: #38bdf8 !important; }',
            '.monaco-workbench .part.activitybar.activitybar > .content :not(.monaco-menu) > .monaco-action-bar .action-item .codicon-search-view-icon, .monaco-workbench .part.activitybar.activitybar > .content :not(.monaco-menu) > .monaco-action-bar .action-item:hover .codicon-search-view-icon, .monaco-workbench .part.activitybar.activitybar > .content :not(.monaco-menu) > .monaco-action-bar .action-item:focus .codicon-search-view-icon { color: #c084fc !important; }',
            '.monaco-workbench .part.activitybar.activitybar > .content :not(.monaco-menu) > .monaco-action-bar .action-item .codicon-source-control-view-icon, .monaco-workbench .part.activitybar.activitybar > .content :not(.monaco-menu) > .monaco-action-bar .action-item:hover .codicon-source-control-view-icon, .monaco-workbench .part.activitybar.activitybar > .content :not(.monaco-menu) > .monaco-action-bar .action-item:focus .codicon-source-control-view-icon { color: #34d399 !important; }',
            '.monaco-workbench .part.activitybar.activitybar > .content :not(.monaco-menu) > .monaco-action-bar .action-item .codicon-run-view-icon, .monaco-workbench .part.activitybar.activitybar > .content :not(.monaco-menu) > .monaco-action-bar .action-item:hover .codicon-run-view-icon, .monaco-workbench .part.activitybar.activitybar > .content :not(.monaco-menu) > .monaco-action-bar .action-item:focus .codicon-run-view-icon { color: #fb923c !important; }',
            '.monaco-workbench .part.activitybar.activitybar > .content :not(.monaco-menu) > .monaco-action-bar .action-item .codicon-remote-explorer-view-icon, .monaco-workbench .part.activitybar.activitybar > .content :not(.monaco-menu) > .monaco-action-bar .action-item:hover .codicon-remote-explorer-view-icon, .monaco-workbench .part.activitybar.activitybar > .content :not(.monaco-menu) > .monaco-action-bar .action-item:focus .codicon-remote-explorer-view-icon { color: #60a5fa !important; }',
            '.monaco-workbench .part.activitybar.activitybar > .content :not(.monaco-menu) > .monaco-action-bar .action-item .codicon-extensions-view-icon, .monaco-workbench .part.activitybar.activitybar > .content :not(.monaco-menu) > .monaco-action-bar .action-item:hover .codicon-extensions-view-icon, .monaco-workbench .part.activitybar.activitybar > .content :not(.monaco-menu) > .monaco-action-bar .action-item:focus .codicon-extensions-view-icon { color: #f472b6 !important; }',
            '.monaco-workbench .part.activitybar.activitybar > .content :not(.monaco-menu) > .monaco-action-bar .action-item .codicon-test-view-icon, .monaco-workbench .part.activitybar.activitybar > .content :not(.monaco-menu) > .monaco-action-bar .action-item:hover .codicon-test-view-icon, .monaco-workbench .part.activitybar.activitybar > .content :not(.monaco-menu) > .monaco-action-bar .action-item:focus .codicon-test-view-icon { color: #a3e635 !important; }',
            '.monaco-workbench .part.activitybar.activitybar > .content :not(.monaco-menu) > .monaco-action-bar .action-item .codicon-accounts-view-bar-icon, .monaco-workbench .part.activitybar.activitybar > .content :not(.monaco-menu) > .monaco-action-bar .action-item:hover .codicon-accounts-view-bar-icon { color: #fde047 !important; }',
            '.monaco-workbench .part.activitybar.activitybar > .content :not(.monaco-menu) > .monaco-action-bar .action-item .codicon-settings-view-bar-icon, .monaco-workbench .part.activitybar.activitybar > .content :not(.monaco-menu) > .monaco-action-bar .action-item:hover .codicon-settings-view-bar-icon { color: #93c5fd !important; }',
            '.monaco-workbench .part.activitybar.activitybar > .content :not(.monaco-menu) > .monaco-action-bar .action-item .action-label.uri-icon { width: 100% !important; background-color: #818cf8 !important; opacity: 0.92 !important; filter: drop-shadow(0 0 6px rgba(129, 140, 248, 0.55)) !important; }',
            '.monaco-workbench .part.activitybar .action-item:hover { background: rgba(255, 255, 255, 0.08) !important; box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.14) !important; }',
            '.monaco-workbench .part.activitybar .action-item:hover .action-label { opacity: 1 !important; transform: scale(1.1) !important; filter: drop-shadow(0 0 8px currentColor) !important; }',
            '.monaco-workbench .part.activitybar.activitybar > .content :not(.monaco-menu) > .monaco-action-bar .action-item:hover .action-label.uri-icon { background-color: #a5b4fc !important; filter: drop-shadow(0 0 10px rgba(165, 180, 252, 0.85)) !important; }',
            '.monaco-workbench .part.activitybar .action-item.checked { background: linear-gradient(135deg, rgba(' + neonRgb + ', 0.22), rgba(' + neonSecRgb + ', 0.12)) !important; box-shadow: inset 0 0 0 1px rgba(' + neonRgb + ', 0.45), 0 0 12px rgba(' + neonRgb + ', 0.24) !important; }',
            '.monaco-workbench .part.activitybar .action-item.checked .action-label { opacity: 1 !important; filter: drop-shadow(0 0 10px currentColor) !important; }'
          );
        } else if (activityBarStyle === 'floating_dock') {
          rules.push(
            '.monaco-workbench .part.activitybar .action-item { margin: 4px 3px !important; border-radius: 10px !important; width: calc(100% - 6px) !important; background: rgba(255, 255, 255, 0.045) !important; box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.08) !important; }',
            '.monaco-workbench .part.activitybar .action-item .action-label { width: 100% !important; color: rgba(226, 232, 240, 0.80) !important; }',
            '.monaco-workbench .part.activitybar .action-item .action-label.uri-icon { background-color: rgba(226, 232, 240, 0.80) !important; }',
            '.monaco-workbench .part.activitybar .action-item:hover { background: rgba(' + neonRgb + ', 0.18) !important; box-shadow: inset 0 0 0 1px rgba(' + neonRgb + ', 0.42) !important; }',
            '.monaco-workbench .part.activitybar .action-item:hover .action-label { color: #ffffff !important; transform: scale(1.08) !important; }',
            '.monaco-workbench .part.activitybar .action-item.checked { background: linear-gradient(135deg, rgba(' + neonRgb + ', 0.34), rgba(' + neonSecRgb + ', 0.22)) !important; box-shadow: inset 0 0 0 1px rgba(' + neonRgb + ', 0.62), 0 0 14px rgba(' + neonRgb + ', 0.35) !important; }',
            '.monaco-workbench .part.activitybar .action-item.checked .action-label { color: #ffffff !important; filter: drop-shadow(0 0 8px rgba(' + neonRgb + ', 0.85)) !important; }'
          );
        } else if (activityBarStyle === 'neon_pills') {
          rules.push(
            '.monaco-workbench .part.activitybar .action-item { margin: 2px 3px !important; border-radius: 9px !important; width: calc(100% - 6px) !important; }',
            '.monaco-workbench .part.activitybar .action-item .action-label { width: 100% !important; color: rgba(226, 232, 240, 0.76) !important; }',
            '.monaco-workbench .part.activitybar .action-item .action-label.uri-icon { background-color: rgba(226, 232, 240, 0.76) !important; }',
            '.monaco-workbench .part.activitybar .action-item:hover { background: rgba(' + neonRgb + ', 0.16) !important; }',
            '.monaco-workbench .part.activitybar .action-item:hover .action-label { color: ' + txtStrong + ' !important; transform: scale(1.08) !important; }',
            '.monaco-workbench .part.activitybar .action-item.checked { background: rgba(' + neonRgb + ', 0.24) !important; box-shadow: inset 0 0 0 1px rgba(' + neonRgb + ', 0.48) !important; }',
            '.monaco-workbench .part.activitybar .action-item.checked .action-label { color: ' + neonHex + ' !important; filter: drop-shadow(0 0 9px rgba(' + neonRgb + ', 0.85)) !important; }'
          );
        } else {
          /* minimal */
          rules.push(
            '.monaco-workbench .part.activitybar .action-item .action-label { color: rgba(226, 232, 240, 0.66) !important; }',
            '.monaco-workbench .part.activitybar .action-item:hover .action-label, .monaco-workbench .part.activitybar .action-item.checked .action-label { color: #ffffff !important; }'
          );
        }

        /* ====== IMAGE 3: CUSTOMIZABLE EDITOR TABS, EDITOR ACTIONS & BREADCRUMBS ====== */
        rules.push(
          '.monaco-workbench .part.editor > .content .editor-group-container > .title { background: rgba(' + overlayRgb + ', ' + Math.max(0.18, sidebarAlpha).toFixed(2) + ') !important; border-bottom: 1px solid ' + chromeBorder + ' !important; }',
          /* Crisp Editor Action Buttons (Preview, Split, Back, Forward, More) */
          '.monaco-workbench .part.editor > .content .editor-group-container > .title .editor-actions { gap: 2px !important; padding-right: 6px !important; }',
          '.monaco-workbench .part.editor > .content .editor-group-container > .title .editor-actions .action-label { border-radius: 7px !important; padding: 3px !important; color: ' + txtBody + ' !important; transition: all 0.16s ease !important; }',
          '.monaco-workbench .part.editor > .content .editor-group-container > .title .editor-actions .action-label:hover { background: rgba(' + neonRgb + ', 0.24) !important; color: #ffffff !important; box-shadow: inset 0 0 0 1px rgba(' + neonRgb + ', 0.4) !important; }',
          /* Crisp Breadcrumbs with glowing hover pills */
          '.monaco-workbench .monaco-breadcrumbs { border-bottom: 1px solid ' + chromeBorder + ' !important; font-family: ' + uiFontFamily + ' !important; font-size: 11.5px !important; color: ' + txtMuted + ' !important; padding: 0 8px !important; text-shadow: 0 1px 3px rgba(0, 0, 0, 0.72) !important; }',
          '.monaco-workbench .monaco-breadcrumbs .monaco-breadcrumb-item { border-radius: 6px !important; padding: 1px 4px !important; transition: all 0.15s ease !important; }',
          '.monaco-workbench .monaco-breadcrumbs .monaco-breadcrumb-item:hover { background: rgba(' + neonRgb + ', 0.2) !important; color: #ffffff !important; }',
          '.monaco-workbench .monaco-breadcrumbs .monaco-breadcrumb-item:last-child { color: ' + txtStrong + ' !important; font-weight: 600 !important; }'
        );

        if (tabsChromeStyle === 'floating_pills') {
          rules.push(
            '.monaco-workbench .part.editor > .content .editor-group-container > .title .tabs-container { gap: 4px !important; padding: 0 6px !important; align-items: center !important; }',
            '.monaco-workbench .part.editor > .content .editor-group-container > .title .tab { font-family: ' + uiFontFamily + ' !important; font-weight: 500 !important; background: rgba(255, 255, 255, 0.03) !important; border: 1px solid transparent !important; border-radius: 8px !important; height: 27px !important; margin: 4px 0 !important; padding: 0 10px !important; color: ' + txtMuted + ' !important; transition: all 0.18s ease !important; }',
            '.monaco-workbench .part.editor > .content .editor-group-container > .title .tab:hover:not(.active) { background: rgba(255, 255, 255, 0.08) !important; color: ' + txtBody + ' !important; }',
            '.monaco-workbench .part.editor > .content .editor-group-container > .title .tab.active { background: linear-gradient(135deg, rgba(' + neonRgb + ', 0.28), rgba(' + neonSecRgb + ', 0.16)) !important; border: 1px solid rgba(' + neonRgb + ', 0.52) !important; box-shadow: 0 2px 12px rgba(' + neonRgb + ', 0.24), inset 0 1px 0 rgba(255, 255, 255, 0.16) !important; color: #ffffff !important; font-weight: 650 !important; }',
            '.monaco-workbench .part.editor > .content .editor-group-container > .title .tab.active .label-name { text-shadow: 0 1px 4px rgba(0, 0, 0, 0.65) !important; }',
            '.monaco-workbench .part.editor > .content .editor-group-container > .title .tab .tab-actions .action-label { border-radius: 6px !important; }',
            '.monaco-workbench .part.editor > .content .editor-group-container > .title .tab .tab-actions .action-label:hover { background: rgba(255, 255, 255, 0.16) !important; }'
          );
        } else if (tabsChromeStyle === 'neon_underline') {
          rules.push(
            '.monaco-workbench .part.editor > .content .editor-group-container > .title .tab { font-family: ' + uiFontFamily + ' !important; font-weight: 500 !important; background: transparent !important; border: none !important; border-right: 1px solid ' + chromeBorder + ' !important; color: ' + txtMuted + ' !important; position: relative !important; transition: all 0.18s ease !important; }',
            '.monaco-workbench .part.editor > .content .editor-group-container > .title .tab.active { background: linear-gradient(180deg, rgba(' + neonRgb + ', 0.06), rgba(' + neonRgb + ', 0.18)) !important; color: #ffffff !important; font-weight: 650 !important; box-shadow: inset 0 -2.5px 0 0 ' + neonHex + ', 0 4px 14px -4px rgba(' + neonRgb + ', 0.5) !important; }'
          );
        } else if (tabsChromeStyle === 'cyber_capsule') {
          rules.push(
            '.monaco-workbench .part.editor > .content .editor-group-container > .title .tabs-container { gap: 5px !important; padding: 0 6px !important; align-items: center !important; }',
            '.monaco-workbench .part.editor > .content .editor-group-container > .title .tab { font-family: ' + uiFontFamily + ' !important; font-weight: 500 !important; background: rgba(' + overlayRgb + ', 0.42) !important; border: 1px solid rgba(255, 255, 255, 0.09) !important; border-radius: 999px !important; height: 26px !important; margin: 4px 0 !important; padding: 0 13px !important; color: ' + txtMuted + ' !important; transition: all 0.18s ease !important; }',
            '.monaco-workbench .part.editor > .content .editor-group-container > .title .tab.active { background: rgba(' + overlayRgb + ', 0.72) !important; border: 1px solid ' + neonHex + ' !important; box-shadow: 0 0 14px rgba(' + neonRgb + ', 0.42), inset 0 0 10px rgba(' + neonSecRgb + ', 0.18) !important; color: #ffffff !important; font-weight: 700 !important; }'
          );
        } else {
          /* minimal */
          rules.push(
            '.monaco-workbench .part.editor > .content .editor-group-container > .title .tab { font-family: ' + uiFontFamily + ' !important; font-weight: 500 !important; background: transparent !important; border-right: 1px solid ' + chromeBorder + ' !important; color: ' + txtMuted + ' !important; }',
            '.monaco-workbench .part.editor > .content .editor-group-container > .title .tab.active { background: rgba(' + neonRgb + ', 0.14) !important; border-top: 2px solid ' + neonHex + ' !important; color: ' + txtStrong + ' !important; font-weight: 650 !important; }'
          );
        }

        /* ====== IMAGE 4: CUSTOMIZABLE HIGH-LEGIBILITY STATUS BAR ====== */
        rules.push(
          '.monaco-workbench .part.statusbar { font-family: ' + uiFontFamily + ' !important; color: ' + txtBody + ' !important; text-shadow: ' + (isLight ? 'none' : '0 1px 3px rgba(0, 0, 0, 0.92)') + ' !important; }',
          '.monaco-workbench .part.statusbar .statusbar-item-label { font-family: ' + uiFontFamily + ' !important; font-size: 11.5px !important; font-weight: 500 !important; border-radius: 6px !important; transition: all 0.16s ease !important; }',
          '.monaco-workbench .part.statusbar .statusbar-item > a:hover { background: rgba(' + neonRgb + ', 0.26) !important; color: #ffffff !important; }',
          /* Sleek rounded glowing Remote Host pill instead of raw corner box! */
          '.monaco-workbench .part.statusbar .statusbar-item.remote-kind, .monaco-workbench .part.statusbar .statusbar-item.has-background-color { background: transparent !important; margin: 0 4px 0 3px !important; }',
          '.monaco-workbench .part.statusbar .statusbar-item.remote-kind > a, .monaco-workbench .part.statusbar .statusbar-item.has-background-color > a { background: linear-gradient(135deg, rgba(' + neonRgb + ', 0.78), rgba(' + neonSecRgb + ', 0.65)) !important; color: #ffffff !important; border-radius: 6px !important; height: 18px !important; margin-top: 2px !important; padding: 0 8px !important; box-shadow: 0 0 10px rgba(' + neonRgb + ', 0.36) !important; }',
          '.monaco-workbench .part.statusbar .statusbar-item.remote-kind > a:hover { filter: brightness(1.15) !important; }'
        );

        if (statusBarStyle === 'glass_pills') {
          rules.push(
            '.monaco-workbench .part.statusbar { background: ' + (sidebarAlpha <= 0.02 ? 'transparent' : ('linear-gradient(180deg, rgba(' + overlayRgb + ', ' + Math.min(0.65, sidebarAlpha + 0.08).toFixed(2) + '), rgba(' + overlayRgb + ', ' + Math.min(0.75, sidebarAlpha + 0.16).toFixed(2) + '))')) + ' !important; background-image: ' + (sidebarAlpha <= 0.02 ? 'none' : ('linear-gradient(180deg, rgba(' + overlayRgb + ', ' + Math.min(0.65, sidebarAlpha + 0.08).toFixed(2) + '), rgba(' + overlayRgb + ', ' + Math.min(0.75, sidebarAlpha + 0.16).toFixed(2) + '))')) + ' !important; border-top: ' + (sidebarAlpha <= 0.02 || borderMode === 'none' ? 'none' : ('1px solid ' + chromeBorder)) + ' !important; box-shadow: none !important; }',
            '.monaco-workbench .part.statusbar .statusbar-item:not(.remote-kind):not(.has-background-color) > a { height: 18px !important; margin: 2px 1.5px !important; padding: 0 6px !important; border-radius: 6px !important; background: rgba(10, 12, 26, 0.18) !important; border: 1px solid rgba(255, 255, 255, 0.12) !important; backdrop-filter: blur(4px) !important; }',
            '.monaco-workbench .part.statusbar .statusbar-item[id*="quota"] > a { background: rgba(16, 185, 129, 0.14) !important; border-color: rgba(52, 211, 153, 0.30) !important; color: #a7f3d0 !important; font-weight: 600 !important; }',
            '.monaco-workbench .part.statusbar .statusbar-item[id*="antigravity.settings"] > a { background: linear-gradient(135deg, rgba(' + neonRgb + ', 0.24), rgba(' + neonSecRgb + ', 0.18)) !important; border-color: rgba(' + neonRgb + ', 0.42) !important; color: #ffffff !important; font-weight: 650 !important; }',
            '.monaco-workbench .part.statusbar .statusbar-item[id="status.problems"] .codicon-error { color: #fb7185 !important; }',
            '.monaco-workbench .part.statusbar .statusbar-item[id="status.problems"] .codicon-warning { color: #fbbf24 !important; }',
            '.monaco-workbench .part.statusbar .statusbar-item[id*="datacloud"] .codicon { color: #38bdf8 !important; }'
          );
        } else if (statusBarStyle === 'neon_strip') {
          rules.push(
            '.monaco-workbench .part.statusbar { background: linear-gradient(90deg, rgba(' + neonRgb + ', 0.22) 0%, rgba(' + overlayRgb + ', 0.80) 35%, rgba(' + overlayRgb + ', 0.80) 65%, rgba(' + neonSecRgb + ', 0.24) 100%) !important; border-top: 1px solid rgba(' + neonRgb + ', 0.55) !important; box-shadow: 0 -2px 14px rgba(' + neonRgb + ', 0.22) !important; }',
            '.monaco-workbench .part.statusbar .statusbar-item[id*="quota"] > a { color: #6ee7b7 !important; font-weight: 650 !important; }',
            '.monaco-workbench .part.statusbar .statusbar-item[id*="antigravity.settings"] > a { color: ' + txtLink + ' !important; font-weight: 700 !important; }'
          );
        } else if (statusBarStyle === 'floating_dock') {
          rules.push(
            '.monaco-workbench .part.statusbar { background: transparent !important; border-top: none !important; box-shadow: none !important; }',
            '.monaco-workbench .part.statusbar .statusbar-item:not(.remote-kind):not(.has-background-color) > a { height: 18px !important; margin: 2px 2px !important; padding: 0 8px !important; border-radius: 999px !important; background: rgba(6, 10, 22, 0.42) !important; border: 1px solid rgba(255, 255, 255, 0.16) !important; backdrop-filter: blur(5px) !important; color: ' + txtStrong + ' !important; }',
            '.monaco-workbench .part.statusbar .statusbar-item[id*="antigravity.settings"] > a { background: linear-gradient(135deg, rgba(' + neonRgb + ', 0.40), rgba(' + neonSecRgb + ', 0.30)) !important; border-color: rgba(' + neonRgb + ', 0.55) !important; }'
          );
        } else {
          /* minimal */
          rules.push(
            '.monaco-workbench .part.statusbar { background: ' + (sidebarAlpha <= 0.02 ? 'transparent' : ('rgba(' + overlayRgb + ', ' + Math.min(0.75, sidebarAlpha + 0.12).toFixed(2) + ')')) + ' !important; border-top: ' + (sidebarAlpha <= 0.02 || borderMode === 'none' ? 'none' : ('1px solid ' + chromeBorder)) + ' !important; box-shadow: none !important; color: ' + txtBody + ' !important; }'
          );
        }

        rules.push(
          '.monaco-workbench .monaco-split-view2 > .sash-container > .monaco-sash { background: transparent !important; }',
          '.monaco-workbench .monaco-grid-view > .monaco-split-view2 > .monaco-scrollable-element > .scrollbar, .monaco-workbench .monaco-grid-branch-node > .monaco-split-view2 > .monaco-scrollable-element > .scrollbar { opacity: 0 !important; pointer-events: none !important; }',
          '.monaco-workbench .monaco-split-view2.separator-border > .split-view-container > .split-view-view:not(:first-child)::before { background-color: ' + (borderMode === 'none' ? 'transparent' : chromeBorder) + ' !important; display: ' + (borderMode === 'none' ? 'none' : 'block') + ' !important; }'
        );
      }

      styleEl.textContent = rules.join('\n');

      if (window.electronNative && typeof window.electronNative.setTitleBarOverlay === 'function') {
        try {
          window.electronNative.setTitleBarOverlay({
            color: '#00000000',
            symbolColor: isLight ? '#0f172a' : '#f8fafc',
          });
        } catch (_) {}
      }
    });
  }

  function syncBrowserHole() {
    if (targetKind !== 'chat' || cfg.splitBrowserSafe === false) return;
    var shell = document.querySelector('.agy-shell');
    if (!shell) return;
    var hasHole = document.body.getAttribute('data-has-browser-hole') === 'true';
    var holeEl = hasHole ? shell.querySelector('[data-browser-hole]:not([data-browser-hole="false"])') : null;
    if (holeEl) {
      var sRect = shell.getBoundingClientRect();
      var hRect = holeEl.getBoundingClientRect();
      if (hRect.width > 1 && hRect.height > 1) {
        var l = Math.max(0, Math.round(hRect.left - sRect.left));
        var t = Math.max(0, Math.round(hRect.top - sRect.top));
        var r = Math.max(l, Math.round(hRect.right - sRect.left));
        var b = Math.max(t, Math.round(hRect.bottom - sRect.top));
        shell.style.setProperty(
          '--agy-studio-hole-clip',
          'polygon(evenodd, 0 0, 100% 0, 100% 100%, 0 100%, 0 0, ' + l + 'px ' + t + 'px, ' + r + 'px ' + t + 'px, ' + r + 'px ' + b + 'px, ' + l + 'px ' + b + 'px, ' + l + 'px ' + t + 'px)'
        );
        shell.dataset.agyStudioHole = '1';
        return;
      }
    }
    delete shell.dataset.agyStudioHole;
    shell.style.removeProperty('--agy-studio-hole-clip');
  }

  function syncWelcome() {
    if (isWorkbench) {
      var ideTitleEl = document.querySelector('.antigravity-welcome-header-title');
      if (ideTitleEl) {
        if (!ideTitleEl.dataset.agyOrigTitle) ideTitleEl.dataset.agyOrigTitle = ideTitleEl.textContent || 'Antigravity IDE';
        var customIdeTitle = String(cfg.ideWelcomeTitle || '').trim();
        var nextTitle = customIdeTitle || ideTitleEl.dataset.agyOrigTitle;
        if (ideTitleEl.textContent !== nextTitle) ideTitleEl.textContent = nextTitle;
      }
    }
    var targetText = String(cfg.welcomeText || '').trim();
    var origMap = (window.__AGY_STUDIO_WELCOME_ORIG__ = window.__AGY_STUDIO_WELCOME_ORIG__ || new Map());
    if (!targetText) {
      origMap.forEach(function(orig, node) {
        if (node.isConnected) node.nodeValue = orig;
        if (node.parentElement) node.parentElement.removeAttribute('data-agy-studio-welcome');
      });
      origMap.clear();
      return;
    }
    var skip = '[data-testid="user-message"], [data-testid="agent-response"], .monaco-editor, pre, code, textarea, input, script, style, svg';
    var walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
      acceptNode: function(node) {
        var p = node.parentElement;
        if (!p || p.closest(skip)) return NodeFilter.FILTER_REJECT;
        var v = String(origMap.has(node) ? origMap.get(node) : (node.nodeValue || '')).trim();
        if (!v || v.length > 120) return NodeFilter.FILTER_SKIP;
        if (/^(welcome\s*back|hey\b.*build\s+today)/i.test(v)) return NodeFilter.FILTER_ACCEPT;
        return NodeFilter.FILTER_SKIP;
      }
    });
    var n;
    while ((n = walker.nextNode())) {
      if (!origMap.has(n)) origMap.set(n, n.nodeValue);
      if (n.nodeValue !== targetText) n.nodeValue = targetText;
      if (n.parentElement) n.parentElement.setAttribute('data-agy-studio-welcome', '1');
    }
  }

  Promise.all([mountBackgroundLayer(), mountMascot(), buildAndInjectCss()]).then(function() {
    if (isStaleRun()) return;
    // Automatically garbage-collect stale theme/mascot blob URLs so renderer RAM stays minimal forever!
    pruneUnusedBlobs([
      activeTheme && activeTheme.mediaUrl,
      STATE.mascot && STATE.mascot.mediaUrl,
      STATE.userAvatarUrl,
      STATE.agentAvatarUrl,
      STATE.appLogoUrl,
    ]);
    syncBrowserHole();
    syncWelcome();
    if (isWorkbench) {
      window.__AGY_LAST_LAYOUT_SIG__ = '';
      scheduleLayoutResyncBurst();
      window.addEventListener('resize', scheduleLayoutResyncBurst, { signal: ac.signal });
      window.addEventListener('pointerup', scheduleLayoutResyncBurst, { signal: ac.signal });
      if (typeof ResizeObserver !== 'undefined') {
        var ideRo = new ResizeObserver(scheduleLayoutResyncBurst);
        ideRo.observe(document.body);
        var auxEl = document.querySelector('.part.auxiliarybar');
        if (auxEl) ideRo.observe(auxEl);
        var wf = document.querySelector('iframe.webview');
        if (wf) ideRo.observe(wf);
        window.__AGY_STUDIO_RO__ = ideRo;
      }
      var ideMo = new MutationObserver(function() { reportIdeLayoutToBridge(false); syncWelcome(); });
      ideMo.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['style', 'class'] });
      window.__AGY_STUDIO_MO__ = ideMo;
      // Lightweight drift guard keeps IDE + Chat layout synced & gentle PLL speed-locked (ZERO hard seeks!)
      window.__AGY_STUDIO_INTERVAL__ = setInterval(function() {
        reportIdeLayoutToBridge(false);
        syncVideoFrameClock(false);
      }, 600);
    }
    if (targetKind === 'chat') {
      window.addEventListener('resize', function() { applyUnifiedCanvasGeometry(STATE.ideLayout); }, { signal: ac.signal });
      window.__AGY_STUDIO_INTERVAL__ = setInterval(function() {
        syncVideoFrameClock(true);
      }, 1200);
      var shell = document.querySelector('.agy-shell');
      if (shell && typeof ResizeObserver !== 'undefined') {
        var ro = new ResizeObserver(function() {
          syncBrowserHole();
          applyUnifiedCanvasGeometry(STATE.ideLayout);
        });
        ro.observe(shell);
        window.__AGY_STUDIO_RO__ = ro;
      }
      var mo = new MutationObserver(function() {
        syncBrowserHole();
        syncWelcome();
      });
      mo.observe(document.body, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['data-has-browser-hole', 'data-browser-hole'],
      });
      window.__AGY_STUDIO_MO__ = mo;
    }
  });

  return { ok: true, target: targetKind, unifiedSeamless: unifiedSeamless, theme: activeTheme ? activeTheme.name : null };
}
