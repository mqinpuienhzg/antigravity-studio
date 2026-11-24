'use strict';

const { app, BrowserWindow, dialog, ipcMain, Menu, nativeImage, session, shell, Tray } = require('electron');
const { execFile, spawn } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { LocalMediaServer } = require('./media-server.cjs');
const { StudioStore } = require('./store.cjs');
const { CdpBridge } = require('./cdp-bridge.cjs');
const {
  resolveBinaries,
  searchYouTube,
  inspectUrl,
  downloadOnlineMedia,
} = require('./online-downloader.cjs');

let mainWindow = null;
let tray = null;
let isQuitting = false;
let mediaServer = null;
let store = null;
let cdp = null;
let carouselTimer = null;
let carouselIdx = 0;

function getBootLogPath() {
  try {
    return path.join(app.getPath('userData'), 'antigravity-studio-data', 'boot.log');
  } catch (_) {
    return null;
  }
}

function appendBootLog(message) {
  try {
    const logPath = getBootLogPath();
    if (!logPath) return;
    fs.mkdirSync(path.dirname(logPath), { recursive: true });
    try {
      if (fs.existsSync(logPath) && fs.statSync(logPath).size > 40 * 1024) {
        const tail = fs.readFileSync(logPath, 'utf8').slice(-16 * 1024);
        fs.writeFileSync(logPath, tail, 'utf8');
      }
    } catch (_) {}
    const line = `[${new Date().toISOString()}] ${message}\n`;
    fs.appendFileSync(logPath, line, 'utf8');
  } catch (_) {}
}

function stripJsonc(text) {
  let out = '';
  let inStr = false;
  let escape = false;
  let inLineComment = false;
  let inBlockComment = false;
  const s = String(text || '').replace(/^\uFEFF/, '');
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    const next = s[i + 1];
    if (inLineComment) {
      if (ch === '\n') {
        inLineComment = false;
        out += ch;
      }
      continue;
    }
    if (inBlockComment) {
      if (ch === '*' && next === '/') {
        inBlockComment = false;
        i++;
      }
      continue;
    }
    if (inStr) {
      out += ch;
      if (escape) {
        escape = false;
      } else if (ch === '\\') {
        escape = true;
      } else if (ch === '"') {
        inStr = false;
      }
      continue;
    }
    if (ch === '"') {
      inStr = true;
      out += ch;
      continue;
    }
    if (ch === '/' && next === '/') {
      inLineComment = true;
      i++;
      continue;
    }
    if (ch === '/' && next === '*') {
      inBlockComment = true;
      i++;
      continue;
    }
    out += ch;
  }
  return out.replace(/,\s*([}\]])/g, '$1');
}

// Permanently registers `"remote-debugging-port": "0"` inside Antigravity IDE's official ~/.antigravity-ide/argv.json!
// Antigravity IDE natively reads this allowlisted key on EVERY launch (Start Menu, Taskbar, File Open, Reboot, Auto-Update).
function syncIdeArgvJson() {
  const home = os.homedir();
  const targets = [path.join(home, '.antigravity-ide', 'argv.json')];
  const legacyDir = path.join(home, '.antigravity');
  if (fs.existsSync(legacyDir)) {
    targets.push(path.join(legacyDir, 'argv.json'));
  }

  const updated = [];
  for (const argvPath of targets) {
    try {
      const dir = path.dirname(argvPath);
      fs.mkdirSync(dir, { recursive: true });
      if (!fs.existsSync(argvPath)) {
        const fresh = JSON.stringify({ 'remote-debugging-port': '0' }, null, '\t') + '\n';
        fs.writeFileSync(argvPath, fresh, 'utf8');
        updated.push(argvPath);
        continue;
      }

      const raw = fs.readFileSync(argvPath, 'utf8');
      let parsed = {};
      try {
        parsed = JSON.parse(stripJsonc(raw) || '{}');
      } catch (_) {
        continue; // Never overwrite malformed user argv.json
      }
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) continue;
      if (parsed['remote-debugging-port'] === '0') continue;

      let nextContent = raw;
      const keyRegex = /("remote-debugging-port"\s*:\s*)("[^"]*"|\d+|true|false|null)/;
      if (keyRegex.test(nextContent)) {
        nextContent = nextContent.replace(keyRegex, '$1"0"');
      } else {
        const closeIdx = nextContent.lastIndexOf('}');
        if (closeIdx === -1) continue;
        const before = nextContent.slice(0, closeIdx);
        const after = nextContent.slice(closeIdx);
        const hasKeys = Object.keys(parsed).length > 0;
        let patchedBefore = before;
        if (hasKeys) {
          const lines = patchedBefore.split(/\r?\n/);
          for (let li = lines.length - 1; li >= 0; li--) {
            const strippedLine = lines[li].replace(/\/\/.*$/, '').trim();
            if (!strippedLine || strippedLine === '{') continue;
            if (!strippedLine.endsWith(',')) {
              const commentPos = lines[li].indexOf('//');
              if (commentPos >= 0) {
                lines[li] = lines[li].slice(0, commentPos).replace(/\s+$/, '') + ', ' + lines[li].slice(commentPos);
              } else {
                lines[li] = lines[li].replace(/\s+$/, '') + ',';
              }
            }
            break;
          }
          patchedBefore = lines.join('\n');
        }
        const sep = patchedBefore.endsWith('\n') ? '' : '\n';
        nextContent =
          patchedBefore +
          sep +
          '\n\t// Auto-enabled by Antigravity Studio so custom themes persist across restarts & reboots\n' +
          '\t"remote-debugging-port": "0"\n' +
          after;
      }

      const verified = JSON.parse(stripJsonc(nextContent));
      if (verified['remote-debugging-port'] !== '0') continue;

      const tmpPath = `${argvPath}.studio.tmp`;
      fs.writeFileSync(tmpPath, nextContent, 'utf8');
      fs.renameSync(tmpPath, argvPath);
      updated.push(argvPath);
    } catch (_) {}
  }

  if (updated.length) {
    appendBootLog(`syncIdeArgvJson updated: ${updated.join(', ')}`);
  }
  return updated;
}

