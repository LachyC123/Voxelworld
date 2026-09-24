// Street life in the neighbourhoods: yards, porches, driveways and front walks. See docs/LIFE.md.
import { tm } from '../../core/util.js';
import { VS } from '../../core/config.js';
import { MAT } from '../../world/materials.js';

export function run(L) {
  const R = new Hood(L);
  carWash(L);
  return R;
}

// ================================================================ the neighbourhood survey
// Everything a scene needs to know about a home: its entrance frame, where the house walls, porch
// and front walk are, what is already standing in the yard, who lives there and what street it's on.
const LAWN = new Set(['grass_lawn', 'leaf_litter', 'dirt', 'mulch', 'grass', 'grass_dark', 'flowerbed_red', 'flowerbed_yellow', 'flowerbed_purple'].map((n) => MAT[n]).filter((v) => v !== undefined));
const PAVED = new Set(['sidewalk', 'sidewalk_brick', 'plaza_cream', 'concrete', 'gravel', 'asphalt_old', 'asphalt', 'stone_foundation'].map((n) => MAT[n]).filter((v) => v !== undefined));

export class Hood {
  constructor(L) {
    this.L = L; this.ctx = L.ctx; this.rng = L.rng;
    this.world = L.ctx.world;
    this.claims = [];
    this._propIndex();
    this.homes = L.places.homes.map((P) => this.survey(P)).filter(Boolean);
    this.byName = new Map(this.homes.map((H) => [H.P.name, H]));
  }

  // ---------------------------------------------------------------- voxels
  mat(x, y, z) { return this.world.matAt(Math.floor(x / VS), Math.floor(y / VS), Math.floor(z / VS)); }
  solid(x, y, z) { const m = this.mat(x, y, z); return m && !(this.world.matFlags[m] & 4); }
  // is the column from y0 to y1 above (x, z) free of voxels?
  airCol(x, z, y0, y1) { for (let y = y0; y <= y1; y += VS) if (this.solid(x, y, z)) return false; return true; }
  groundMat(x, z, y) { return this.mat(x, y - 0.1, z); }

  // ---------------------------------------------------------------- props already standing
  _propIndex() {
    const P = this.ctx.props, cells = new Map();
    this.cells = cells;
    for (let i = 0; i < P.n; i++) {
      if (P.tCat[i] === 250) continue;
      const t = P.types[P.tType[i]]; if (!t) continue;
      const name = t.name, d = t.def, s = (d.scale || 1 / 16) * P.tScale[i];
      const x = P.tPos[i * 3], y = P.tPos[i * 3 + 1], z = P.tPos[i * 3 + 2];
      if (y > 3 && !/^tv_antenna/.test(name)) continue; // roof & indoor-upstairs clutter doesn't matter on the ground
      const o = d.origin || [d.size[0] / 2, 0, d.size[2] / 2];
      let hx = d.size[0] * s / 2, hz = d.size[2] * s / 2, cx = (d.size[0] / 2 - o[0]) * s, cz = (d.size[2] / 2 - o[2]) * s;
      if (/^tree_|^pine_/.test(name)) { hx = hz = 0.45; cx = cz = 0; }
      const rec = { i, name, x, y, z, yaw: P.tYaw[i], hx, hz, cx, cz };
      const k = Math.floor(x / 8) + ',' + Math.floor(z / 8);
      let a = cells.get(k); if (!a) cells.set(k, (a = [])); a.push(rec);
    }
  }
  propsNear(x, z, r) {
    const out = [], k0 = Math.floor((x - r - 4) / 8), k1 = Math.floor((x + r + 4) / 8), j0 = Math.floor((z - r - 4) / 8), j1 = Math.floor((z + r + 4) / 8);
    for (let a = k0; a <= k1; a++) for (let b = j0; b <= j1; b++) {
      const c = this.cells.get(a + ',' + b); if (!c) continue;
      for (const q of c) if (this.propDist(q, x, z) < r) out.push(q);
    }
    return out;
  }
  // distance from (x, z) to a prop's footprint box (0 inside)
  propDist(q, x, z) {
    const c = Math.cos(q.yaw), s = Math.sin(q.yaw);
    const dx = x - q.x, dz = z - q.z;
    // world -> model: model x' = c*dx - s*dz ; z' = s*dx + c*dz  (inverse of x = c*lx + s*lz, z = -s*lx + c*lz)
    const lx = c * dx - s * dz - q.cx, lz = s * dx + c * dz - q.cz;
    const ex = Math.max(0, Math.abs(lx) - q.hx), ez = Math.max(0, Math.abs(lz) - q.hz);
    return Math.hypot(ex, ez);
  }

