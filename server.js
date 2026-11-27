// Servidor local de Canasta: sirve la app y actualiza los precios una vez al día.
// Uso: npm start   (luego abrí la dirección que aparece en la consola desde tu iPhone)
import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { networkInterfaces } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { syncAll, STORES } from './scripts/sync.js';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC = path.join(ROOT, 'public');
const PORT = Number(process.env.PORT) || 3000;
const DAY = 24 * 60 * 60 * 1000;

const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.webmanifest': 'application/manifest+json', '.png': 'image/png',
  '.svg': 'image/svg+xml', '.ico': 'image/x-icon',
};

let syncing = null;
async function runSync(store) {
  if (syncing) return syncing;
  syncing = syncAll(store, m => console.log(m)).finally(() => (syncing = null));
  return syncing;
}

async function syncIfStale() {
  for (const key of Object.keys(STORES)) {
    try {
      const s = await stat(path.join(PUBLIC, 'data', `prices-${key}.json`));
      if (Date.now() - s.mtimeMs < DAY) continue;
    } catch { /* aún no existe */ }
    try { await runSync(key); } catch (e) { console.error(`No se pudo sincronizar ${key}:`, e.message); }
  }
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');

  if (url.pathname === '/api/sync' && req.method === 'POST') {
    const store = url.searchParams.get('store');
    if (store && !STORES[store]) { res.writeHead(400).end('Tienda desconocida'); return; }
    try {
      await runSync(store || undefined);
      res.writeHead(200, { 'Content-Type': 'application/json' }).end('{"ok":true}');
    } catch (e) {
      res.writeHead(502, { 'Content-Type': 'application/json' }).end(JSON.stringify({ ok: false, error: e.message }));
    }
    return;
  }

  let file = path.normalize(path.join(PUBLIC, decodeURIComponent(url.pathname)));
  if (!file.startsWith(PUBLIC)) { res.writeHead(403).end(); return; }
  try {
    if ((await stat(file)).isDirectory()) file = path.join(file, 'index.html');
    const body = await readFile(file);
    res.writeHead(200, {
      'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream',
      'Cache-Control': 'no-cache',
    }).end(body);
  } catch {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }).end('No encontrado');
  }
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`\n🧺 Canasta corriendo:`);
  console.log(`   En esta computadora:  http://localhost:${PORT}`);
  for (const list of Object.values(networkInterfaces()))
    for (const n of list || [])
      if (n.family === 'IPv4' && !n.internal) console.log(`   Desde tu iPhone (misma red WiFi): http://${n.address}:${PORT}`);
  console.log('');
  if (process.env.NO_SYNC) return;
  syncIfStale();
  setInterval(syncIfStale, 60 * 60 * 1000); // revisa cada hora; sincroniza si los precios tienen más de un día
});
