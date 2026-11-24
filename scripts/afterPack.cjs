'use strict';

const fs = require('fs');
const path = require('path');

/**
 * Electron-builder afterPack hook:
 * 1. Prunes 53 unused Chromium locale .pak files (keeps only en-US.pak and vi.pak, saving ~40 MB).
 * 2. Removes unnecessary dev/example files from unpacked ffmpeg-static.
 */
exports.default = async function afterPack(context) {
  const appOutDir = context.appOutDir;
  if (!appOutDir || !fs.existsSync(appOutDir)) return;

  // 1. Prune locales
  const localesDir = path.join(appOutDir, 'locales');
  const keepLocales = new Set(['en-US.pak', 'vi.pak']);
  if (fs.existsSync(localesDir)) {
    let removedCount = 0;
    let savedBytes = 0;
    for (const file of fs.readdirSync(localesDir)) {
      if (!keepLocales.has(file)) {
        const full = path.join(localesDir, file);
        try {
          const st = fs.statSync(full);
          if (st.isFile()) {
            savedBytes += st.size;
            fs.unlinkSync(full);
            removedCount++;
          }
        } catch (_) {}
      }
    }
    console.log(`  • afterPack: pruned ${removedCount} unused locales (-${(savedBytes / 1048576).toFixed(2)} MB)`);
  }

  // 2. Clean non-runtime doc/example files in unpacked ffmpeg-static
  const ffDir = path.join(appOutDir, 'resources', 'app.asar.unpacked', 'node_modules', 'ffmpeg-static');
  if (fs.existsSync(ffDir)) {
    for (const junk of ['example.js', 'install.js', 'ffmpeg.exe.README']) {
      const fp = path.join(ffDir, junk);
      try {
        if (fs.existsSync(fp)) fs.unlinkSync(fp);
      } catch (_) {}
    }
  }
};