function cleanupLegacyStartupRemnants() {
  if (process.platform !== 'win32') return;
  try {
    const appData = process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming');
    const legacyVbsLink = path.join(
      appData,
      'Microsoft',
      'Windows',
      'Start Menu',
      'Programs',
      'Startup',
      'AntigravityCustomTheme.lnk'
    );
    if (fs.existsSync(legacyVbsLink)) {
      fs.unlinkSync(legacyVbsLink);
      appendBootLog(`Removed legacy Startup shortcut: ${legacyVbsLink}`);
    }
  } catch (_) {}

  try {
    execFile(
      'reg.exe',
      ['delete', 'HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run', '/v', 'electron.app.Electron', '/f'],
      () => {}
    );
  } catch (_) {}
}

function parseRgbTriple(rgbStr, fallback = [10, 8, 24]) {
  const parts = String(rgbStr || '').split(',').map((n) => parseInt(n.trim(), 10));
  if (parts.length === 3 && parts.every((n) => Number.isFinite(n))) {
    return parts.map((n) => Math.max(0, Math.min(255, n)));
  }
  return fallback;
}

function parseHexTriple(hexStr, fallback = [129, 140, 248]) {
  const m = String(hexStr || '').trim().replace('#', '');
  const full = m.length === 3 ? m.split('').map((c) => c + c).join('') : m;
  const n = parseInt(full, 16);
  if (!Number.isFinite(n)) return fallback;
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function toHexColor(r, g, b) {
  const h = (v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0');
  return `#${h(r)}${h(g)}${h(b)}`;
}

// Computes a deep, clean theme-matched tone for Windows native WCO controls (live without restart)
function computeMatchedTitlebarColors(config, activeTheme) {
  const isLight = Boolean(config?.isLightMode);
  const ov = parseRgbTriple(isLight ? '240, 244, 252' : (activeTheme?.overlayRgb || '12, 7, 24'));
  const neon = parseHexTriple(config?.neonColor || activeTheme?.accent || '#818cf8');
  const mix = isLight ? 0.04 : 0.06;
  const r = ov[0] * (1 - mix) + neon[0] * mix;
  const g = ov[1] * (1 - mix) + neon[1] * mix;
  const b = ov[2] * (1 - mix) + neon[2] * mix;
  return {
    bgHex: toHexColor(r, g, b),
    fgHex: isLight ? '#0f172a' : '#f1f5f9',
  };
}

function syncIdeWindowSettings(payloadState, forceRestore = false, options = {}) {
  if (process.platform !== 'win32') return;
  const appData = process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming');
  const candidates = [
    path.join(appData, 'Antigravity IDE', 'User', 'settings.json'),
    path.join(appData, 'Antigravity', 'User', 'settings.json'),
  ];
  const cfg = payloadState?.config || {};
  const active = !forceRestore && Boolean(cfg.enabled) && cfg.applyToIde !== false && cfg.syncWindowControls !== false;
  const activeTheme = cfg.unifiedFullWindow !== false
    ? (payloadState?.chatTheme || payloadState?.ideTheme)
    : (payloadState?.ideTheme || payloadState?.chatTheme);
  const { bgHex, fgHex } = computeMatchedTitlebarColors(cfg, activeTheme);
  const setCustomControls = Boolean(options.enableCustomControlsForRestart);

  for (const settingsPath of candidates) {
    if (!fs.existsSync(settingsPath)) continue;
    try {
      const rawText = fs.readFileSync(settingsPath, 'utf8');
      const cleaned = rawText
        .replace(/^\uFEFF/, '')
        .replace(/,\s*([}\]])/g, '$1');
      const parsed = JSON.parse(cleaned || '{}');
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) continue;

      let changed = false;
      const cc = (parsed['workbench.colorCustomizations'] && typeof parsed['workbench.colorCustomizations'] === 'object')
        ? { ...parsed['workbench.colorCustomizations'] }
        : {};

      if (active) {
        // Keep window.controlsStyle="custom" always enabled so Antigravity IDE uses 100% pure crystal transparent — □ ✕ buttons!
        if (parsed['window.controlsStyle'] !== 'custom') {
          parsed['window.controlsStyle'] = 'custom';
          changed = true;
        }
        // Disable xterm opaque WebGL canvas so the integrated Terminal is 100% pure transparent glass over live video!
        if (parsed['terminal.integrated.gpuAcceleration'] !== 'off') {
          parsed['terminal.integrated.gpuAcceleration'] = 'off';
          changed = true;
        }
        const desired = {
          'titleBar.activeBackground': bgHex,
          'titleBar.inactiveBackground': bgHex,
          'titleBar.activeForeground': fgHex,
          'titleBar.inactiveForeground': fgHex,
          'editor.background': bgHex,
          'sideBar.background': bgHex,
          'activityBar.background': bgHex,
          'statusBar.background': bgHex,
          'panel.background': '#00000000',
          'terminal.background': '#00000000',
        };
        for (const [k, v] of Object.entries(desired)) {
          if (cc[k] !== v) {
            cc[k] = v;
            changed = true;
          }
        }
        if (changed) parsed['workbench.colorCustomizations'] = cc;
      } else {
        if (parsed['terminal.integrated.gpuAcceleration'] === 'off') {
          delete parsed['terminal.integrated.gpuAcceleration'];
          changed = true;
        }
        for (const k of [
          'titleBar.activeBackground',
          'titleBar.inactiveBackground',
          'titleBar.activeForeground',
          'titleBar.inactiveForeground',
          'editor.background',
          'sideBar.background',
          'activityBar.background',
          'statusBar.background',
          'panel.background',
          'terminal.background',
        ]) {
          if (Object.prototype.hasOwnProperty.call(cc, k)) {
            delete cc[k];
            changed = true;
          }
        }
        if (Object.keys(cc).length === 0) {
          if (Object.prototype.hasOwnProperty.call(parsed, 'workbench.colorCustomizations')) {
            delete parsed['workbench.colorCustomizations'];
            changed = true;
          }
        } else if (changed) {
          parsed['workbench.colorCustomizations'] = cc;
        }
        if (parsed['window.controlsStyle'] === 'custom') {
          delete parsed['window.controlsStyle'];
          changed = true;
        }
      }

      if (changed) {
        fs.writeFileSync(settingsPath, JSON.stringify(parsed, null, 4), 'utf8');
      }
    } catch (_) {
      // Never overwrite malformed user settings.json
    }
  }
}

