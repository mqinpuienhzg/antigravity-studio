'use strict';

const { spawn } = require('child_process');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

/**
 * Resolves bundled yt-dlp.exe and ffmpeg.exe cleanly in both dev mode and packaged Electron .exe.
 */
function resolveBinaries() {
  const isPackaged = Boolean(process.resourcesPath && !process.resourcesPath.includes('node_modules'));
  const devRoot = path.resolve(__dirname, '..');

  const ytdlpCandidates = [
    path.join(devRoot, 'bin', 'yt-dlp.exe'),
    isPackaged ? path.join(process.resourcesPath, 'bin', 'yt-dlp.exe') : '',
    isPackaged ? path.join(process.resourcesPath, 'app.asar.unpacked', 'bin', 'yt-dlp.exe') : '',
  ].filter(Boolean);

  let ffmpegFromPkg = '';
  try {
    ffmpegFromPkg = require('ffmpeg-static') || '';
    if (ffmpegFromPkg && ffmpegFromPkg.includes('app.asar')) {
      ffmpegFromPkg = ffmpegFromPkg.replace('app.asar', 'app.asar.unpacked');
    }
  } catch (_) {}

  const ffmpegCandidates = [
    ffmpegFromPkg,
    path.join(devRoot, 'node_modules', 'ffmpeg-static', 'ffmpeg.exe'),
    isPackaged ? path.join(process.resourcesPath, 'bin', 'ffmpeg.exe') : '',
    isPackaged ? path.join(process.resourcesPath, 'app.asar.unpacked', 'node_modules', 'ffmpeg-static', 'ffmpeg.exe') : '',
  ].filter(Boolean);

  const ytdlp = ytdlpCandidates.find((p) => fs.existsSync(p)) || 'yt-dlp';
  const ffmpeg = ffmpegCandidates.find((p) => fs.existsSync(p)) || '';

  return {
    ytdlp,
    hasYtdlp: ytdlp !== 'yt-dlp' && fs.existsSync(ytdlp),
    ffmpeg,
    hasFfmpeg: Boolean(ffmpeg && fs.existsSync(ffmpeg)),
  };
}

function isYouTubeOrStreamingUrl(url) {
  return /(youtube\.com|youtu\.be|vimeo\.com|tiktok\.com|bilibili\.com|twitter\.com|x\.com)/i.test(String(url || ''));
}

function runProcessCapture(exe, args, timeoutMs = 25000) {
  return new Promise((resolve, reject) => {
    const child = spawn(exe, args, { windowsHide: true });
    let stdout = '';
    let stderr = '';
    const timer = setTimeout(() => {
      try { child.kill('SIGKILL'); } catch (_) {}
      reject(new Error('Hết thời gian chờ khi kết nối Internet.'));
    }, timeoutMs);

    child.stdout.on('data', (d) => { stdout += d.toString('utf8'); });
    child.stderr.on('data', (d) => { stderr += d.toString('utf8'); });
    child.on('error', (err) => {
      clearTimeout(timer);
      reject(err);
    });
    child.on('close', (code) => {
      clearTimeout(timer);
      if (code !== 0) {
        reject(new Error((stderr || stdout || `Exit code ${code}`).trim().slice(0, 400)));
      } else {
        resolve(stdout);
      }
    });
  });
}

async function searchYouTube(query, limit = 8) {
  const bins = resolveBinaries();
  const cleanQ = String(query || '').trim();
  if (!cleanQ) return [];
  const args = [
    '--flat-playlist',
    '--dump-json',
    '--no-warnings',
    '--skip-download',
    `ytsearch${Math.min(12, Math.max(1, limit))}:${cleanQ}`,
  ];
  const out = await runProcessCapture(bins.ytdlp, args, 25000);
  const lines = out.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const items = [];
  for (const line of lines) {
    try {
      const obj = JSON.parse(line);
      const id = obj.id;
      const thumb =
        (Array.isArray(obj.thumbnails) && obj.thumbnails.length > 0
          ? obj.thumbnails[obj.thumbnails.length - 1].url
          : '') || (id ? `https://i.ytimg.com/vi/${id}/hqdefault.jpg` : '');
      items.push({
        id,
        title: obj.title || 'YouTube Video',
        url: obj.url && obj.url.startsWith('http') ? obj.url : `https://www.youtube.com/watch?v=${id}`,
        thumbnail: thumb,
        duration: obj.duration || 0,
        durationString: obj.duration_string || formatDuration(obj.duration),
        channel: obj.channel || obj.uploader || 'YouTube',
      });
    } catch (_) {}
  }
  return items;
}

