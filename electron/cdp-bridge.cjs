'use strict';

const EventEmitter = require('events');
const { execFile } = require('child_process');
const fs = require('fs');
const http = require('http');
const os = require('os');
const path = require('path');
const { buildInjectScript, buildRemoveScript } = require('./injector-payload.cjs');

class CdpBridge extends EventEmitter {
  constructor(getPayloadState, logFn = null) {
    super();
    this.getPayloadState = getPayloadState;
    this.logFn = typeof logFn === 'function' ? logFn : () => {};
    this.sessions = new Map();
    this.activePort = null;
    this.activePortFile = null;
    this.pollTimer = null;
    this.portWatchers = [];
    this.browserWs = null;
    this.browserWsPort = null;
    this.lastStatusJson = '';
    this.isDisabled = false;
    this.ideLayout = null; // { parentW, parentH, offsetX, offsetY }
    this._scanning = false;
    this._rescanPending = false;
  }

  getCandidatePortFiles() {
    const home = os.homedir();
    const list = [];
    if (process.env.AGY_PORT_FILE) list.push(process.env.AGY_PORT_FILE);
    if (process.platform === 'win32') {
      const appData = process.env.APPDATA || path.join(home, 'AppData', 'Roaming');
      list.push(
        path.join(appData, 'Antigravity IDE', 'DevToolsActivePort'),
        path.join(appData, 'antigravity', 'DevToolsActivePort'),
        path.join(appData, 'Antigravity', 'DevToolsActivePort')
      );
    } else if (process.platform === 'darwin') {
      const appSupport = path.join(home, 'Library', 'Application Support');
      list.push(
        path.join(appSupport, 'Antigravity IDE', 'DevToolsActivePort'),
        path.join(appSupport, 'antigravity', 'DevToolsActivePort'),
        path.join(appSupport, 'Antigravity', 'DevToolsActivePort')
      );
    } else {
      const xdg = process.env.XDG_CONFIG_HOME || path.join(home, '.config');
      list.push(
        path.join(xdg, 'Antigravity IDE', 'DevToolsActivePort'),
        path.join(xdg, 'antigravity', 'DevToolsActivePort'),
        path.join(xdg, 'Antigravity', 'DevToolsActivePort')
      );
    }
    return [...new Set(list)];
  }

  fetchJson(url, timeoutMs = 1500) {
    return new Promise((resolve, reject) => {
      const req = http.get(url, { timeout: timeoutMs }, (res) => {
        let body = '';
        res.on('data', (c) => { body += c; });
        res.on('end', () => {
          try {
            resolve(JSON.parse(body));
          } catch (err) {
            reject(err);
          }
        });
      });
      req.on('timeout', () => req.destroy(new Error('HTTP timeout')));
      req.on('error', reject);
    });
  }

