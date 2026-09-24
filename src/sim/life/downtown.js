// Street life downtown and on the waterfront. See docs/LIFE.md.
import { tm } from '../../core/util.js';

export function run(L) {
  windowShoppers(L);
}

// Saturday on Main Street: people drifting from window to window.
function windowShoppers(L) {
  const shops = L.places.shops.filter((P) => P.windows && P.kind === 'shop');
  if (shops.length < 4) return;
  const spots = new Map();
  const winSpot = (P, k) => {
    const key = P.name + k;
    if (!spots.has(key)) { const w = P.windows[k]; spots.set(key, L.spot(w.x, w.z, { yaw: w.yaw, act: 'browse', label: `Looking in the window at ${P.name}` })); }
    return spots.get(key);
  };
  for (let i = 0; i < 40; i++) {
    const t0 = tm('9:40') + ((i * 37) % 420), t1 = t0 + 35 + (i % 4) * 10;
    const [p] = L.recruit(1, t0, t1, (q) => q.age >= 14);
    if (!p) continue;
    // a short run of neighbouring shops
    const start = L.rng.int(0, shops.length - 1);
    const near = shops.slice().sort((a, b) => Math.hypot(a.door.x - shops[start].door.x, a.door.z - shops[start].door.z) - Math.hypot(b.door.x - shops[start].door.x, b.door.z - shops[start].door.z)).slice(0, 5);
    const stops = near.map((P, k) => { const s = winSpot(P, (i + k) % 2); s.dwell = 3 + L.rng.int(0, 5); return s; });
    L.rounds(p, t0, stops, { act: 'browse', label: 'Window shopping', held: p.sex === 'F' && L.rng.chance(0.6) ? 'handbag' : null });
  }
  L.scene('Window shoppers', 180, -40, '9:40', '17:30', 40);
}