function formatDuration(sec) {
  const s = Math.round(Number(sec) || 0);
  if (s <= 0) return '';
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${String(r).padStart(2, '0')}`;
}

async function inspectUrl(url) {
  const cleanUrl = String(url || '').trim();
  if (!/^https?:\/\//i.test(cleanUrl)) {
    throw new Error('Link phải bắt đầu bằng http:// hoặc https://');
  }
  if (!isYouTubeOrStreamingUrl(cleanUrl)) {
    const u = new URL(cleanUrl);
    const name = decodeURIComponent(path.basename(u.pathname) || 'Internet Media');
    return {
      title: name.replace(/\.[^.]+$/, ''),
      url: cleanUrl,
      thumbnail: /\.(png|jpe?g|webp|gif|svg)$/i.test(u.pathname) ? cleanUrl : '',
      duration: 0,
      durationString: 'Direct URL',
      isDirect: true,
    };
  }
  const bins = resolveBinaries();
  const out = await runProcessCapture(
    bins.ytdlp,
    ['--dump-single-json', '--no-playlist', '--no-warnings', '--skip-download', cleanUrl],
    25000
  );
  const info = JSON.parse(out);
  return {
    id: info.id,
    title: info.title || 'YouTube Wallpaper',
    url: cleanUrl,
    thumbnail: info.thumbnail || (info.id ? `https://i.ytimg.com/vi/${info.id}/hqdefault.jpg` : ''),
    duration: info.duration || 0,
    durationString: info.duration_string || formatDuration(info.duration),
    channel: info.channel || info.uploader || 'YouTube',
    isDirect: false,
  };
}

function downloadDirectFile(url, destDir, customName, onProgress) {
  return new Promise(async (resolve, reject) => {
    try {
      onProgress?.({ percent: 10, stage: 'Đang tải tệp từ Internet...' });
      const resp = await fetch(url, { redirect: 'follow' });
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);

      const ct = (resp.headers.get('content-type') || '').toLowerCase();
      let ext = path.extname(new URL(url).pathname).toLowerCase();
      if (!ext || ext.length > 5) {
        if (ct.includes('mp4')) ext = '.mp4';
        else if (ct.includes('webm')) ext = '.webm';
        else if (ct.includes('gif')) ext = '.gif';
        else if (ct.includes('webp')) ext = '.webp';
        else if (ct.includes('png')) ext = '.png';
        else if (ct.includes('jpeg') || ct.includes('jpg')) ext = '.jpg';
        else ext = '.mp4';
      }

      const id = 'web-' + crypto.randomBytes(5).toString('hex');
      const filePath = path.join(destDir, `${id}${ext}`);
      const total = Number(resp.headers.get('content-length') || 0);
      const reader = resp.body.getReader();
      const ws = fs.createWriteStream(filePath);
      let loaded = 0;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        ws.write(Buffer.from(value));
        loaded += value.length;
        if (total > 0) {
          onProgress?.({
            percent: Math.min(98, Math.round((loaded / total) * 100)),
            stage: `Đang tải ${(loaded / (1024 * 1024)).toFixed(1)} MB / ${(total / (1024 * 1024)).toFixed(1)} MB`,
          });
        }
      }
      ws.end();
      await new Promise((r) => ws.on('finish', r));
      onProgress?.({ percent: 100, stage: 'Hoàn tất!' });
      resolve({
        filePath,
        title: customName || path.basename(new URL(url).pathname, ext) || 'Web Theme',
      });
    } catch (err) {
      reject(err);
    }
  });
}

