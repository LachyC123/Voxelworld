// Builds the whole town into a fresh context: streets, every lot, sites, people, events.
import { createContext } from './context.js';
import { buildStreets, linkToSidewalk } from './streets.js';
import { PLAN, streetAt, GRID } from './layout.js';
import { GEN, SITES } from './gen/index.js';
import { populate } from '../sim/population.js';
import { setupEvents } from '../sim/events.js';
import { setupLife } from '../sim/life/index.js';
import { secretsWorld } from '../secrets/index.js';

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
  for (const s of sites.filter((q) => (q.order ?? 50) < 50)) { onStatus(`Building ${s.name}…`, 0.05); await tick(); try { s.build(ctx); } catch (e) { console.error('Site failed:', s.name, e); } }
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
        b.rect = l.m; b.spec = l.spec; // (b.m stays the building's local→world method)
        ctx.landmarks.push({ name: b.name, kind: l.spec.kind, x: (l.m.x0 + l.m.x1) / 2, z: (l.m.z0 + l.m.z1) / 2, rect: l.m, building: b });
      }
    } catch (e) {
      console.error('Generator failed for', l.spec.kind, l.spec.name, e);
      try { GEN.__fallback(ctx, lot, { ...l.spec, kind: l.spec.kind === 'house' ? 'shop' : l.spec.kind }); } catch (e2) { console.error('fallback failed too', e2); }
    }
    if (++i % 6 === 0) { onStatus(`Raising ${l.spec.name || 'houses on ' + street}…`, 0.05 + 0.4 * i / total); await tick(); }
  }
  for (const s of sites.filter((q) => (q.order ?? 50) >= 50)) { onStatus(`Building ${s.name}…`, 0.46); await tick(); try { s.build(ctx); } catch (e) { console.error('Site failed:', s.name, e); } }
  // the town's secrets: hidden rooms, documents and clue places (before the world is sealed)
  onStatus('Hiding a few things…', 0.47); await tick();
  try { secretsWorld(ctx); } catch (e) { console.error('secrets failed', e); }
  // connect every spot to its room / building graph
  for (const s of ctx.spots.list) {
    if (!s.pendingLink) continue;
    const n = ctx.nav.nearest(s.x, s.y, s.z, (id, inf) => id !== s.node && inf.kind !== 'spot' && (s.room ? inf.room === s.room : !inf.room), 30);
    if (n >= 0) ctx.nav.link(s.node, n);
    else linkToSidewalk(ctx, s.node, 40);
  }
  clearDoorways(ctx);
  onStatus('Waking the townsfolk…', 0.48); await tick();
  ctx.world.finalize();
  populate(ctx);
  setupEvents(ctx);
  onStatus('Sending everybody about their business…', 0.49); await tick();
  setupLife(ctx);
  return ctx;
}

// Keep street furniture (lamps, trees, hydrants, meters…) out of the path in front of every entrance.
const STREET_CLUTTER = /^(street_lamp|tree_|fire_hydrant|trash_basket|parking_meter|mailbox_usps|newspaper_box|fire_alarm_box|street_sign:|bench_bus|bus_stop_sign)/;
function clearDoorways(ctx) {
  const P = ctx.props, nav = ctx.nav;
  const doors = [];
  for (const b of ctx.buildings) for (const e of b.entrances) {
    if (e.door === undefined || e.node === undefined) continue;
    const [dx, , dz] = nav.pos(e.door), [ox, , oz] = nav.pos(e.node);
    const L = Math.hypot(ox - dx, oz - dz) || 1;
    doors.push([dx, dz, (ox - dx) / L, (oz - dz) / L]);
  }
  let removed = 0;
  for (let i = 0; i < P.n; i++) {
    const t = P.types[P.tType[i]];
    if (!t || !STREET_CLUTTER.test(t.name)) continue;
    const x = P.tPos[i * 3], z = P.tPos[i * 3 + 2];
    for (const [dx, dz, ux, uz] of doors) {
      const rx = x - dx, rz = z - dz;
      const along = rx * ux + rz * uz, across = Math.abs(rx * uz - rz * ux);
      if (along > -0.5 && along < 7 && across < 1.4) { P.remove(i); removed++; break; }
    }
  }
  if (removed) console.log(`cleared ${removed} street props from doorways`);
}
