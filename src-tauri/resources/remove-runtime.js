(() => {
    try {
      if (typeof window.__AGY_STUDIO_CLEANUP__ === 'function') {
        window.__AGY_STUDIO_CLEANUP__();
      }
      if (typeof window.__ANTIGRAVITY_REMOVE_CUSTOM_THEME__ === 'function') {
        window.__ANTIGRAVITY_REMOVE_CUSTOM_THEME__();
      }
      ['agy-studio-style', 'agy-studio-fonts', 'agy-studio-bg-layer', 'agy-studio-mascot', 'antigravity-custom-theme-active'].forEach(function(id) {
        document.querySelectorAll('#' + id).forEach(function(el) {
          try {
            el.querySelectorAll('video').forEach(function(v) { v.pause(); v.removeAttribute('src'); v.load(); });
          } catch (_) {}
          el.remove();
        });
      });
      var shell = document.querySelector('.agy-shell');
      if (shell) {
        delete shell.dataset.agyStudioHole;
        shell.style.removeProperty('--agy-studio-hole-clip');
      }
      if (window.electronNative && typeof window.electronNative.setTitleBarOverlay === 'function') {
        window.electronNative.setTitleBarOverlay({ color: '#111114', symbolColor: '#f8fafc' });
      }
      return { ok: true, removed: true };
    } catch (e) {
      return { ok: false, error: String(e) };
    }
  })()
