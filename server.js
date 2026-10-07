import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { join, extname, resolve } from 'node:path';
import { locateAddress } from './lib/geocoder.js';
import { rankPoints } from './lib/geo.js';

const root = fileURLToPath(new URL('.', import.meta.url));
const points = JSON.parse(await readFile(join(root, 'data/points.json'), 'utf8'));
const mime = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png' };
const limits = new Map();
export const server = http.createServer(async (req, res) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https://tile.openstreetmap.org; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'");
  res.setHeader('Permissions-Policy', 'geolocation=(), camera=(), microphone=()');
  const send = (status, data) => { res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }); res.end(JSON.stringify(data)); };
  if (req.method !== 'GET' && req.method !== 'HEAD') return send(405, { error: 'Método não permitido.' });
  let url;
  try { url = new URL(req.url, 'http://localhost'); } catch { return send(400, { error: 'Consulta inválida.' }); }
  if (url.pathname === '/health') return send(200, { status: 'ok', points: points.length });
  if (url.pathname === '/api/points') return send(200, { points });
  if (url.pathname === '/api/search') {
    const ip = req.socket.remoteAddress;
    const now = Date.now();
    const entry = limits.get(ip);
    if (entry && entry.until > now && entry.count >= 30) return send(429, { error: 'Aguarde um minuto antes de fazer novas buscas.' });
    limits.set(ip, entry && entry.until > now ? { ...entry, count: entry.count + 1 } : { count: 1, until: now + 60000 });
    if (limits.size > 500) for (const [key, value] of limits) if (value.until < now) limits.delete(key);
    const result = await locateAddress(url.searchParams.get('q'));
    if (result.error) return send(result.status, { error: result.error });
    const sorted = rankPoints(points, result.origin);
    return send(200, { ...result, points: sorted, nearbyCount: sorted.filter((p) => p.distanceKm <= 5).length });
  }
  try {
    const vendors = { '/vendor/leaflet.js': 'leaflet/dist/leaflet.js', '/vendor/leaflet.css': 'leaflet/dist/leaflet.css', '/vendor/images/layers.png': 'leaflet/dist/images/layers.png', '/vendor/images/layers-2x.png': 'leaflet/dist/images/layers-2x.png' };
    const requested = decodeURIComponent(url.pathname === '/' ? '/index.html' : url.pathname);
    let path = vendors[requested] ? join(root, 'node_modules', vendors[requested]) : resolve(root, 'public', '.' + requested);
    if (!vendors[requested] && !path.startsWith(join(root, 'public') + '/')) return send(404, { error: 'Página não encontrada.' });
    const file = await readFile(path);
    res.writeHead(200, { 'Content-Type': mime[extname(path)] || 'application/octet-stream', 'Cache-Control': requested.endsWith('.html') ? 'no-cache' : 'public, max-age=3600' });
    res.end(req.method === 'HEAD' ? undefined : file);
  } catch { send(404, { error: 'Página não encontrada.' }); }
});
if (process.env.NODE_ENV !== 'test') server.listen(Number(process.env.PORT || 3000), '0.0.0.0', () => console.log(`Óleo Certo BH disponível na porta ${process.env.PORT || 3000}`));
