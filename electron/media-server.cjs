'use strict';

const fs = require('fs');
const http = require('http');
const path = require('path');

const MIME_MAP = {
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.mov': 'video/quicktime',
  '.m4v': 'video/mp4',
  '.ogg': 'video/ogg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.avif': 'image/avif',
  '.bmp': 'image/bmp',
};

class LocalMediaServer {
  constructor() {
    this.server = null;
    this.port = 0;
    this.registry = new Map(); // id -> absolute file path
    this.controlToken = '';
    this.onReveal = null;
    this.onControl = null;
  }

  setControl({ token, onReveal, onControl } = {}) {
    this.controlToken = String(token || '');
    this.onReveal = typeof onReveal === 'function' ? onReveal : null;
    this.onControl = typeof onControl === 'function' ? onControl : null;
  }

  register(id, filePath) {
    if (!id || !filePath) return null;
    this.registry.set(String(id), path.resolve(filePath));
    return this.getUrl(id);
  }

  unregister(id) {
    this.registry.delete(String(id));
  }

  getUrl(id) {
    if (!this.port || !id) return '';
    return `http://127.0.0.1:${this.port}/media/${encodeURIComponent(String(id))}`;
  }

  start() {
    return new Promise((resolve, reject) => {
      if (this.server) {
        resolve(this.port);
        return;
      }

      this.server = http.createServer((req, res) => {
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Range, Content-Type');
        res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');

        if (req.method === 'OPTIONS') {
          res.writeHead(204);
          res.end();
          return;
        }

        const parsed = new URL(req.url || '/', 'http://127.0.0.1');
        if (parsed.pathname === '/health') {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ ok: true, count: this.registry.size }));
          return;
        }

        if (
          parsed.pathname === '/__studio/ping' ||
          parsed.pathname === '/__studio/reveal' ||
          parsed.pathname === '/__studio/status' ||
          parsed.pathname === '/__studio/handover'
        ) {
          const reqToken = parsed.searchParams.get('token') || '';
          if (!this.controlToken || reqToken !== this.controlToken) {
            res.writeHead(403, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ ok: false, error: 'forbidden' }));
            return;
          }
          const action = parsed.pathname.replace('/__studio/', '');
          let extra = {};
          if (action === 'reveal' && this.onReveal) {
            try {
              this.onReveal();
            } catch (_) {}
          }
          if (this.onControl) {
            try {
              const result = this.onControl(action);
              if (result && typeof result === 'object') extra = result;
            } catch (_) {}
          }
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ ok: true, pid: process.pid, ...extra }));
          return;
        }

        const match = parsed.pathname.match(/^\/media\/([^/]+)$/);
        if (!match) {
          res.writeHead(404);
          res.end('Not found');
          return;
        }

        const mediaId = decodeURIComponent(match[1]);
        const filePath = this.registry.get(mediaId);
        if (!filePath || !fs.existsSync(filePath)) {
          res.writeHead(404);
          res.end('Media not found');
          return;
        }

        let stat;
        try {
          stat = fs.statSync(filePath);
        } catch (err) {
          res.writeHead(500);
          res.end('Stat error');
          return;
        }

        const ext = path.extname(filePath).toLowerCase();
        const contentType = MIME_MAP[ext] || 'application/octet-stream';
        const total = stat.size;
        const range = req.headers.range;

        if (range) {
          const parts = range.replace(/bytes=/, '').split('-');
          const start = parseInt(parts[0], 10);
          const end = parts[1] ? parseInt(parts[1], 10) : total - 1;
          if (Number.isNaN(start) || start >= total || end >= total || start > end) {
            res.writeHead(416, { 'Content-Range': `bytes */${total}` });
            res.end();
            return;
          }
          const chunkSize = end - start + 1;
          res.writeHead(206, {
            'Content-Range': `bytes ${start}-${end}/${total}`,
            'Accept-Ranges': 'bytes',
            'Content-Length': chunkSize,
            'Content-Type': contentType,
            'Cache-Control': 'no-cache',
          });
          if (req.method === 'HEAD') {
            res.end();
            return;
          }
          const stream = fs.createReadStream(filePath, { start, end });
          stream.on('error', () => {
            if (!res.headersSent) res.writeHead(500);
            res.end();
          });
          stream.pipe(res);
        } else {
          res.writeHead(200, {
            'Content-Length': total,
            'Accept-Ranges': 'bytes',
            'Content-Type': contentType,
            'Cache-Control': 'no-cache',
          });
          if (req.method === 'HEAD') {
            res.end();
            return;
          }
          const stream = fs.createReadStream(filePath);
          stream.on('error', () => {
            if (!res.headersSent) res.writeHead(500);
            res.end();
          });
          stream.pipe(res);
        }
      });

      this.server.on('error', reject);
      this.server.listen(0, '127.0.0.1', () => {
        const addr = this.server.address();
        this.port = addr && typeof addr === 'object' ? addr.port : 0;
        resolve(this.port);
      });
    });
  }

  stop() {
    if (this.server) {
      try {
        this.server.close();
      } catch (_) {}
      this.server = null;
      this.port = 0;
    }
  }
}

module.exports = { LocalMediaServer, MIME_MAP };
