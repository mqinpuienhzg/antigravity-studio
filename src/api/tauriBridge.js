import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';

function createEventSubscriber(eventName) {
  return (cb) => {
    let unlistenFn = null;
    let disposed = false;
    listen(eventName, (event) => {
      if (!disposed && typeof cb === 'function') {
        cb(event.payload);
      }
    }).then((fn) => {
      if (disposed) {
        try { fn(); } catch (_) {}
      } else {
        unlistenFn = fn;
      }
    }).catch(() => {});

    return () => {
      disposed = true;
      if (unlistenFn) {
        try { unlistenFn(); } catch (_) {}
        unlistenFn = null;
      }
    };
  };
}

export function isTauriRuntime() {
  return typeof window !== 'undefined' && Boolean(window.__TAURI_INTERNALS__);
}

if (typeof window !== 'undefined' && !window.studioAPI && isTauriRuntime()) {
  window.studioAPI = {
    isRustTauri: true,

    getState: () => invoke('studio_get_state'),
    updateConfig: (patch) => invoke('studio_update_config', { patch }),
    applyNow: () => invoke('studio_apply_now'),
    disableTheme: () => invoke('studio_disable_theme'),
    resetConfig: () => invoke('studio_reset_config'),

    importFiles: () => invoke('studio_import_files'),
    scanFolder: () => invoke('studio_scan_folder'),
    importPaths: (paths) => invoke('studio_import_paths', { paths }),
    deleteTheme: (themeId) => invoke('studio_delete_theme', { themeId }),
    restoreTrashTheme: (themeId) => invoke('studio_restore_trash_theme', { themeId }),
    deleteTrashForever: (themeId) => invoke('studio_delete_trash_forever', { themeId }),
    emptyTrash: () => invoke('studio_empty_trash'),

    importMascot: () => invoke('studio_import_mascot'),
    deleteMascot: (mascotId) => invoke('studio_delete_mascot', { mascotId }),
    importAvatar: (role) => invoke('studio_import_avatar', { role }),

    onlineSearch: (query) => invoke('studio_online_search', { query }),
    onlineInspect: (url) => invoke('studio_online_inspect', { url }),
    onlineDownload: (opts) => invoke('studio_online_download', { opts }),

    getCdpStatus: () => invoke('studio_cdp_status'),
    inspectCdp: () => invoke('studio_cdp_inspect'),
    patchShortcuts: () => invoke('studio_patch_shortcuts'),
    restartAntigravity: () => invoke('studio_restart_antigravity'),
    nextPlaylist: () => invoke('studio_next_playlist'),

    exportBackup: () => invoke('studio_export_backup'),
    importBackup: () => invoke('studio_import_backup'),
    capturePreview: async () => ({
      ok: false,
      error: 'Hãy dùng Win+Shift+S để chụp nhanh giao diện trên bản Rust Tauri.',
    }),
    openDataFolder: () => invoke('studio_open_data_folder'),
    openExtraThemesFolder: () => invoke('studio_open_extra_themes_folder'),
    rescanExtraThemes: () => invoke('studio_rescan_extra_themes'),
    saveCombo: (name) => invoke('studio_save_combo', { name }),
    applyCombo: (comboId) => invoke('studio_apply_combo', { comboId }),
    deleteCombo: (comboId) => invoke('studio_delete_combo', { comboId }),
    randomizeTheme: (opts) => invoke('studio_randomize_theme', { opts }),
    toggleStartup: (enable) => invoke('studio_toggle_startup', { enable }),
    openExternalUrl: (url) => invoke('studio_open_external_url', { url }),

    getDesktopStatus: () => invoke('studio_desktop_status'),
    setDesktopWallpaper: (themeId) => invoke('studio_set_desktop_wallpaper', { themeId }),
    toggleDesktopWallpaper: (enable) => invoke('studio_toggle_desktop_wallpaper', { enable }),
    toggleDesktopPause: () => invoke('studio_toggle_desktop_pause'),

    getPathForFile: (file) => file?.path || '',

    minimize: () => invoke('window_minimize'),
    maximize: () => invoke('window_maximize'),
    close: () => invoke('window_close'),

    onCdpStatus: createEventSubscriber('studio:cdp-status'),
    onDesktopStatus: createEventSubscriber('studio:desktop-status'),
    onStateUpdated: createEventSubscriber('studio:state-updated'),
    onDownloadProgress: createEventSubscriber('studio:download-progress'),
    onWebDownloadProgress: createEventSubscriber('studio:web-download-progress'),
    onWebDownloadDone: createEventSubscriber('studio:web-download-done'),
  };
}
