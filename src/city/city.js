// Builds the whole town into a fresh context: streets, every lot, sites, people, events.
import { createContext } from './context.js';
import { buildStreets, linkToSidewalk } from './streets.js';
import { PLAN, streetAt, GRID } from './layout.js';
import { GEN, SITES } from './gen/index.js';
import { populate } from '../sim/population.js';
import { setupEvents } from '../sim/events.js';

const V = (m) => Math.round(m * 4);

function addressFor(l, street) {
  const along = (l.facing === 'N' || l.facing === 'S') ? (l.m.x0 + l.m.x1) / 2 - GRID.x0 : (l.m.z0 + l.m.z1) / 2 - GRID.z0;
  const odd = l.facing === 'S' || l.facing === 'W' ? 1 : 0;
  const n = Math.max(1, Math.round(along / 3)) * 2 + odd;
  return { number: n, address: `${n} ${street}` };
}

export async function buildCity(onStatus = () => {}) {
  const ctx = createContext();
  const tick = () => new Promise((r) => setTimeout(r, 0));
  onStatus('Surveying the streets…', 0.02); await tick();
  ctx.streets = buildStreets(ctx);
  const sites = SITES.slice().sort((a, b) => (a.order ?? 50) - (b.order ?? 50));
  for (const s of sites.filter((q) => (q.order ?? 50) < 50)) { onStatus(`Building ${s.name}…`, 0.05); await tick(); s.build(ctx); }
  const total = PLAN.length;
  let i = 0;
  for (const l of PLAN) {
    const street = streetAt(l.facing, l.m);
    const addr = addressFor(l, street);
    const lot = {
      x: V(l.m.x0), z: V(l.m.z0), facing: l.facing, y: 1,
      w: (l.facing === 'N' || l.facing === 'S') ? V(l.m.x1 - l.m.x0) : V(l.m.z1 - l.m.z0),
      d: (l.facing === 'N' || l.facing === 'S') ? V(l.m.z1 - l.m.z0) : V(l.m.x1 - l.m.x0),
      m: l.m, street, number: addr.number, address: l.spec.address || addr.address,
    };
    const gen = GEN[l.spec.kind] || GEN.__fallback;
    try {
      const b = gen(ctx, lot, l.spec);
      if (b) {
        b.m = l.m; b.spec = l.spec;
        ctx.landmarks.push({ name: b.name, kind: l.spec.kind, x: (l.m.x0 + l.m.x1) / 2, z: (l.m.z0 + l.m.z1) / 2, rect: l.m, building: b });
      }
    } catch (e) {
      console.error('Generator failed for', l.spec.kind, l.spec.name, e);
      try { GEN.__fallback(ctx, lot, { ...l.spec, kind: l.spec.kind === 'house' ? 'shop' : l.spec.kind }); } catch (e2) { console.error('fallback failed too', e2); }
    }
    if (++i % 6 === 0) { onStatus(`Raising ${l.spec.name || 'houses on ' + street}…`, 0.05 + 0.4 * i / total); await tick(); }
  }
  for (const s of sites.filter((q) => (q.order ?? 50) >= 50)) { onStatus(`Building ${s.name}…`, 0.46); await tick(); s.build(ctx); }
  // connect every spot to its room / building graph
  for (const s of ctx.spots.list) {
    if (!s.pendingLink) continue;
    const n = ctx.nav.nearest(s.x, s.y, s.z, (id, inf) => id !== s.node && inf.kind !== 'spot' && (s.room ? inf.room === s.room : true), 30);
    if (n >= 0) ctx.nav.link(s.node, n);
    else linkToSidewalk(ctx, s.node, 40);
  }
  onStatus('Waking the townsfolk…', 0.48); await tick();
  ctx.world.finalize();
  populate(ctx);
  setupEvents(ctx);
  return ctx;
}
