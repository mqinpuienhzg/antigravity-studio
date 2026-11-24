'use strict';

const { contextBridge, ipcRenderer, webUtils } = require('electron');

contextBridge.exposeInMainWorld('studioAPI', {
  getState: () => ipcRenderer.invoke('studio:get-state'),
  updateConfig: (patch) => ipcRenderer.invoke('studio:update-config', patch),
  applyNow: () => ipcRenderer.invoke('studio:apply-now'),
  disableTheme: () => ipcRenderer.invoke('studio:disable-theme'),
  resetConfig: () => ipcRenderer.invoke('studio:reset-config'),

  importFiles: () => ipcRenderer.invoke('studio:import-files'),
  scanFolder: () => ipcRenderer.invoke('studio:scan-folder'),
  importPaths: (paths) => ipcRenderer.invoke('studio:import-paths', paths),
  deleteTheme: (id) => ipcRenderer.invoke('studio:delete-theme', id),
  restoreTrashTheme: (id) => ipcRenderer.invoke('studio:restore-trash-theme', id),
  deleteTrashForever: (id) => ipcRenderer.invoke('studio:delete-trash-forever', id),
  emptyTrash: () => ipcRenderer.invoke('studio:empty-trash'),

  importMascot: () => ipcRenderer.invoke('studio:import-mascot'),
  deleteMascot: (id) => ipcRenderer.invoke('studio:delete-mascot', id),
  importAvatar: (role) => ipcRenderer.invoke('studio:import-avatar', role),

  onlineSearch: (query) => ipcRenderer.invoke('studio:online-search', query),
  onlineInspect: (url) => ipcRenderer.invoke('studio:online-inspect', url),
  onlineDownload: (opts) => ipcRenderer.invoke('studio:online-download', opts),

  getCdpStatus: () => ipcRenderer.invoke('studio:cdp-status'),
  inspectCdp: () => ipcRenderer.invoke('studio:cdp-inspect'),
  patchShortcuts: () => ipcRenderer.invoke('studio:patch-shortcuts'),
  restartAntigravity: () => ipcRenderer.invoke('studio:restart-antigravity'),
  nextPlaylist: () => ipcRenderer.invoke('studio:next-playlist'),

  exportBackup: () => ipcRenderer.invoke('studio:export-backup'),
  importBackup: () => ipcRenderer.invoke('studio:import-backup'),
  capturePreview: () => ipcRenderer.invoke('studio:capture-preview'),
  openDataFolder: () => ipcRenderer.invoke('studio:open-data-folder'),
  openExtraThemesFolder: () => ipcRenderer.invoke('studio:open-extra-themes-folder'),
  rescanExtraThemes: () => ipcRenderer.invoke('studio:rescan-extra-themes'),
  saveCombo: (name) => ipcRenderer.invoke('studio:save-combo', name),
  applyCombo: (comboId) => ipcRenderer.invoke('studio:apply-combo', comboId),
  deleteCombo: (comboId) => ipcRenderer.invoke('studio:delete-combo', comboId),
  randomizeTheme: (opts) => ipcRenderer.invoke('studio:randomize-theme', opts),
  toggleStartup: (enable) => ipcRenderer.invoke('studio:toggle-startup', enable),

  getPathForFile: (file) => {
    try {
      return webUtils.getPathForFile(file);
    } catch (_) {
      return file?.path || '';
    }
  },

  minimize: () => ipcRenderer.send('window:minimize'),
  maximize: () => ipcRenderer.send('window:maximize'),
  close: () => ipcRenderer.send('window:close'),

  onCdpStatus: (cb) => {
    const handler = (_ev, data) => cb(data);
    ipcRenderer.on('studio:cdp-status', handler);
    return () => ipcRenderer.removeListener('studio:cdp-status', handler);
  },
  onStateUpdated: (cb) => {
    const handler = (_ev, data) => cb(data);
    ipcRenderer.on('studio:state-updated', handler);
    return () => ipcRenderer.removeListener('studio:state-updated', handler);
  },
  onDownloadProgress: (cb) => {
    const handler = (_ev, data) => cb(data);
    ipcRenderer.on('studio:download-progress', handler);
    return () => ipcRenderer.removeListener('studio:download-progress', handler);
  },
  onWebDownloadProgress: (cb) => {
    const handler = (_ev, data) => cb(data);
    ipcRenderer.on('studio:web-download-progress', handler);
    return () => ipcRenderer.removeListener('studio:web-download-progress', handler);
  },
  onWebDownloadDone: (cb) => {
    const handler = (_ev, data) => cb(data);
    ipcRenderer.on('studio:web-download-done', handler);
    return () => ipcRenderer.removeListener('studio:web-download-done', handler);
  },
});
