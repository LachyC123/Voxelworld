// Headless screenshot helper: node tools/shot.mjs "<query>" out.png [waitMs]
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PW_PATH || '/opt/node22/lib/node_modules/playwright');
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
const root = path.resolve('.');
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json' };
const server = http.createServer((req, res) => {
  let p = decodeURIComponent(new URL(req.url, 'http://x').pathname); if (p.endsWith('/')) p += 'index.html';
  fs.readFile(path.join(root, p), (e, d) => { if (e) { res.writeHead(404); res.end(); return; } res.writeHead(200, { 'Content-Type': types[path.extname(p)] || 'application/octet-stream' }); res.end(d); });
}).listen(0);
const port = server.address().port;
const q = process.argv[2] || '';
const out = process.argv[3] || 'shot.png';
const wait = Number(process.argv[4] || 1500);
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: Number(process.env.W || 1280), height: Number(process.env.H || 720) } });
page.on('console', (m) => console.log('[console]', m.type(), m.text()));
page.on('pageerror', (e) => console.log('[pageerror]', e.message));
const t0 = Date.now();
await page.goto(`http://localhost:${port}/${process.env.PAGE || 'index.html'}?shot=1&${q}`);
try { await page.waitForFunction(() => window.__ready === true, null, { timeout: Number(process.env.TIMEOUT || 180000) }); } catch (e) { console.log('timeout waiting ready'); }
await page.waitForTimeout(wait);
await page.screenshot({ path: out, timeout: 240000 });
console.log('shot in', Date.now() - t0, 'ms');
await browser.close(); server.close();
