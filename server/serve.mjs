// Small static web server for the built page. No dependencies.
// - Listens on localhost only. The Cloudflare Tunnel connects to it from this machine.
// - Sends the pre-compressed Brotli or gzip copy when the browser accepts it.
// - Hashed files under /_astro/ get a one-year immutable cache. HTML is revalidated.
import { createServer } from 'node:http';
import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'dist');
const port = Number(process.env.PORT || 4321);
const host = process.env.HOST || '127.0.0.1';

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
  '.webmanifest': 'application/manifest+json',
};

const SECURITY = {
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'X-Frame-Options': 'DENY',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  'Cross-Origin-Opener-Policy': 'same-origin',
  // Browsers act on this header only when the page came over HTTPS.
  'Strict-Transport-Security': 'max-age=15552000',
  // The page loads nothing from other origins. Astro inlines its styles and small scripts.
  'Content-Security-Policy':
    "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'",
};

async function fileInfo(p) {
  try {
    const s = await stat(p);
    return s.isFile() ? s : null;
  } catch {
    return null;
  }
}

function send(res, status, headers, body) {
  res.writeHead(status, { ...SECURITY, ...headers });
  res.end(body);
}

const server = createServer(async (req, res) => {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    return send(res, 405, { Allow: 'GET, HEAD', 'Content-Type': 'text/plain' }, 'Method not allowed');
  }

  // Behind the tunnel, Cloudflare says which scheme the visitor used. A visitor
  // who came over plain HTTP is sent to HTTPS. Local requests have no such header.
  if (req.headers['x-forwarded-proto'] === 'http' && req.headers.host) {
    return send(res, 301, { Location: `https://${req.headers.host}${req.url}`, 'Cache-Control': 'public, max-age=3600' });
  }

  let pathname;
  try {
    pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
  } catch {
    return send(res, 400, { 'Content-Type': 'text/plain' }, 'Bad request');
  }

  // Resolve inside dist/ only. Anything that escapes the folder is refused.
  let file = path.normalize(path.join(root, pathname));
  if (file !== root && !file.startsWith(root + path.sep)) {
    return send(res, 403, { 'Content-Type': 'text/plain' }, 'Forbidden');
  }
  if (pathname.endsWith('/')) file = path.join(file, 'index.html');

  let info = await fileInfo(file);
  if (!info && !path.extname(file)) {
    file = path.join(file, 'index.html');
    info = await fileInfo(file);
  }
  if (!info || /\.(br|gz)$/.test(file)) {
    const notFound = path.join(root, '404.html');
    const nf = await fileInfo(notFound);
    if (!nf) return send(res, 404, { 'Content-Type': 'text/plain' }, 'Not found');
    res.writeHead(404, { ...SECURITY, 'Content-Type': TYPES['.html'], 'Cache-Control': 'no-cache' });
    return createReadStream(notFound).pipe(res);
  }

  const ext = path.extname(file).toLowerCase();
  const immutable = pathname.startsWith('/_astro/');
  const etag = `"${info.size.toString(16)}-${Math.floor(info.mtimeMs).toString(16)}"`;
  const headers = {
    'Content-Type': TYPES[ext] || 'application/octet-stream',
    'Cache-Control': immutable
      ? 'public, max-age=31536000, immutable'
      : ext === '.html'
        ? 'no-cache'
        : 'public, max-age=86400',
    ETag: etag,
    'Last-Modified': info.mtime.toUTCString(),
    Vary: 'Accept-Encoding',
  };

  if (req.headers['if-none-match'] === etag) {
    return send(res, 304, headers);
  }

  const accepts = String(req.headers['accept-encoding'] || '');
  let body = file;
  let size = info.size;
  for (const [token, suffix] of [['br', '.br'], ['gzip', '.gz']]) {
    if (!new RegExp(`(^|,)\\s*${token}\\s*(;|,|$)`).test(accepts)) continue;
    const packed = await fileInfo(file + suffix);
    if (packed) {
      headers['Content-Encoding'] = token;
      body = file + suffix;
      size = packed.size;
      break;
    }
  }
  headers['Content-Length'] = size;

  res.writeHead(200, { ...SECURITY, ...headers });
  if (req.method === 'HEAD') return res.end();
  createReadStream(body).pipe(res);
});

server.listen(port, host, () => {
  console.log(`SPSL landing page: http://${host === '127.0.0.1' ? 'localhost' : host}:${port}`);
});