  probeListeningIdePortsWindows() {
    return new Promise((resolve) => {
      if (process.platform !== 'win32') {
        resolve([]);
        return;
      }
      const ps = `
        $pids = Get-Process -Name 'Antigravity IDE','Antigravity' -ErrorAction SilentlyContinue | Select-Object -ExpandProperty Id
        if (-not $pids) { return }
        $ports = Get-NetTCPConnection -State Listen -LocalAddress '127.0.0.1' -ErrorAction SilentlyContinue |
          Where-Object { $pids -contains $_.OwningProcess } |
          Select-Object -ExpandProperty LocalPort -Unique
        Write-Output ($ports -join ',')
      `;
      execFile('powershell.exe', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', ps], { timeout: 2500 }, (_err, stdout) => {
        const list = String(stdout || '')
          .split(',')
          .map((s) => parseInt(s.trim(), 10))
          .filter((n) => Number.isFinite(n) && n > 1024 && n < 65535);
        resolve(list);
      });
    });
  }

  async discoverLivePort() {
    const files = this.getCandidatePortFiles().filter((p) => fs.existsSync(p));
    files.sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs);

    for (const file of files) {
      try {
        const firstLine = fs.readFileSync(file, 'utf8').trim().split(/\r?\n/)[0];
        const port = parseInt(firstLine, 10);
        if (!Number.isFinite(port) || port <= 0) continue;
        const targets = await this.fetchJson(`http://127.0.0.1:${port}/json`, 1200);
        if (Array.isArray(targets)) {
          return { port, file, targets };
        }
      } catch (_) {}
    }

    // If our previously connected port is still alive (e.g. a transient CLI/window overwrote DevToolsActivePort), keep using it!
    if (this.activePort) {
      try {
        const targets = await this.fetchJson(`http://127.0.0.1:${this.activePort}/json`, 900);
        if (Array.isArray(targets)) {
          return { port: this.activePort, file: this.activePortFile || 'live-port', targets };
        }
      } catch (_) {}
    }

    // Fallback: probe live loopback ports owned by running Antigravity IDE processes (throttled to every 1.8s when waiting!)
    const now = Date.now();
    if (!this._lastFallbackProbe || now - this._lastFallbackProbe > 1800) {
      this._lastFallbackProbe = now;
      const candidatePorts = await this.probeListeningIdePortsWindows();
      for (const port of candidatePorts) {
        try {
          const targets = await this.fetchJson(`http://127.0.0.1:${port}/json`, 800);
          if (Array.isArray(targets) && targets.some((t) => this.classifyTarget(t))) {
            return { port, file: 'process-probe', targets };
          }
        } catch (_) {}
      }
    }

    return null;
  }

  classifyTarget(t) {
    if (!t || (t.type !== 'page' && t.type !== 'iframe') || !t.webSocketDebuggerUrl) return null;
    const url = String(t.url || '');
    if (url.startsWith('devtools://') || url.startsWith('chrome-extension://')) {
      return null;
    }
    if (url.includes('workbench') || url.startsWith('vscode-file://')) return 'ide';
    if (url.includes('127.0.0.1') || url.includes('launchpad')) return 'chat';
    if (url.startsWith('vscode-webview://')) return 'webview';
    return null;
  }

  async queryIdeLayoutNow() {
    let fallback = null;
    for (const s of this.sessions.values()) {
      if (s.kind !== 'ide' || !s.ready) continue;
      try {
        const res = await s.evaluate(`(() => {
          const f = document.querySelector('iframe.webview.ready') || document.querySelector('iframe.webview');
          const r = f ? f.getBoundingClientRect() : null;
          return {
            parentW: window.innerWidth,
            parentH: window.innerHeight,
            offsetX: r ? Math.round(r.left) : 0,
            offsetY: r ? Math.round(r.top) : 0,
            frameW: r ? Math.round(r.width) : 0,
            frameH: r ? Math.round(r.height) : 0
          };
        })()`, true);
        const val = res?.result?.value;
        if (val && val.parentW > 0) {
          if (val.frameW > 20 && val.frameH > 20) {
            this.ideLayout = val;
            return val;
          }
          if (!fallback) fallback = val;
        }
      } catch (_) {}
    }
    if (fallback) {
      this.ideLayout = fallback;
      return fallback;
    }
    return this.ideLayout;
  }

  buildHealthCheckExpr(state, kind) {
    if (kind === 'webview') {
      return `(() => {
        const st = document.getElementById('agy-studio-style');
        let innerOk = true;
        const af = document.querySelector('iframe#active-frame');
        if (af) {
          try {
            if (af.contentDocument && af.contentDocument.head) {
              innerOk = !!af.contentDocument.getElementById('agy-studio-style');
            }
          } catch (_) {}
        }
        return { readyDom: !!document.body, ok: !!(st && st.textContent && st.textContent.length > 30 && innerOk), layoutStale: false };
      })()`;
    }
    const cfg = state?.config || {};
    const sameThemeOnBoth = Boolean(state?.chatTheme && state?.ideTheme && state.chatTheme.id === state.ideTheme.id);
    const unified = (cfg.unifiedFullWindow !== false || sameThemeOnBoth) && cfg.applyToIde !== false;
    const activeTheme = unified
      ? (state?.chatTheme || state?.ideTheme)
      : (kind === 'ide' ? state?.ideTheme : state?.chatTheme);
    const expectVideo = Boolean(activeTheme && activeTheme.mediaUrl && activeTheme.mediaType === 'video');
    const expectImage = Boolean(activeTheme && activeTheme.mediaUrl && activeTheme.mediaType !== 'video');
    const expectPassThroughChat = kind === 'chat' && unified;

    return `(() => {
      const st = document.getElementById('agy-studio-style');
      const bg = document.getElementById('agy-studio-bg-layer');
      const wb = document.querySelector('.monaco-workbench');
      const sh = document.querySelector('.agy-shell');
      const styleOk = !!(st && st.textContent && st.textContent.length > 50);
      // Embedded standalone subviews (Antigravity Settings) & embedded unified Chat use 1-video pass-through over Workbench!
      if (!wb && window.self !== window.top && (location.hostname === '127.0.0.1' || location.hostname === 'localhost')) {
        if (!sh) return { readyDom: !!document.body, ok: styleOk && !bg, layoutStale: false };
        if (${expectPassThroughChat}) return { readyDom: true, ok: styleOk && !bg, layoutStale: false };
      }
      const readyDom = !!(wb || sh);
      const hostOk = wb ? (bg && wb.contains(bg)) : (sh ? (bg && sh.contains(bg)) : !!bg);
      let mediaOk = !!bg && bg.dataset.mediaFailed !== '1';
      if (mediaOk && ${expectVideo}) {
        const v = document.getElementById('agy-studio-bg-video');
        const mountAge = Date.now() - (window.__AGY_MOUNT_TS__ || 0);
        if (!v || v.error || (v.readyState === 0 && mountAge > 6000)) {
          mediaOk = false;
          if (bg) { bg.dataset.mediaFailed = '1'; bg.dataset.mediaKey = ''; }
        }
      } else if (mediaOk && ${expectImage}) {
        const im = document.getElementById('agy-studio-bg-img');
        if (!im || (im.complete && im.naturalWidth === 0)) {
          mediaOk = false;
          if (bg) { bg.dataset.mediaFailed = '1'; bg.dataset.mediaKey = ''; }
        }
      }
      return { readyDom, ok: !!(styleOk && bg && hostOk && mediaOk), layoutStale: false };
    })()`;
  }

  async refreshPreloadScript(session, scriptOrNull) {
    if (!session || !session.ready) return;
    if (session.preloadScriptId) {
      await session.send('Page.removeScriptToEvaluateOnNewDocument', { identifier: session.preloadScriptId }).catch(() => {});
      session.preloadScriptId = null;
    }
    if (scriptOrNull) {
      const added = await session.send('Page.addScriptToEvaluateOnNewDocument', { source: scriptOrNull }).catch(() => null);
      if (added && added.identifier) {
        session.preloadScriptId = added.identifier;
      }
    }
  }

  broadcastLayoutToChats(layout) {
    if (!layout || !layout.parentW) return;
    const expr = `if (typeof window.__AGY_STUDIO_SYNC_LAYOUT__ === 'function') { window.__AGY_STUDIO_SYNC_LAYOUT__(${JSON.stringify(layout)}); }`;
    for (const s of this.sessions.values()) {
      if (s.kind === 'chat' && s.ready) {
        s.evaluate(expr, false);
      }
    }
  }

  buildEnrichedState(rawState) {
    return {
      ...rawState,
      ideLayout: this.ideLayout,
    };
  }

  createSession(target, kind) {
    const ws = new globalThis.WebSocket(target.webSocketDebuggerUrl);
    let nextId = 1;
    const pending = new Map();

    const send = (method, params = {}) => new Promise((resolve, reject) => {
      if (ws.readyState !== 1) {
        reject(new Error('WebSocket not open'));
        return;
      }
      const id = nextId++;
      pending.set(id, { resolve, reject });
      ws.send(JSON.stringify({ id, method, params }));
    });

    const evaluate = async (expression, returnByValue = false) => {
      try {
        return await send('Runtime.evaluate', { expression, returnByValue, awaitPromise: false });
      } catch (_) {
        return null;
      }
    };

    const session = {
      id: target.id,
      kind,
      url: target.url,
      title: target.title,
      ws,
      send,
      evaluate,
      ready: false,
      preloadScriptId: null,
      lastHealAt: 0,
    };
    this.sessions.set(target.id, session);

    ws.addEventListener('message', async (event) => {
      let msg;
      try {
        msg = JSON.parse(String(event.data));
      } catch (_) {
        return;
      }
      if (msg.id && pending.has(msg.id)) {
        const p = pending.get(msg.id);
        pending.delete(msg.id);
        if (msg.error) p.reject(new Error(msg.error.message || 'CDP error'));
        else p.resolve(msg.result);
        return;
      }

      if (msg.method === 'Runtime.bindingCalled' && msg.params?.name === 'agyStudioLayoutSync') {
        try {
          const layout = JSON.parse(msg.params.payload || '{}');
          if (layout && layout.parentW > 0) {
            this.ideLayout = layout;
            this.broadcastLayoutToChats(layout);
          }
        } catch (_) {}
        return;
      }

      if (
        (msg.method === 'Page.frameNavigated' && msg.params?.frame && !msg.params.frame.parentId) ||
        msg.method === 'Page.loadEventFired'
      ) {
        if (!this.isDisabled) {
          const state = this.getPayloadState();
          if (state?.config?.enabled) {
            if (kind === 'chat') await this.queryIdeLayoutNow();
            await evaluate(buildInjectScript(this.buildEnrichedState(state)));
            if (kind === 'ide' && this.ideLayout) this.broadcastLayoutToChats(this.ideLayout);
          }
        }
      }
    });

    ws.addEventListener('open', async () => {
      try {
        await send('Page.enable');
        await send('Runtime.enable');
        if (kind === 'ide') {
          await send('Runtime.addBinding', { name: 'agyStudioLayoutSync' }).catch(() => {});
        }
        session.ready = true;
        this.logFn(`CDP session ready [${kind}] id=${target.id.slice(0, 8)} port=${this.activePort}`);
        if (kind === 'ide') {
          await this.queryIdeLayoutNow();
        } else if (!this.ideLayout) {
          await this.queryIdeLayoutNow();
        }
        if (!this.isDisabled) {
          const state = this.getPayloadState();
          if (state?.config?.enabled) {
            const script = buildInjectScript(this.buildEnrichedState(state));
            await this.refreshPreloadScript(session, script);
            await evaluate(script);
            session.lastHealAt = Date.now();
            // Delayed self-healing re-sync burst for slow cold Windows boot launches (Electron + React hydration!)
            [800, 2200, 5000, 9500].forEach((delayMs) => {
              setTimeout(async () => {
                if (this.isDisabled || !session.ready || !this.sessions.has(target.id)) return;
                const latest = this.getPayloadState();
                if (!latest?.config?.enabled) return;
                await this.queryIdeLayoutNow();
                const check = await evaluate(this.buildHealthCheckExpr(latest, kind), true);
                const val = check?.result?.value;
                if (val && val.readyDom && !val.ok) {
                  this.logFn(`Cold-boot self-heal [${kind}] at +${delayMs}ms`);
                  session.lastHealAt = Date.now();
                  await evaluate(buildInjectScript(this.buildEnrichedState(latest)));
                } else if ((val && val.layoutStale) || (kind === 'ide' && this.ideLayout)) {
                  if (this.ideLayout) this.broadcastLayoutToChats(this.ideLayout);
                }
              }, delayMs);
            });
          }
        }
        if (kind === 'ide' && this.ideLayout) {
          this.broadcastLayoutToChats(this.ideLayout);
        }
        this.emitStatus();
      } catch (_) {}
    });

    const cleanup = () => {
      for (const p of pending.values()) p.reject(new Error('Closed'));
      pending.clear();
      this.sessions.delete(target.id);
      this.emitStatus();
    };
    ws.addEventListener('close', cleanup);
    ws.addEventListener('error', cleanup);
  }

  async scan() {
    if (this._scanning) return;
    this._scanning = true;
    try {
      const live = await this.discoverLivePort();
      if (!live) {
        if (this.sessions.size > 0 || this.activePort !== null) {
          this.logFn(`CDP port ${this.activePort} disconnected; waiting for Antigravity IDE...`);
          for (const s of this.sessions.values()) {
            try { s.ws.close(); } catch (_) {}
          }
          this.sessions.clear();
          this.activePort = null;
          this.activePortFile = null;
          this.emitStatus();
        }
        return;
      }

      if (this.activePort !== null && this.activePort !== live.port) {
        this.logFn(`CDP port changed ${this.activePort} -> ${live.port}`);
        for (const s of this.sessions.values()) {
          try { s.ws.close(); } catch (_) {}
        }
        this.sessions.clear();
      } else if (this.activePort === null) {
        this.logFn(`Discovered live CDP port ${live.port} (${live.file})`);
      }
      this.activePort = live.port;
      this.activePortFile = live.file;
      this.ensureBrowserTargetWatcher(live.port);

      const validTargets = [];
      for (const t of live.targets) {
        const kind = this.classifyTarget(t);
        if (kind) validTargets.push({ target: t, kind });
      }

      const liveIds = new Set(validTargets.map((v) => v.target.id));
      for (const [id, session] of this.sessions.entries()) {
        if (!liveIds.has(id)) {
          try { session.ws.close(); } catch (_) {}
          this.sessions.delete(id);
        }
      }

      for (const { target, kind } of validTargets) {
        if (!this.sessions.has(target.id)) {
          this.createSession(target, kind);
        }
      }

      // Continuous DOM & Media Self-Healing Guard: if Antigravity IDE reloaded, failed a cold-boot media fetch, or dropped layout sync, auto-heal immediately!
      if (!this.isDisabled) {
        const state = this.getPayloadState();
        if (state?.config?.enabled) {
          let needsLayoutBroadcast = false;
          const now = Date.now();
          for (const s of this.sessions.values()) {
            if (!s.ready) continue;
            try {
              const chk = await s.evaluate(this.buildHealthCheckExpr(state, s.kind), true);
              const v = chk?.result?.value;
              if (v && v.readyDom && !v.ok && (now - (s.lastHealAt || 0) > 2500)) {
                s.lastHealAt = now;
                this.logFn(`Self-healing DOM/media on [${s.kind}] id=${s.id.slice(0, 8)}`);
                await this.queryIdeLayoutNow();
                const script = buildInjectScript(this.buildEnrichedState(state));
                await this.refreshPreloadScript(s, script);
                await s.evaluate(script, false);
                needsLayoutBroadcast = true;
              } else if (v && v.layoutStale) {
                await this.queryIdeLayoutNow();
                needsLayoutBroadcast = true;
              }
            } catch (_) {}
          }
          if (needsLayoutBroadcast && this.ideLayout) {
            this.broadcastLayoutToChats(this.ideLayout);
          }
        }
      }

      this.emitStatus();
    } finally {
      this._scanning = false;
    }
  }

  getStatus() {
    const targets = Array.from(this.sessions.values()).map((s) => ({
      id: s.id,
      kind: s.kind,
      ready: s.ready,
      title: s.title,
      url: s.url,
    }));
    const chatCount = targets.filter((t) => t.kind === 'chat' && t.ready).length;
    const ideCount = targets.filter((t) => t.kind === 'ide' && t.ready).length;
    const webviewCount = targets.filter((t) => t.kind === 'webview' && t.ready).length;
    return {
      connected: chatCount > 0 || ideCount > 0 || webviewCount > 0,
      port: this.activePort,
      portFile: this.activePortFile,
      chatConnected: chatCount > 0,
      ideConnected: ideCount > 0,
      chatCount,
      ideCount,
      webviewCount,
      targets,
    };
  }

  emitStatus() {
    const status = this.getStatus();
    const json = JSON.stringify(status);
    if (json !== this.lastStatusJson) {
      this.lastStatusJson = json;
      this.emit('status', status);
    }
  }

  async applyNow(payloadState) {
    this.isDisabled = !payloadState?.config?.enabled;
    await this.queryIdeLayoutNow();
    const script = this.isDisabled
      ? buildRemoveScript()
      : buildInjectScript(this.buildEnrichedState(payloadState));

    const results = [];
    for (const s of this.sessions.values()) {
      if (!s.ready) continue;
      try {
        await this.refreshPreloadScript(s, this.isDisabled ? null : script);
        const res = await s.evaluate(script, true);
        s.lastHealAt = Date.now();
        results.push({ id: s.id, kind: s.kind, value: res?.result?.value || null });
      } catch (err) {
        results.push({ id: s.id, kind: s.kind, error: err.message });
      }
    }
    return { ok: true, count: results.length, results };
  }

  async disableAll() {
    this.isDisabled = true;
    const script = buildRemoveScript();
    const results = [];
    for (const s of this.sessions.values()) {
      if (!s.ready) continue;
      try {
        await this.refreshPreloadScript(s, null);
        const res = await s.evaluate(script, true);
        results.push({ id: s.id, kind: s.kind, value: res?.result?.value || null });
      } catch (err) {
        results.push({ id: s.id, kind: s.kind, error: err.message });
      }
    }
    return { ok: true, count: results.length, results };
  }

  async inspectTargets() {
    const expr = `(() => ({
      url: location.href.slice(0, 120),
      hasStudioStyle: !!document.getElementById('agy-studio-style'),
      hasBgLayer: !!document.getElementById('agy-studio-bg-layer'),
      hasVideo: !!document.getElementById('agy-studio-bg-video'),
      hasMascot: !!document.getElementById('agy-studio-mascot'),
      hasShell: !!document.querySelector('.agy-shell'),
      hasWorkbench: !!document.querySelector('.monaco-workbench'),
      hasBrowserHole: document.body.getAttribute('data-has-browser-hole') || null
    }))()`;
    const list = [];
    for (const s of this.sessions.values()) {
      if (!s.ready) continue;
      const res = await s.evaluate(expr, true);
      list.push({ id: s.id, kind: s.kind, info: res?.result?.value || null });
    }
    return list;
  }

  async ensureBrowserTargetWatcher(port) {
    if (!port || (this.browserWs && this.browserWsPort === port && this.browserWs.readyState <= 1)) return;
    if (this.browserWs) {
      try { this.browserWs.close(); } catch (_) {}
      this.browserWs = null;
      this.browserWsPort = null;
    }
    try {
      const ver = await this.fetchJson(`http://127.0.0.1:${port}/json/version`, 800);
      const wsUrl = ver && ver.webSocketDebuggerUrl;
      if (!wsUrl) return;
      const ws = new globalThis.WebSocket(wsUrl);
      this.browserWs = ws;
      this.browserWsPort = port;
      ws.addEventListener('open', () => {
        try {
          ws.send(JSON.stringify({ id: 1, method: 'Target.setDiscoverTargets', params: { discover: true } }));
        } catch (_) {}
      });
      ws.addEventListener('message', (ev) => {
        try {
          const msg = JSON.parse(String(ev.data));
          if (msg.method === 'Target.targetCreated' || msg.method === 'Target.targetInfoChanged') {
            const info = msg.params?.targetInfo;
            const kind = info && this.classifyTarget({ type: info.type, url: info.url, webSocketDebuggerUrl: 'ok' });
            if (kind && !this.sessions.has(info.targetId)) {
              setTimeout(() => this.triggerImmediateScan(), 25);
            }
          }
        } catch (_) {}
      });
      const clear = () => {
        if (this.browserWs === ws) {
          this.browserWs = null;
          this.browserWsPort = null;
        }
      };
      ws.addEventListener('close', clear);
      ws.addEventListener('error', clear);
    } catch (_) {}
  }

  triggerImmediateScan() {
    if (this._scanning) {
      this._rescanPending = true;
      return;
    }
    this.scan().then(() => {
      if (this._rescanPending) {
        this._rescanPending = false;
        this.scan();
      }
    });
  }

  startPortFileWatchers() {
    const dirs = [...new Set(this.getCandidatePortFiles().map((p) => path.dirname(p)))];
    for (const dir of dirs) {
      if (!fs.existsSync(dir)) continue;
      try {
        const watcher = fs.watch(dir, { persistent: false }, (_event, filename) => {
          if (!filename || String(filename).toLowerCase().includes('devtoolsactiveport')) {
            setTimeout(() => this.triggerImmediateScan(), 20);
          }
        });
        watcher.on('error', () => {});
        this.portWatchers.push(watcher);
      } catch (_) {}
    }
  }

  scheduleNextPoll() {
    if (this.pollTimer) clearTimeout(this.pollTimer);
    // Ultra-fast 380ms polling while waiting for IDE to boot; calm 1400ms steady-state once attached!
    const delay = this.activePort ? 1400 : 380;
    this.pollTimer = setTimeout(async () => {
      await this.scan();
      if (this._rescanPending) {
        this._rescanPending = false;
        await this.scan();
      }
      if (this.pollTimer !== null) this.scheduleNextPoll();
    }, delay);
  }

  start() {
    this.startPortFileWatchers();
    this.scan();
    this.pollTimer = 1;
    this.scheduleNextPoll();
  }

  stop() {
    if (this.pollTimer) {
      clearTimeout(this.pollTimer);
      this.pollTimer = null;
    }
    for (const w of this.portWatchers) {
      try { w.close(); } catch (_) {}
    }
    this.portWatchers = [];
    if (this.browserWs) {
      try { this.browserWs.close(); } catch (_) {}
      this.browserWs = null;
      this.browserWsPort = null;
    }
    for (const s of this.sessions.values()) {
      try { s.ws.close(); } catch (_) {}
    }
    this.sessions.clear();
  }
}

module.exports = { CdpBridge };
