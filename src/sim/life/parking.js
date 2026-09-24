// Parked cars along the curbs. Runs after every other street-life module so it can leave room
// for their delivery trucks and scenes. Downtown is packed for Harbor Days; the side streets
// have a car in front of every few houses. Right-hand traffic: cars face the way their lane runs.
import { roadSegments, intersections } from '../../city/streets.js';

const PALETTE = ['#2a3a5a', '#6a2a2a', '#2a4a3a', '#d8d0b8', '#1c1c1e', '#6a8aa0', '#8a7a5a', '#a0a8a0', '#3a5a7a', '#7a3a4a', '#c8b890', '#2a5a5a', '#e0dcd0', '#4a4a52'];
const KINDS = [['car_sedan', 10], ['car_coupe', 4], ['car_wagon', 3], ['car_convertible', 1], ['truck_pickup', 2]];

export function run(L) {
  const ctx = L.ctx, P = ctx.props, rng = L.rng;
  const ints = intersections();
  // things already in the parking lanes: timed trucks and cars from scenes, static props in the road
  const blockers = [];
  for (const q of L.life.timed) blockers.push([q.h.x, q.h.z]);
  for (let i = 0; i < P.n; i++) {
    if (P.tCat[i] === 250) continue;
    const n = P.types[P.tType[i]].name;
    if (/^(fire_hydrant|bus_stop|trolley_stop|mailbox_usps|fire_alarm_box|phone_booth)/.test(n) || P.tPos[i * 3 + 1] < 0.2) blockers.push([P.tPos[i * 3], P.tPos[i * 3 + 2]]);
  }
  const blocked = (x, z, r) => blockers.some(([bx, bz]) => Math.abs(bx - x) < r && Math.abs(bz - z) < r);
  const nearInt = (x, z) => ints.some((it) => Math.abs(it.x - x) < 17 && Math.abs(it.z - z) < 17);
  const density = (x, z) => {
    if (x > 384 || x < 44) return 0;
    if (x > 120 && x < 300 && z > -80 && z < 10) return 0.9;   // round the square
    if (x > 100 && x < 320 && z > -230 && z < 70) return 0.72; // downtown
    return 0.28;                                               // neighbourhoods
  };
  let n = 0;
  const kind = () => { const t = KINDS.reduce((a, k) => a + k[1], 0); let r = rng.next() * t; for (const [k, w] of KINDS) { if ((r -= w) <= 0) return k; } return 'car_sedan'; };
  for (const s of roadSegments()) {
    const ave = s.kind === 'ave';
    const a0 = ave ? s.z0 : s.x0, a1 = ave ? s.z1 : s.x1;
    for (const side of [-1, 1]) {
      const off = s.c + side * 4.7;
      // heading: avenues' west curb runs south (+z), east curb north; streets' north curb runs west, south curb east
      const yaw = ave ? (side < 0 ? 0 : Math.PI) : (side < 0 ? -Math.PI / 2 : Math.PI / 2);
      for (let t = a0 + 3.5; t < a1 - 3; t += 6.3) {
        const x = ave ? off : t, z = ave ? t : off;
        if (nearInt(x, z) || blocked(x, z, 3.6)) continue;
        if (rng.next() > density(x, z)) continue;
        const k = kind();
        P.add(k, x + (rng.next() - 0.5) * 0.3, 0.02, z + (rng.next() - 0.5) * 0.6, yaw + (rng.next() - 0.5) * 0.04, { tint: rng.pick(PALETTE), tint2: rng.pick(['#e8e4d8', '#1c1c1e', '#c8c0a8']), cat: 'far' });
        n++;
      }
    }
  }
  L.scene('Parked cars', 214, 0, '0:00', '23:59', n);
}
