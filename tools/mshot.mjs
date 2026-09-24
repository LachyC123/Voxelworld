// Multi-view screenshots from one page load: node tools/mshot.mjs views.json outdir  (see docs/LIFE.md)
// views: [{name, goto?, inside?, room?, yaw?, pitch?, cam?:[x,y,z,yaw,pitch], t?, third?, dx?, dz?, dy?}]
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PW_PATH || '/opt/node22/lib/node_modules/playwright');
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
const root = new URL('..', import.meta.url).pathname.replace(/\/$/, '');
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.woff2': 'font/woff2', '.png': 'image/png' };
const server = http.createServer((req, res) => {
  let p = decodeURIComponent(new URL(req.url, 'http://x').pathname); if (p.endsWith('/')) p += 'index.html';
  fs.readFile(path.join(root, p), (e, d) => { if (e) { res.writeHead(404); res.end(); return; } res.writeHead(200, { 'Content-Type': types[path.extname(p)] || 'application/octet-stream' }); res.end(d); });
}).listen(0);
const port = server.address().port;
const views = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const outDir = process.argv[3] || '.';
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: Number(process.env.W || 1100), height: Number(process.env.H || 640) } });
page.on('console', (m) => { const t = m.text(); if (!/missing prop|ERR_CERT/.test(t)) console.log('[console]', m.type(), t.slice(0, 600)); });
page.on('pageerror', (e) => console.log('[pageerror]', e.message, (e.stack || '').split('\n').slice(0, 6).join(' | ')));
const t0 = Date.now();
await page.goto(`http://localhost:${port}/index.html?shot=1&t=${views[0].t || 740}${process.env.Q ? '&' + process.env.Q : ''}`);
try { await page.waitForFunction(() => window.__ready === true, null, { timeout: 240000 }); } catch (e) { console.log('timeout waiting ready'); }
await page.evaluate(() => window.game.meshPromise);
if (process.env.DUMP) {
  const info = await page.evaluate((names) => {
    const g = window.game, ctx = g.ctx;
    return ctx.buildings.filter((b) => names.some((n) => b.name.toLowerCase().includes(n.toLowerCase()))).map((b) => ({ name: b.name, rooms: b.rooms.map((r, i) => i + ':' + ctx.world.rooms[r].name), jobs: b.jobs.map((j) => j.role + '@' + j.shift.join('-') + (j.person ? ' ' + j.person.first + ' ' + j.person.last : '')), spots: b.spots.length, tags: [...new Set(b.spots.flatMap((s) => s.tags))].join(','), homes: b.homes.map((h) => (h.family || '?') + ':' + (h.beds || []).length + ' members ' + h.members?.length) }));
  }, process.env.DUMP.split(','));
  console.log(JSON.stringify(info, null, 1));
}
for (const v of views) {
  v.t0 = views[0].t || 740;
  const ok = await page.evaluate((v) => {
    const g = window.game, ctx = g.ctx;
    if (v.t && v.t !== v.t0) g.clock.abs = v.t;
    if (v.cam) { g.player.enterAerial(); const a = g.player.aerial; a.pos.set(v.cam[0], v.cam[1], v.cam[2]); a.yaw = v.cam[3] || 0; a.pitch = v.cam[4] || 0; return 'cam'; }
    if (g.player.mode === 'aerial') g.player.exitAerial();
    if (v.tag) {
      const b = ctx.buildings.find((q) => q.name.toLowerCase().includes((v.goto || v.inside).toLowerCase()));
      const sp = b.spots.filter((s) => s.tags.includes(v.tag)); if (!sp.length) return 'no tag';
      let cx = 0, cz = 0, cy = 0; for (const s of sp) { cx += s.x; cz += s.z; cy += s.y; } cx /= sp.length; cz /= sp.length; cy /= sp.length;
      // stand where the spots face, looking back at them
      const f = sp[0]; const yaw0 = f.yaw ?? 0; const fx = -Math.sin(yaw0), fz = -Math.cos(yaw0);
      const d = v.dist || 3; const x = cx + fx * d, z = cz + fz * d;
      g.player.mode = 'first'; g.player.setPose(x, cy + 0.05, z, Math.atan2(-(cx - x), -(cz - z)), v.pitch || -0.15);
      return 'tag ' + sp.length;
    }
    g.player.mode = v.third ? 'third' : 'first';
    const name = v.goto || v.inside;
    const b = ctx.buildings.find((q) => q.name.toLowerCase().includes(name.toLowerCase()));
    if (!b) return 'no building ' + name;
    if (v.inside) {
      let ri = v.room || 0;
      if (v.roomName) { const k = b.rooms.findIndex((id) => ctx.world.rooms[id].name.toLowerCase().includes(v.roomName.toLowerCase())); if (k >= 0) ri = k; }
      const r = ctx.world.rooms[b.rooms[ri]];
      let [x, y, z] = ctx.nav.pos(r.nav);
      if (v.lx !== undefined) { const p = b.f.m(v.lx, 0, v.lz); x = p[0]; z = p[2]; }
      x += v.dx || 0; z += v.dz || 0; y += v.dy || 0;
      let yaw = v.yaw || 0;
      if (v.look) { const L = { in: [0, 1], out: [0, -1], left: [-1, 0], right: [1, 0] }[v.look]; const d = b.f.dir(L[0], L[1]); yaw = Math.atan2(-d[0], -d[1]) + (v.yaw || 0); }
      g.player.setPose(x, y + 0.05, z, yaw, v.pitch || 0);
      return r.name;
    }
    const e = b.entrances.find((q) => q.main) || b.entrances[0];
    const [x, y, z] = e.pos; const d = ctx.nav.pos(e.door);
    const yaw = Math.atan2(-(d[0] - x), -(d[2] - z));
    const k = v.back ?? 1.5;
    g.player.setPose(x - (d[0] - x) * k + (v.dx || 0), y + 0.05 + (v.dy || 0), z - (d[2] - z) * k + (v.dz || 0), yaw + (v.yaw || 0), v.pitch || 0);
    return 'goto ' + b.name;
  }, v);
  await page.waitForTimeout(v.wait || 2500);
  const out = path.join(outDir, v.name + '.png');
  try { await page.screenshot({ path: out, timeout: 420000 }); console.log('shot', v.name, ok, Math.round((Date.now() - t0) / 1000) + 's'); } catch (e) { console.log('shot failed', v.name, e.message); }
}
await browser.close(); server.close();