  // ---------------------------------------------------------------- claims (my own scenes)
  claim(x, z, r, t0, t1, tag = '') { this.claims.push({ x, z, r, t0: tm(t0), t1: tm(t1), tag }); }
  claimed(x, z, r, t0, t1) {
    t0 = tm(t0); t1 = tm(t1);
    for (const c of this.claims) if (c.t0 < t1 && c.t1 > t0 && Math.hypot(c.x - x, c.z - z) < c.r + r) return c;
    return null;
  }

  // Can a person stand / a prop sit at (x, z) on open ground?  o: { r, y (expected ground), tol, props:false, paved:true, lawn:true, t0, t1 }
  open(x, z, o = {}) {
    const r = o.r ?? 0.45;
    const g = this.L.ground(x, z, o.yTop ?? 3);
    if (o.y !== undefined && Math.abs(g - o.y) > (o.tol ?? 0.12)) return false;
    const m = this.groundMat(x, z, g);
    const lawn = LAWN.has(m), paved = PAVED.has(m);
    if (!(o.lawn !== false && lawn) && !(o.paved !== false && paved) && !o.anyGround) return false;
    for (const [dx, dz] of [[0, 0], [r, 0], [-r, 0], [0, r], [0, -r]]) if (!this.airCol(x + dx, z + dz, g + 0.1, g + (o.h ?? 1.9))) return false;
    if (o.props !== false && this.propsNear(x, z, r).length) return false;
    if (o.t0 !== undefined && this.claimed(x, z, r, o.t0, o.t1)) return false;
    return g;
  }

  // ---------------------------------------------------------------- the home survey
  survey(P) {
    if (!P.door || !P.rect) return null;
    const L = this.L;
    const H = { P, name: P.name, members: P.members || [], kind: P.kind };
    const [ux, uz] = P.u, [rx, rz] = P.r;
    const o0 = P.at(0, 0);
    H.side = (x, z) => (x - o0.x) * rx + (z - o0.z) * rz;
    H.out = (x, z) => (x - o0.x) * ux + (z - o0.z) * uz;
    H.at = (s, o) => P.at(s, o);
    const r = P.rect;
    const s0 = H.side(r.x0, r.z0), s1 = H.side(r.x1, r.z1);
    H.lotL = Math.min(s0, s1); H.lotR = Math.max(s0, s1);
    const d0 = H.out(r.x0, r.z0), d1 = H.out(r.x1, r.z1);
    H.lotBack = Math.min(d0, d1);
    H.frontage = H.lotR - H.lotL; H.depth = -H.lotBack;
    H.row = P.kind !== 'apartment' && H.frontage < 11;
    H.apt = P.kind === 'apartment';
    H.detached = !H.row && !H.apt;
    H.street = (P.building.address || '').replace(/^\d+\s*/, '') || (P.building.lot && P.building.lot.street) || '';
    H.number = parseInt(P.building.address, 10) || 0;
    const gy = [P.walk, P.at(-1.5, 1), P.at(1.5, 1), P.at(0, 3)].map((q) => L.ground(q.x, q.z)).sort((a, b) => a - b);
    H.lawnY = gy[2] ?? 0.25; // sidewalk level (lawns are flush with it)
    H.doorOut = H.out(P.door.x, P.door.z);
    H.doorY = P.door.y;
    // the facade: the wall plane is where the door is; scan sideways just inside it for its ends
    const yScan = H.lawnY + 1.55;
    const wallAt = (s) => { const p = H.at(s, H.doorOut - 0.15); return this.solid(p.x, yScan, p.z) || this.solid(p.x, yScan + 0.6, p.z); };
    let L0 = -0.6, R0 = 0.6;
    for (let s = 0.9; s < 25; s += 0.25) { if (H.at(s, 0) && s > H.lotR + 0.2) break; if (wallAt(s)) R0 = s; else if (s > 1.4) break; }
    for (let s = -0.9; s > -25; s -= 0.25) { if (s < H.lotL - 0.2) break; if (wallAt(s)) L0 = s; else if (s < -1.4) break; }
    H.faceL = L0; H.faceR = R0;
    // house depth: follow the side wall back from the facade (windows are glass, so solid; allow a door-sized gap)
    let back = H.doorOut - 4, last = H.doorOut;
    for (let d = H.doorOut - 0.25; d > H.lotBack + 0.5; d -= 0.25) {
      const hit = [-0.15, -0.05, 0.08].some((e) => { const p = H.at(H.faceR + e, d); return this.solid(p.x, yScan, p.z) || this.solid(p.x, yScan + 0.7, p.z); });
      if (hit) last = d; else if (d < last - 1.6) break;
    }
    back = Math.min(back, last);
    H.backOut = back;
    // porch / stoop: how far the raised floor runs out from the door, and how wide
    let porchOut = H.doorOut;
    for (let d = H.doorOut + 0.3; d < 0; d += 0.25) { const p = H.at(0, d); const g = L.ground(p.x, p.z, H.doorY + 0.4); if (g > H.lawnY + 0.12 && g > H.doorY - 0.3) porchOut = d; else break; }
    H.porchOut = porchOut;              // outer edge of the porch floor (just before the steps)
    H.porchY = H.doorY;
    let pL = 0, pR = 0;
    if (porchOut > H.doorOut + 0.6) {
      const d = H.doorOut + 0.7;
      for (let s = 0.25; s < 12; s += 0.25) { const p = H.at(s, d); if (Math.abs(L.ground(p.x, p.z, H.doorY + 0.4) - H.doorY) < 0.15) pR = s; else break; }
      for (let s = -0.25; s > -12; s -= 0.25) { const p = H.at(s, d); if (Math.abs(L.ground(p.x, p.z, H.doorY + 0.4) - H.doorY) < 0.15) pL = s; else break; }
    }
    H.porchL = pL; H.porchR = pR;
    H.hasPorch = porchOut > H.doorOut + 1.2 && pR - pL > 2.5;
    // steps: from the porch edge to where the front walk starts
    let stepEnd = porchOut;
    for (let d = porchOut + 0.25; d < 0; d += 0.25) { const p = H.at(0, d); if (L.ground(p.x, p.z, H.doorY + 0.4) > H.lawnY + 0.08) stepEnd = d; else break; }
    H.stepEnd = stepEnd;
    // anything else of interest in the lot
    H.props = this.propsNear((r.x0 + r.x1) / 2, (r.z0 + r.z1) / 2, Math.hypot(r.x1 - r.x0, r.z1 - r.z0) / 2).filter((q) => q.x >= r.x0 - 0.5 && q.x <= r.x1 + 0.5 && q.z >= r.z0 - 0.5 && q.z <= r.z1 + 0.5);
    H.antenna = H.props.find((q) => q.name === 'tv_antenna') || null;
    H.leafPiles = H.props.filter((q) => q.name === 'leaf_pile' && H.out(q.x, q.z) > H.doorOut);
    H.cars = H.props.filter((q) => /^car_|^truck_pickup/.test(q.name));
    H.frontTree = H.props.find((q) => /^tree_/.test(q.name) && H.out(q.x, q.z) > H.doorOut) || null;
    // driveway side (paved strip running back from the property line beside the house)
    H.drive = null;
    for (const side of [H.lotL + 1.4, H.lotR - 1.4]) {
      const p = H.at(side, -2.5), q = H.at(side, H.doorOut - 1);
      if (PAVED.has(this.groundMat(p.x, p.z, H.lawnY + 0.02)) && PAVED.has(this.groundMat(q.x, q.z, H.lawnY + 0.02)) && (side < H.faceL || side > H.faceR)) H.drive = side;
    }
    return H;
  }
}