function createTrayIcon() {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">
    <defs>
      <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#8b5cf6"/>
        <stop offset="100%" stop-color="#06b6d4"/>
      </linearGradient>
    </defs>
    <rect width="32" height="32" rx="8" fill="#0d1022"/>
    <path d="M16 4 L21 13 L28 16 L21 19 L16 28 L11 19 L4 16 L11 13 Z" fill="url(#g)"/>
  </svg>`;
  const dataUrl = 'data:image/svg+xml;base64,' + Buffer.from(svg).toString('base64');
  return nativeImage.createFromDataURL(dataUrl);
}

function sendToRenderer(channel, payload) {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send(channel, payload);
  }
}

function syncCarouselTimer() {
  if (carouselTimer) {
    clearInterval(carouselTimer);
    carouselTimer = null;
  }
  if (!store || !cdp) return;
  const cfg = store.config;
  if (!cfg.enabled || !cfg.playlistEnabled) return;

  const themes = store.getAllThemes();
  const poolIds = Array.isArray(cfg.playlistIds) && cfg.playlistIds.length > 0
    ? cfg.playlistIds
    : themes.map((t) => t.id);

  if (poolIds.length < 2) return;
  const intervalMs = Math.max(10, Number(cfg.playlistIntervalSec) || 120) * 1000;

  carouselTimer = setInterval(async () => {
    carouselIdx = (carouselIdx + 1) % poolIds.length;
    const nextId = poolIds[carouselIdx];
    const patch = {};
    if (cfg.playlistTarget === 'chat' || cfg.playlistTarget === 'both') patch.chatThemeId = nextId;
    if (cfg.playlistTarget === 'ide' || cfg.playlistTarget === 'both') patch.ideThemeId = nextId;
    store.saveConfig(patch);
    const runtimeState = store.buildRuntimePayloadState();
    syncIdeWindowSettings(runtimeState, false);
    await cdp.applyNow(runtimeState);
    sendToRenderer('studio:state-updated', store.getFullStateForUI());
  }, intervalMs);
}

function getStableStartupExePath() {
  // Inside electron-builder portable .exe, process.execPath points to a temporary extracted folder!
  // PORTABLE_EXECUTABLE_FILE points to the real permanent .exe path on Desktop!
  return process.env.PORTABLE_EXECUTABLE_FILE || process.execPath;
}

function syncWindowsAutoStart(enable) {
  if (process.platform !== 'win32') return;
  try {
    const exePath = getStableStartupExePath();
    // Skip registering dev node_modules\electron\dist\electron.exe as permanent login item
    if (!app.isPackaged && /node_modules[\\/]electron/i.test(exePath)) return;

    // Clear Electron's default unquoted Run value so we own a single properly quoted AntigravityStudio entry
    try {
      app.setLoginItemSettings({ openAtLogin: false, path: exePath, args: ['--tray'] });
    } catch (_) {}
    execFile(
      'reg.exe',
      ['delete', 'HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run', '/v', 'electron.app.Electron', '/f'],
      () => {}
    );

    const runKey = 'HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run';
    const valueName = 'AntigravityStudio';
    if (enable) {
      const quotedCmd = `"${exePath}" --tray`;
      execFile(
        'reg.exe',
        ['add', runKey, '/v', valueName, '/t', 'REG_SZ', '/d', quotedCmd, '/f'],
        (err) => {
          appendBootLog(err ? `syncWindowsAutoStart add failed: ${err.message}` : `syncWindowsAutoStart set: ${quotedCmd}`);
        }
      );
    } else {
      execFile('reg.exe', ['delete', runKey, '/v', valueName, '/f'], () => {
        appendBootLog('syncWindowsAutoStart disabled (removed Run key)');
      });
    }
  } catch (_) {}
}

function revealMainWindow() {
  if (!mainWindow || mainWindow.isDestroyed()) {
    createWindow(false);
  }
  if (!mainWindow) return;
  try {
    const { screen } = require('electron');
    const bounds = mainWindow.getBounds();
    const displays = screen.getAllDisplays();
    const visibleOnAny = displays.some((d) => {
      const wa = d.workArea;
      return (
        bounds.x + bounds.width > wa.x + 60 &&
        bounds.x < wa.x + wa.width - 60 &&
        bounds.y + bounds.height > wa.y + 60 &&
        bounds.y < wa.y + wa.height - 60
      );
    });
    if (!visibleOnAny) mainWindow.center();
  } catch (_) {}

  if (mainWindow.isMinimized()) mainWindow.restore();
  mainWindow.setSkipTaskbar(false);
  mainWindow.show();
  // Brief AlwaysOnTop pulse defeats Windows 10/11 SetForegroundWindow foreground lock 100% reliably!
  try {
    mainWindow.setAlwaysOnTop(true, 'pop-up-menu');
    if (typeof app.focus === 'function') app.focus({ steal: true });
    mainWindow.focus();
    mainWindow.moveTop();
  } catch (_) {}
  setTimeout(() => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      try {
        mainWindow.setAlwaysOnTop(false);
        mainWindow.focus();
      } catch (_) {}
    }
  }, 220);
}

function createWindow(startHidden = false) {
  const { screen } = require('electron');
  const work = screen.getPrimaryDisplay()?.workAreaSize || { width: 1600, height: 960 };
  const initW = Math.min(1560, Math.max(1180, work.width - 40));
  const initH = Math.min(930, Math.max(720, work.height - 40));
  mainWindow = new BrowserWindow({
    width: initW,
    height: initH,
    minWidth: 1120,
    minHeight: 700,
    center: true,
    frame: false,
    show: !startHidden,
    backgroundColor: '#090b14',
    title: 'Antigravity Studio — by mqinpuienhzg',
    icon: createTrayIcon(),
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: false,
      webviewTag: true,
    },
  });

  mainWindow.once('ready-to-show', () => {
    if (!startHidden) {
      revealMainWindow();
    }
  });

  // Fallback timer in case ready-to-show fires late on slow systems
  if (!startHidden) {
    setTimeout(() => {
      if (mainWindow && !mainWindow.isDestroyed() && !mainWindow.isVisible()) {
        revealMainWindow();
      }
    }, 1200);
  }

  const devUrl = process.env.VITE_DEV_URL;
  const distHtml = path.join(__dirname, '..', 'dist-ui', 'index.html');

  if (devUrl) {
    mainWindow.loadURL(devUrl);
  } else if (fs.existsSync(distHtml)) {
    mainWindow.loadFile(distHtml);
  } else {
    mainWindow.loadURL('http://127.0.0.1:5179');
  }

  mainWindow.on('close', (e) => {
    if (!isQuitting && store?.config?.minimizeToTray) {
      e.preventDefault();
      mainWindow.hide();
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function createTray() {
  tray = new Tray(createTrayIcon());
  tray.setToolTip('Antigravity Studio by mqinpuienhzg — Bấm để mở giao diện');
  const menu = Menu.buildFromTemplate([
    {
      label: 'Mở Antigravity Studio',
      click: () => revealMainWindow(),
    },
    { type: 'separator' },
    {
      label: 'Áp Dụng Theme Tức Thì',
      click: async () => {
        if (store && cdp) {
          store.saveConfig({ enabled: true });
          const runtimeState = store.buildRuntimePayloadState();
          syncIdeWindowSettings(runtimeState, false);
          await cdp.applyNow(runtimeState);
          sendToRenderer('studio:state-updated', store.getFullStateForUI());
        }
      },
    },
    {
      label: 'Tắt 1 Chạm (Về Giao Diện Gốc)',
      click: async () => {
        if (store && cdp) {
          store.saveConfig({ enabled: false });
          syncIdeWindowSettings(store.buildRuntimePayloadState(), true);
          await cdp.disableAll();
          sendToRenderer('studio:state-updated', store.getFullStateForUI());
        }
      },
    },
    { type: 'separator' },
    {
      label: 'Thoát Hoàn Toàn',
      click: () => {
        isQuitting = true;
        app.quit();
      },
    },
  ]);
  tray.setContextMenu(menu);
  tray.on('click', () => revealMainWindow());
  tray.on('double-click', () => revealMainWindow());
}

function patchWindowsShortcutsForCdp() {
  return new Promise((resolve) => {
    const argvUpdated = syncIdeArgvJson();
    if (process.platform !== 'win32') {
      resolve({
        ok: true,
        argvUpdated,
        message: argvUpdated.length
          ? 'Đã bật CDP vĩnh viễn trong ~/.antigravity-ide/argv.json.'
          : 'Cấu hình argv.json CDP đã sẵn sàng.',
      });
      return;
    }
    const ps = `
      $Wsh = New-Object -ComObject WScript.Shell
      $Dirs = @(
        [Environment]::GetFolderPath('DesktopDirectory'),
        [Environment]::GetFolderPath('Programs'),
        [Environment]::GetFolderPath('Startup'),
        (Join-Path $env:APPDATA 'Microsoft\\Internet Explorer\\Quick Launch\\User Pinned\\TaskBar')
      ) | Where-Object { $_ -and (Test-Path $_) }
      $Patched = @()
      foreach ($d in $Dirs) {
        Get-ChildItem -Path $d -Recurse -Filter '*.lnk' -ErrorAction SilentlyContinue | ForEach-Object {
          try {
            $sc = $Wsh.CreateShortcut($_.FullName)
            if ($sc.TargetPath -and ($sc.TargetPath -imatch '\\\\Antigravity(?: IDE)?\\.exe$')) {
              if ($sc.Arguments -notmatch '--remote-debugging-port') {
                $sc.Arguments = ("$($sc.Arguments) --remote-debugging-port=0").Trim()
                $sc.Save()
                $Patched += $_.FullName
              }
            }
          } catch {}
        }
      }
      Write-Output ($Patched -join '|')
    `;
    execFile('powershell.exe', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', ps], (err, stdout) => {
      if (err) {
        resolve({
          ok: argvUpdated.length > 0,
          argvUpdated,
          message: argvUpdated.length
            ? 'Đã bật CDP vĩnh viễn trong argv.json (mọi cách mở IDE đều tự nhận theme).'
            : err.message,
        });
      } else {
        const list = String(stdout || '').trim().split('|').filter(Boolean);
        resolve({
          ok: true,
          patched: list,
          argvUpdated,
          message:
            list.length || argvUpdated.length
              ? `Đã khóa CDP vĩnh viễn trong argv.json${list.length ? ` và ${list.length} shortcut` : ''}!`
              : 'argv.json & các shortcut Antigravity đã sẵn sàng cờ CDP vĩnh viễn.',
        });
      }
    });
  });
}

function findAntigravityExe() {
  const localApp = process.env.LOCALAPPDATA || path.join(os.homedir(), 'AppData', 'Local');
  const candidates = [
    path.join(localApp, 'Programs', 'Antigravity IDE', 'Antigravity IDE.exe'),
    path.join(localApp, 'Programs', 'Antigravity', 'Antigravity.exe'),
  ];
  return candidates.find((p) => fs.existsSync(p)) || null;
}

function restartAntigravityWithCdp() {
  return new Promise((resolve) => {
    syncIdeArgvJson();
    // Enable 100% pure crystal transparent custom DOM window controls right before restarting IDE!
    if (store && store.config.enabled && store.config.syncWindowControls !== false) {
      syncIdeWindowSettings(store.buildRuntimePayloadState(), false, { enableCustomControlsForRestart: true });
    }
    const exe = findAntigravityExe();
    if (!exe) {
      resolve({ ok: false, message: 'Không tìm thấy file cài đặt Antigravity IDE.exe.' });
      return;
    }
    const exeName = path.basename(exe);
    execFile('taskkill', ['/IM', exeName, '/F'], () => {
      setTimeout(() => {
        try {
          const child = spawn(exe, ['--remote-debugging-port=0'], {
            detached: true,
            stdio: 'ignore',
          });
          child.unref();
          resolve({ ok: true, message: `Đã khởi động lại ${exeName} với CDP.` });
        } catch (err) {
          resolve({ ok: false, message: err.message });
        }
      }, 900);
    });
  });
}

function setupEmbeddedBrowserDownloads() {
  try {
    session.defaultSession.on('will-download', (_event, item, webContents) => {
      if (!store) return;
      const rawName = item.getFilename() || `media-${Date.now()}.mp4`;
      const ext = path.extname(rawName).toLowerCase();
      const mediaExts = new Set(['.mp4', '.webm', '.mov', '.m4v', '.ogg', '.gif', '.webp', '.png', '.jpg', '.jpeg', '.svg', '.avif']);
      if (!mediaExts.has(ext)) return;

      const pageUrl = (webContents && typeof webContents.getURL === 'function' ? webContents.getURL() : '') || '';
      const isStickerSite = /tenor\.com|giphy\.com/i.test(pageUrl) || ext === '.gif';
      const safeBase = path.basename(rawName, ext).replace(/[^a-zA-Z0-9_\-\u00C0-\u024F\u1E00-\u1EFF ]+/g, '_').slice(0, 64) || 'theme';
      const destDir = isStickerSite ? store.customAssetsDir : store.extraThemesDir;
      fs.mkdirSync(destDir, { recursive: true });
      const savePath = path.join(destDir, `${safeBase}-${Date.now().toString(36)}${ext}`);
      item.setSavePath(savePath);

      const dlId = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      sendToRenderer('studio:web-download-progress', {
        id: dlId,
        filename: rawName,
        percent: 5,
        state: 'progressing',
      });

      item.on('updated', (_ev, state) => {
        if (state === 'progressing') {
          const total = item.getTotalBytes();
          const got = item.getReceivedBytes();
          const pct = total > 0 ? Math.min(99, Math.round((got / total) * 100)) : 35;
          sendToRenderer('studio:web-download-progress', {
            id: dlId,
            filename: rawName,
            percent: pct,
            state: 'progressing',
          });
        }
      });

      item.once('done', (_ev, state) => {
        if (state === 'completed' && fs.existsSync(savePath)) {
          let created = null;
          let kind = 'theme';
          if (isStickerSite) {
            created = store.importMascotFile(savePath);
            kind = 'mascot';
          } else {
            store.rescanExtraFolderThemes();
            const norm = path.resolve(savePath).toLowerCase();
            created = store.getAllThemes().find((t) => t.filePath && path.resolve(t.filePath).toLowerCase() === norm) || null;
          }
          sendToRenderer('studio:state-updated', store.getFullStateForUI());
          sendToRenderer('studio:web-download-done', { id: dlId, filename: rawName, kind, item: created });
        } else {
          sendToRenderer('studio:web-download-progress', {
            id: dlId,
            filename: rawName,
            percent: 0,
            state: 'failed',
          });
        }
      });
    });
  } catch (_) {}
}

function registerIpc() {
  ipcMain.handle('studio:get-state', () => ({
    ...store.getFullStateForUI(),
    cdpStatus: cdp.getStatus(),
    onlineBins: resolveBinaries(),
  }));

  ipcMain.handle('studio:update-config', async (_ev, patch) => {
    const prevChat = store.config.chatThemeId;
    const prevIde = store.config.ideThemeId;
    store.saveConfig(patch || {});
    if (patch?.chatThemeId && patch.chatThemeId !== prevChat) {
      store.recordThemeHistory(patch.chatThemeId);
    } else if (patch?.ideThemeId && patch.ideThemeId !== prevIde) {
      store.recordThemeHistory(patch.ideThemeId);
    }
    syncCarouselTimer();
    const state = store.getFullStateForUI();
    const runtimeState = store.buildRuntimePayloadState();
    syncIdeWindowSettings(runtimeState, !store.config.enabled);
    if (store.config.autoApplyOnChange) {
      if (store.config.enabled) {
        await cdp.applyNow(runtimeState);
      } else {
        await cdp.disableAll();
      }
    }
    return state;
  });

  ipcMain.handle('studio:save-combo', (_ev, name) => {
    const combo = store.saveCombo(name);
    return { ok: Boolean(combo), combo, state: store.getFullStateForUI() };
  });

  ipcMain.handle('studio:apply-combo', async (_ev, comboId) => {
    const combo = store.applyCombo(comboId);
    if (!combo) return { ok: false, state: store.getFullStateForUI() };
    syncCarouselTimer();
    const runtimeState = store.buildRuntimePayloadState();
    syncIdeWindowSettings(runtimeState, false);
    await cdp.applyNow(runtimeState);
    return { ok: true, combo, state: store.getFullStateForUI() };
  });

  ipcMain.handle('studio:delete-combo', (_ev, comboId) => {
    const removed = store.deleteCombo(comboId);
    return { ok: removed, state: store.getFullStateForUI() };
  });

  ipcMain.handle('studio:randomize-theme', async (_ev, opts = {}) => {
    const all = store.getAllThemes();
    const pool = opts.onlyVideo
      ? all.filter((t) => t.mediaType === 'video')
      : all;
    const candidates = pool.filter((t) => t.id !== store.config.chatThemeId);
    const list = candidates.length ? candidates : pool;
    if (!list.length) return { ok: false, state: store.getFullStateForUI() };
    const picked = list[Math.floor(Math.random() * list.length)];
    const patch = {
      enabled: true,
      chatThemeId: picked.id,
      ideThemeId: store.config.unifiedFullWindow !== false ? picked.id : store.config.ideThemeId,
    };
    if (opts.syncAccent !== false && picked.accent) {
      patch.neonColor = picked.accent;
      if (picked.secondary) patch.neonSecondary = picked.secondary;
    }
    if (opts.randomMascot) {
      const mascots = store.getAllMascots();
      if (mascots.length) {
        const mp = mascots[Math.floor(Math.random() * mascots.length)];
        patch.mascotId = mp.id;
        patch.mascotEnabled = true;
      }
    }
    store.saveConfig(patch);
    store.recordThemeHistory(picked.id);
    const runtimeState = store.buildRuntimePayloadState();
    syncIdeWindowSettings(runtimeState, false);
    await cdp.applyNow(runtimeState);
    return { ok: true, theme: picked, state: store.getFullStateForUI() };
  });

  ipcMain.handle('studio:apply-now', async () => {
    store.saveConfig({ enabled: true });
    syncCarouselTimer();
    const runtimeState = store.buildRuntimePayloadState();
    syncIdeWindowSettings(runtimeState, false);
    const res = await cdp.applyNow(runtimeState);
    return { ...res, state: store.getFullStateForUI() };
  });

  ipcMain.handle('studio:disable-theme', async () => {
    store.saveConfig({ enabled: false });
    syncCarouselTimer();
    syncIdeWindowSettings(store.buildRuntimePayloadState(), true);
    const res = await cdp.disableAll();
    return { ...res, state: store.getFullStateForUI() };
  });

  ipcMain.handle('studio:reset-config', async () => {
    store.resetConfig();
    syncCarouselTimer();
    const runtimeState = store.buildRuntimePayloadState();
    syncIdeWindowSettings(runtimeState, false);
    await cdp.applyNow(runtimeState);
    return store.getFullStateForUI();
  });

  ipcMain.handle('studio:import-files', async () => {
    const res = await dialog.showOpenDialog(mainWindow, {
      title: 'Chọn Ảnh / Video nền (MP4, WebM, GIF, PNG, WebP, JPG, SVG)',
      properties: ['openFile', 'multiSelections'],
      filters: [
        { name: 'Media Theme (Video & Ảnh)', extensions: ['mp4', 'webm', 'mov', 'm4v', 'gif', 'webp', 'png', 'jpg', 'jpeg', 'svg'] },
        { name: 'Video Động', extensions: ['mp4', 'webm', 'mov', 'm4v'] },
        { name: 'Hình Ảnh', extensions: ['png', 'jpg', 'jpeg', 'webp', 'gif', 'svg'] },
      ],
    });
    if (res.canceled || !res.filePaths.length) return { added: 0, state: store.getFullStateForUI() };
    const added = store.importThemeFiles(res.filePaths, { copyIntoStudio: false });
    return { added: added.length, items: added, state: store.getFullStateForUI() };
  });

  ipcMain.handle('studio:scan-folder', async () => {
    const res = await dialog.showOpenDialog(mainWindow, {
      title: 'Chọn thư mục chứa ảnh/video (hỗ trợ cả thư mục Wallpaper Engine)',
      properties: ['openDirectory'],
    });
    if (res.canceled || !res.filePaths.length) return { added: 0, state: store.getFullStateForUI() };
    const added = store.scanFolderForThemes(res.filePaths[0], 3);
    return { added: added.length, folder: res.filePaths[0], state: store.getFullStateForUI() };
  });

  ipcMain.handle('studio:import-paths', async (_ev, filePaths) => {
    const added = store.importThemeFiles(Array.isArray(filePaths) ? filePaths : [], { copyIntoStudio: false });
    return { added: added.length, state: store.getFullStateForUI() };
  });

  ipcMain.handle('studio:delete-theme', async (_ev, themeId) => {
    const removed = store.deleteUserTheme(themeId);
    return { removed, state: store.getFullStateForUI() };
  });

  ipcMain.handle('studio:restore-trash-theme', async (_ev, themeId) => {
    const restored = store.restoreTrashTheme(themeId);
    return { restored, state: store.getFullStateForUI() };
  });

  ipcMain.handle('studio:delete-trash-forever', async (_ev, themeId) => {
    const removed = store.deleteTrashForever(themeId);
    return { removed, state: store.getFullStateForUI() };
  });

  ipcMain.handle('studio:empty-trash', async () => {
    store.emptyTrash();
    return { ok: true, state: store.getFullStateForUI() };
  });

  ipcMain.handle('studio:import-mascot', async () => {
    const res = await dialog.showOpenDialog(mainWindow, {
      title: 'Chọn Linh Thú / Sticker (GIF, WebP, PNG, SVG, WebM)',
      properties: ['openFile'],
      filters: [{ name: 'Linh Thú & Sticker', extensions: ['gif', 'webp', 'png', 'svg', 'webm', 'mp4'] }],
    });
    if (res.canceled || !res.filePaths.length) return { ok: false, state: store.getFullStateForUI() };
    const item = store.importMascotFile(res.filePaths[0]);
    if (item) {
      store.saveConfig({ mascotEnabled: true, mascotId: item.id });
      if (store.config.autoApplyOnChange && store.config.enabled) {
        await cdp.applyNow(store.buildRuntimePayloadState());
      }
    }
    return { ok: Boolean(item), item, state: store.getFullStateForUI() };
  });

  ipcMain.handle('studio:delete-mascot', async (_ev, mascotId) => {
    const removed = store.deleteUserMascot(mascotId);
    return { removed, state: store.getFullStateForUI() };
  });

  ipcMain.handle('studio:import-avatar', async (_ev, role) => {
    const res = await dialog.showOpenDialog(mainWindow, {
      title: role === 'agent' ? 'Chọn Avatar cho AI Agent' : 'Chọn Avatar cho Người Dùng',
      properties: ['openFile'],
      filters: [{ name: 'Hình Ảnh', extensions: ['png', 'jpg', 'jpeg', 'webp', 'gif', 'svg'] }],
    });
    if (res.canceled || !res.filePaths.length) return { ok: false, state: store.getFullStateForUI() };
    const item = store.importAvatarFile(res.filePaths[0], role);
    if (item && store.config.autoApplyOnChange && store.config.enabled) {
      await cdp.applyNow(store.buildRuntimePayloadState());
    }
    return { ok: Boolean(item), item, state: store.getFullStateForUI() };
  });

  // Online / YouTube Downloader IPC
  ipcMain.handle('studio:online-search', async (_ev, query) => {
    try {
      const items = await searchYouTube(query, 8);
      return { ok: true, items };
    } catch (err) {
      return { ok: false, error: err.message, items: [] };
    }
  });

  ipcMain.handle('studio:online-inspect', async (_ev, url) => {
    try {
      const info = await inspectUrl(url);
      return { ok: true, info };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  });

  ipcMain.handle('studio:online-download', async (_ev, opts) => {
    try {
      const dlDir = path.join(store.customAssetsDir, 'online-downloads');
      const result = await downloadOnlineMedia({
        url: opts.url,
        title: opts.title,
        destDir: dlDir,
        quality: opts.quality || '1080',
        durationSec: opts.durationSec !== undefined ? opts.durationSec : 25,
        startSec: opts.startSec || 0,
        keepAudio: Boolean(opts.keepAudio),
        onProgress: (p) => sendToRenderer('studio:download-progress', p),
      });

      const added = store.importThemeFiles([result.filePath], {
        copyIntoStudio: false,
        customTitle: result.title,
        customConcept: 'Video YouTube / Internet HD',
      });
      const created = added[0];
      if (created && opts.applyTarget) {
        const patch = { enabled: true };
        if (opts.applyTarget === 'chat' || opts.applyTarget === 'both') patch.chatThemeId = created.id;
        if (opts.applyTarget === 'ide' || opts.applyTarget === 'both') patch.ideThemeId = created.id;
        store.saveConfig(patch);
        const runtimeState = store.buildRuntimePayloadState();
        syncIdeWindowSettings(runtimeState, false);
        await cdp.applyNow(runtimeState);
      }
      return { ok: true, theme: created, state: store.getFullStateForUI() };
    } catch (err) {
      sendToRenderer('studio:download-progress', { percent: 0, stage: '', error: err.message });
      return { ok: false, error: err.message };
    }
  });

  ipcMain.handle('studio:cdp-status', () => cdp.getStatus());
  ipcMain.handle('studio:cdp-inspect', () => cdp.inspectTargets());
  ipcMain.handle('studio:patch-shortcuts', () => patchWindowsShortcutsForCdp());
  ipcMain.handle('studio:restart-antigravity', () => restartAntigravityWithCdp());

  ipcMain.handle('studio:next-playlist', async () => {
    const themes = store.getAllThemes();
    const pool = store.config.playlistIds?.length ? store.config.playlistIds : themes.map((t) => t.id);
    if (!pool.length) return store.getFullStateForUI();
    carouselIdx = (carouselIdx + 1) % pool.length;
    const nextId = pool[carouselIdx];
    const patch = {};
    if (store.config.playlistTarget === 'chat' || store.config.playlistTarget === 'both') patch.chatThemeId = nextId;
    if (store.config.playlistTarget === 'ide' || store.config.playlistTarget === 'both') patch.ideThemeId = nextId;
    store.saveConfig(patch);
    if (store.config.enabled) {
      const runtimeState = store.buildRuntimePayloadState();
      syncIdeWindowSettings(runtimeState, false);
      await cdp.applyNow(runtimeState);
    }
    return store.getFullStateForUI();
  });

  ipcMain.handle('studio:export-backup', async () => {
    const res = await dialog.showSaveDialog(mainWindow, {
      title: 'Lưu bản sao lưu Antigravity Studio',
      defaultPath: `antigravity-studio-backup-${new Date().toISOString().slice(0, 10)}.json`,
      filters: [{ name: 'JSON Backup', extensions: ['json'] }],
    });
    if (res.canceled || !res.filePath) return { ok: false };
    fs.writeFileSync(res.filePath, store.exportBackupJson(), 'utf8');
    return { ok: true, filePath: res.filePath };
  });

  ipcMain.handle('studio:import-backup', async () => {
    const res = await dialog.showOpenDialog(mainWindow, {
      title: 'Khôi phục bản sao lưu JSON',
      properties: ['openFile'],
      filters: [{ name: 'JSON Backup', extensions: ['json'] }],
    });
    if (res.canceled || !res.filePaths.length) return { ok: false };
    try {
      const content = fs.readFileSync(res.filePaths[0], 'utf8');
      const state = store.importBackupJson(content);
      syncCarouselTimer();
      if (store.config.enabled) await cdp.applyNow(store.buildRuntimePayloadState());
      return { ok: true, state };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  });

  ipcMain.handle('studio:capture-preview', async () => {
    if (!mainWindow) return { ok: false };
    const img = await mainWindow.webContents.capturePage();
    const res = await dialog.showSaveDialog(mainWindow, {
      title: 'Lưu ảnh chụp Antigravity Studio',
      defaultPath: `antigravity-studio-preview-${Date.now()}.png`,
      filters: [{ name: 'PNG Image', extensions: ['png'] }],
    });
    if (res.canceled || !res.filePath) return { ok: false };
    fs.writeFileSync(res.filePath, img.toPNG());
    return { ok: true, filePath: res.filePath };
  });

  ipcMain.handle('studio:open-data-folder', () => {
    shell.openPath(store.baseDir);
    return { ok: true };
  });

  ipcMain.handle('studio:open-extra-themes-folder', () => {
    fs.mkdirSync(store.extraThemesDir, { recursive: true });
    shell.openPath(store.extraThemesDir);
    return { ok: true, dir: store.extraThemesDir };
  });

  ipcMain.handle('studio:rescan-extra-themes', () => {
    const found = store.rescanExtraFolderThemes();
    return { ok: true, count: found.length, state: store.getFullStateForUI() };
  });

  ipcMain.handle('studio:toggle-startup', (_ev, enable) => {
    try {
      syncWindowsAutoStart(Boolean(enable));
      store.saveConfig({ autoStartWindows: Boolean(enable) });
      return { ok: true, enabled: Boolean(enable) };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  });

  ipcMain.on('window:minimize', () => mainWindow?.minimize());
  ipcMain.on('window:maximize', () => {
    if (!mainWindow) return;
    if (mainWindow.isMaximized()) mainWindow.unmaximize();
    else mainWindow.maximize();
  });
  ipcMain.on('window:close', () => mainWindow?.close());
}

const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on('second-instance', (_ev, commandLine) => {
    const silentTray = Array.isArray(commandLine) && commandLine.includes('--tray');
    appendBootLog(`second-instance triggered (silentTray=${silentTray})`);
    if (silentTray) {
      if (cdp) cdp.scan();
      return;
    }
    revealMainWindow();
  });

  app.whenReady().then(async () => {
    const startHidden = process.argv.includes('--tray');
    appendBootLog(`App ready (v${app.getVersion()}, packaged=${app.isPackaged}, hidden=${startHidden}, exe=${getStableStartupExePath()})`);

    cleanupLegacyStartupRemnants();
    syncIdeArgvJson();

    mediaServer = new LocalMediaServer();
    await mediaServer.start();
    appendBootLog(`Media server listening on 127.0.0.1:${mediaServer.port}`);

    store = new StudioStore(app.getPath('userData'), mediaServer);
    syncIdeWindowSettings(store.buildRuntimePayloadState(), !store.config.enabled);
    cdp = new CdpBridge(() => store.buildRuntimePayloadState(), appendBootLog);
    cdp.on('status', (status) => {
      sendToRenderer('studio:cdp-status', status);
    });

    registerIpc();
    setupEmbeddedBrowserDownloads();
    createTray();
    createWindow(startHidden);
    cdp.start();
    syncCarouselTimer();
    // Auto-ensure clean quoted Windows background startup guard + native argv.json CDP + shortcut flags!
    syncWindowsAutoStart(store.config.autoStartWindows !== false);
    patchWindowsShortcutsForCdp().catch(() => {});
  });

  app.on('before-quit', () => {
    isQuitting = true;
    if (carouselTimer) clearInterval(carouselTimer);
    if (cdp) cdp.stop();
    if (mediaServer) mediaServer.stop();
  });

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin' && !store?.config?.minimizeToTray) {
      app.quit();
    }
  });
}
