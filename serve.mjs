// Dependency-free static preview, adapted from the existing project's server.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.dirname(fileURLToPath(import.meta.url));
const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.woff2': 'font/woff2', '.json': 'application/json' };
http.createServer(async (req, res) => {
  let pathname;
  try { pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname); }
  catch { res.writeHead(400); res.end(); return; }
  // Environment files and server sources must never be served as static assets.
  if (pathname.split('/').some((part) => part.startsWith('.')) || pathname.startsWith('/node_modules/')) {
    res.writeHead(404); res.end(); return;
  }
  if (pathname === '/api/create-checkout-session') {
    try {
      const handlers = await import('./api/create-checkout-session.js');
      const handler = req.method === 'GET' ? handlers.GET : req.method === 'POST' ? handlers.POST : null;
      let body;
      if (req.method === 'POST') {
        const chunks = [];
        let length = 0;
        for await (const chunk of req) {
          length += chunk.length;
          if (length > 32000) { res.writeHead(413); res.end(); return; }
          chunks.push(chunk);
        }
        body = Buffer.concat(chunks);
      }
      const request = new Request(`http://localhost${req.url}`, { method: req.method, headers: req.headers, ...(body ? { body } : {}) });
      const response = handler ? await handler(request) : new Response(null, { status: 405, headers: { Allow: 'GET, POST' } });
      res.writeHead(response.status, Object.fromEntries(response.headers));
      res.end(Buffer.from(await response.arrayBuffer()));
    } catch {
      res.writeHead(500, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ error: 'Checkout is temporarily unavailable.' }));
    }
    return;
  }
  if (pathname.startsWith('/api/')) { res.writeHead(404); res.end(); return; }
  let file = path.resolve(root, '.' + pathname);
  if (file !== root && !file.startsWith(root + path.sep)) { res.writeHead(403); res.end(); return; }
  if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, 'index.html');
  if (!fs.existsSync(file) || !fs.statSync(file).isFile()) { res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' }); res.end(fs.readFileSync(path.join(root, '404.html'))); return; }
  res.writeHead(200, { 'Content-Type': types[path.extname(file)] || 'application/octet-stream' });
  fs.createReadStream(file).pipe(res);
}).listen(4173, '127.0.0.1', () => console.log('LUVIO preview: http://127.0.0.1:4173'));