// Saturday morning: the family car at the curb, a bucket, a hose, a man in shirtsleeves.
function carWash(L) {
  const houses = L.places.houses.filter((P) => P.members.some((p) => p.age >= 25 && p.age < 65));
  const picks = L.rng.shuffle(houses.slice()).slice(0, 8);
  picks.forEach((P, i) => {
    const t0 = tm('9:30') + i * 17, t1 = t0 + 70;
    const who = P.members.filter((p) => p.age >= 25 && p.age < 65 && L.idle(p, t0, t1)).sort((a, b) => (a.sex === 'M' ? 0 : 1) - (b.sex === 'M' ? 0 : 1))[0];
    if (!who) return;
    const car = L.rng.pick(['car_sedan', 'car_coupe', 'car_wagon', 'car_convertible']);
    const tint = L.rng.pick(['#2a4a7a', '#7a2a2a', '#2a5a3a', '#d8d0b8', '#1a1a1a', '#6a8aa0']);
    L.timed(car, P.curb.x, P.curb.z, P.curb.yaw, t0 - 30, t1 + 60, { tint, y: 0.02 });
    // stand beside the car on the sidewalk side, sponge going
    const at = P.at(1.2, 3.9);
    const s = L.spot(at.x, at.z, { faceTo: [P.curb.x, P.curb.z], act: 'wash' });
    L.block(who, t0, t1, s, 'wash', { label: `Washing the ${car === 'car_wagon' ? 'station wagon' : 'car'}`, lines: ['Nothing like a clean car for the parade.', 'Hand me that chamois, would you?', 'Birds. Every blessed Saturday, birds.'] });
    const b = P.at(2.2, 3.6);
    L.timed('bucket_suds', b.x, b.z, 0, t0, t1);
    L.sound(at.x, 1, at.z, t0, t1, 'hose', { range: 25, vol: 0.4 });
    L.label(P.curb.x, 0.9, P.curb.z, t0, t1, `The ${who.last}s' car, half soaped`, 2.2);
    L.scene('Car wash', P.curb.x, P.curb.z, t0, t1, 1);
  });
}