async function downloadOnlineMedia({
  url,
  title,
  destDir,
  quality = '1080',
  durationSec = 25,
  startSec = 0,
  keepAudio = false,
  onProgress,
}) {
  fs.mkdirSync(destDir, { recursive: true });
  const cleanUrl = String(url || '').trim();
  if (!/^https?:\/\//i.test(cleanUrl)) {
    throw new Error('Link không hợp lệ.');
  }

  if (!isYouTubeOrStreamingUrl(cleanUrl)) {
    return downloadDirectFile(cleanUrl, destDir, title, onProgress);
  }

  const bins = resolveBinaries();
  if (!bins.hasYtdlp) {
    throw new Error('Không tìm thấy yt-dlp.exe đi kèm ứng dụng.');
  }

  const id = 'yt-' + crypto.randomBytes(5).toString('hex');
  const rawOutPath = path.join(destDir, `${id}_raw.mp4`);
  const finalPath = path.join(destDir, `${id}.mp4`);

  const maxH = quality === '2160' ? 2160 : quality === '1440' ? 1440 : quality === '720' ? 720 : 1080;
  // Prefer crisp 4K/2K/1080p MP4 (h264/vp9/av1 -> fast-start mp4)
  const formatSel = keepAudio
    ? `bestvideo[height<=${maxH}][ext=mp4]+bestaudio[ext=m4a]/bestvideo[height<=${maxH}]+bestaudio/best[height<=${maxH}]`
    : `bestvideo[height<=${maxH}][vcodec^=avc1][ext=mp4]/bestvideo[height<=${maxH}][ext=mp4]/bestvideo[height<=${maxH}]/best[height<=${maxH}]`;

  const args = [
    '--no-playlist',
    '--newline',
    '--no-warnings',
    '-f', formatSel,
    '--merge-output-format', 'mp4',
    '-o', rawOutPath,
  ];

  if (bins.hasFfmpeg) {
    args.push('--ffmpeg-location', path.dirname(bins.ffmpeg));
    if (durationSec && Number(durationSec) > 0) {
      const start = Math.max(0, Number(startSec) || 0);
      const end = start + Math.max(5, Number(durationSec));
      args.push('--download-sections', `*${start}-${end}`);
      args.push('--force-keyframes-at-cuts');
    }
  }

  args.push(cleanUrl);

  onProgress?.({ percent: 5, stage: 'Đang kết nối YouTube & lấy luồng video HD...' });

  await new Promise((resolve, reject) => {
    const child = spawn(bins.ytdlp, args, { windowsHide: true });
    let stderr = '';

    const parseLine = (line) => {
      const pctMatch = line.match(/(\d+(?:\.\d+)?)%/);
      if (pctMatch) {
        const p = Math.min(92, Math.round(parseFloat(pctMatch[1]) * 0.85 + 6));
        onProgress?.({ percent: p, stage: `Đang tải video từ YouTube (${Math.round(parseFloat(pctMatch[1]))}%)...` });
      } else if (/Merging|ffmpeg|Destination/i.test(line)) {
        onProgress?.({ percent: 94, stage: 'Đang ghép & tối ưu vòng lặp MP4...' });
      }
    };

    child.stdout.on('data', (d) => {
      d.toString('utf8').split(/\r?\n/).forEach(parseLine);
    });
    child.stderr.on('data', (d) => {
      const txt = d.toString('utf8');
      stderr += txt;
      txt.split(/\r?\n/).forEach(parseLine);
    });
    child.on('error', reject);
    child.on('close', (code) => {
      if (code !== 0) {
        reject(new Error((stderr || `yt-dlp thoát với mã ${code}`).trim().slice(0, 420)));
      } else {
        resolve();
      }
    });
  });

  // Find downloaded file (yt-dlp may append extension)
  let actualRaw = rawOutPath;
  if (!fs.existsSync(actualRaw)) {
    const candidates = fs.readdirSync(destDir).filter((f) => f.startsWith(`${id}_raw`));
    if (candidates.length) actualRaw = path.join(destDir, candidates[0]);
  }
  if (!fs.existsSync(actualRaw)) {
    throw new Error('Tải xong nhưng không tìm thấy tệp video đầu ra.');
  }

  // Fast-start optimize / strip audio if requested via ffmpeg
  if (bins.hasFfmpeg) {
    onProgress?.({ percent: 96, stage: 'Tối ưu giải mã phần cứng GPU (H.264 FastStart)...' });
    const ffArgs = ['-y', '-i', actualRaw];
    if (!keepAudio) ffArgs.push('-an');
    ffArgs.push('-c:v', 'copy', '-movflags', '+faststart', finalPath);
    try {
      await runProcessCapture(bins.ffmpeg, ffArgs, 30000);
      try { fs.unlinkSync(actualRaw); } catch (_) {}
    } catch (_) {
      // Fallback: re-encode fast H.264 if codec wasn't mp4-copyable
      try {
        const ffEnc = ['-y', '-i', actualRaw];
        if (!keepAudio) ffEnc.push('-an');
        ffEnc.push('-c:v', 'libx264', '-preset', 'veryfast', '-crf', '23', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', finalPath);
        await runProcessCapture(bins.ffmpeg, ffEnc, 60000);
        try { fs.unlinkSync(actualRaw); } catch (_) {}
      } catch (_) {
        fs.renameSync(actualRaw, finalPath);
      }
    }
  } else {
    fs.renameSync(actualRaw, finalPath);
  }

  onProgress?.({ percent: 100, stage: 'Đã tải xong & thêm vào thư viện!' });
  return {
    filePath: finalPath,
    title: title || 'YouTube Live Wallpaper',
  };
}

module.exports = {
  resolveBinaries,
  searchYouTube,
  inspectUrl,
  downloadOnlineMedia,
};
